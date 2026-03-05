/**
 * @file 锚点式分割时间轴组件
 * @description 用户在时间轴上放置倒三角锚点来精确分割视频，
 * 每段可独立保留或丢弃，拖动锚点时实时 seek 视频以辅助定位。
 *
 * 数据模型：
 * - anchors: N 个锚点将视频分成 N+1 段
 * - segmentIncluded: 长度 N+1，表示每段是否保留
 *
 * 交互逻辑：
 * - 点击时间轴空白处 → 添加锚点
 * - 点击已有锚点（8px 阈值）→ 删除锚点
 * - 拖动锚点 → 调整分割位置，RAF 节流 seek 预览帧
 * - 点击片段色块或片段列表行 → 切换保留/跳过
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { formatTimecode, parseTimecode } from '@/lib/format';
import { useT } from '@/i18n';

// ─── 类型定义 ─────────────────────────────────────────────────────────────

/** 时间轴锚点，代表一个精确分割点 */
export interface Anchor {
  /** 唯一 ID，使用 Date.now().toString() */
  id: string;
  /** 分割时间（秒，精确到毫秒） */
  time: number;
}

/** SplitTimeline 组件 Props */
interface SplitTimelineProps {
  /** 视频总时长（秒） */
  duration: number;
  /** 当前锚点列表 */
  anchors: Anchor[];
  /** 每段的保留状态（长度 = anchors.length + 1） */
  segmentIncluded: boolean[];
  /** 锚点变化回调 */
  onAnchorsChange: (anchors: Anchor[]) => void;
  /** 片段保留状态变化回调 */
  onSegmentIncludedChange: (included: boolean[]) => void;
  /** 拖动锚点时 seek 视频（可选，由父组件注入） */
  onSeek?: (time: number) => void;
  /** 自定义 CSS class */
  className?: string;
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────

/**
 * 从锚点推导出完整片段列表（按时间排序）
 *
 * @param anchors - 当前锚点列表
 * @param duration - 视频总时长（秒）
 * @returns 各片段的 start/end 数组
 */
function deriveSegments(
  anchors: Anchor[],
  duration: number,
): Array<{ start: number; end: number }> {
  const sorted = [...anchors].sort((a, b) => a.time - b.time);
  const points = [0, ...sorted.map((a) => a.time), duration];
  return points.slice(0, -1).map((start, i) => ({
    start,
    end: points[i + 1],
  }));
}

/**
 * 生成时间刻度标记，根据视频时长自动选择合适的间隔
 *
 * @param duration - 视频总时长（秒）
 * @returns 需要显示刻度的时间点数组
 */
function generateTicks(duration: number): number[] {
  if (duration <= 0) return [];

  let interval: number;
  if (duration <= 10) interval = 1;
  else if (duration <= 30) interval = 5;
  else if (duration <= 120) interval = 10;
  else if (duration <= 300) interval = 30;
  else if (duration <= 600) interval = 60;
  else if (duration <= 1800) interval = 120;
  else if (duration <= 3600) interval = 300;
  else interval = 600;

  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += interval) {
    ticks.push(t);
  }
  return ticks;
}

// ─── 组件实现 ─────────────────────────────────────────────────────────────

/**
 * 锚点式分割时间轴组件
 *
 * 通过锚点将视频分成多段，每段可独立选择保留或跳过。
 * 拖动锚点时通过 onSeek 回调实时预览对应帧。
 *
 * @param props - 组件属性
 */
export function SplitTimeline({
  duration,
  anchors,
  segmentIncluded,
  onAnchorsChange,
  onSegmentIncludedChange,
  onSeek,
  className,
}: SplitTimelineProps) {
  const t = useT();

  /** 时间轴主轨道 DOM ref，用于计算鼠标位置对应的时间 */
  const trackRef = useRef<HTMLDivElement | null>(null);

  /** 当前正在拖动的锚点 ID，null 表示未拖动 */
  const [draggingId, setDraggingId] = useState<string | null>(null);

  /** 鼠标悬停时对应的时间（秒），用于显示 ghost 预览线 */
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  /** RAF 节流句柄，避免 seek 过于频繁 */
  const rafRef = useRef<number | null>(null);

  // ── 坐标 ↔ 时间转换 ──────────────────────────────────────────────────

  /**
   * 将 clientX 像素坐标转换为视频时间（秒）
   *
   * @param clientX - 鼠标/触摸点的 clientX 坐标
   * @returns 对应的视频时间（秒），已 clamp 到 [0, duration]
   */
  const xToTime = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return 0;
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(duration, ratio * duration));
    },
    [duration],
  );

  /**
   * 将时间（秒）转换为百分比位置（用于 CSS left/width）
   *
   * @param time - 视频时间（秒）
   * @returns 百分比字符串，如 "42.5"
   */
  const toPercent = useCallback(
    (time: number): number => {
      if (duration <= 0) return 0;
      return (time / duration) * 100;
    },
    [duration],
  );

  // ── 锚点操作 ─────────────────────────────────────────────────────────

  /**
   * 添加锚点，同时同步 segmentIncluded（把被分割的那段一分为二）
   *
   * @param time - 锚点时间（秒）
   */
  const addAnchor = useCallback(
    (time: number) => {
      const segments = deriveSegments(anchors, duration);
      // 找到新锚点落在哪个 segment index
      const segIdx = segments.findIndex((s) => time >= s.start && time <= s.end);
      const inheritedIncluded = segmentIncluded[segIdx] ?? true;

      const newAnchor: Anchor = { id: String(Date.now()), time };
      const newAnchors = [...anchors, newAnchor].sort((a, b) => a.time - b.time);

      // 把 segIdx 位置的 included 一分为二（两个新段继承原状态）
      const newIncluded = [...segmentIncluded];
      newIncluded.splice(segIdx, 1, inheritedIncluded, inheritedIncluded);

      onAnchorsChange(newAnchors);
      onSegmentIncludedChange(newIncluded);
    },
    [anchors, duration, segmentIncluded, onAnchorsChange, onSegmentIncludedChange],
  );

  /**
   * 删除锚点，同时合并相邻两段（任一为 true 则新段为 true）
   *
   * @param anchorId - 要删除的锚点 ID
   */
  const removeAnchor = useCallback(
    (anchorId: string) => {
      const sorted = [...anchors].sort((a, b) => a.time - b.time);
      const anchorIdx = sorted.findIndex((a) => a.id === anchorId);

      // 合并 anchorIdx 和 anchorIdx+1 两段，任一为 true 则保留
      const mergedIncluded =
        (segmentIncluded[anchorIdx] ?? true) || (segmentIncluded[anchorIdx + 1] ?? true);
      const newIncluded = [...segmentIncluded];
      newIncluded.splice(anchorIdx, 2, mergedIncluded);

      onAnchorsChange(anchors.filter((a) => a.id !== anchorId));
      onSegmentIncludedChange(newIncluded);
    },
    [anchors, segmentIncluded, onAnchorsChange, onSegmentIncludedChange],
  );

  /**
   * 切换指定片段的保留/跳过状态
   *
   * @param segIdx - 片段索引
   */
  const toggleSegment = useCallback(
    (segIdx: number) => {
      const newIncluded = [...segmentIncluded];
      newIncluded[segIdx] = !newIncluded[segIdx];
      onSegmentIncludedChange(newIncluded);
    },
    [segmentIncluded, onSegmentIncludedChange],
  );

  // ── 鼠标交互 ─────────────────────────────────────────────────────────

  /**
   * 点击时间轴主轨道：
   * - 若点击位置距已有锚点 < 8px（像素阈值换算为时间比例）→ 删除
   * - 否则 → 添加新锚点并 seek
   */
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingId) return; // 拖动中不触发 click
      const time = xToTime(e.clientX);

      // 8px 阈值换算为时间
      const trackWidth = trackRef.current?.getBoundingClientRect().width ?? 0;
      const threshold = trackWidth > 0 ? duration * (8 / trackWidth) : 0;
      const nearby = anchors.find((a) => Math.abs(a.time - time) < threshold);

      if (nearby) {
        removeAnchor(nearby.id);
        return;
      }

      addAnchor(time);
      onSeek?.(time);
    },
    [draggingId, xToTime, duration, anchors, removeAnchor, addAnchor, onSeek],
  );

  /**
   * 鼠标在轨道上移动：更新悬停时间，显示 ghost 预览线
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingId) return;
      setHoverTime(xToTime(e.clientX));
    },
    [draggingId, xToTime],
  );

  /**
   * 开始拖动锚点：记录被拖动的锚点 ID
   *
   * @param anchorId - 被拖动锚点的 ID
   * @param e - mousedown 事件
   */
  const startDrag = useCallback((anchorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止冒泡，避免触发 track click
    setDraggingId(anchorId);
  }, []);

  // ── 拖动 mousemove / mouseup（绑定到 window）───────────────────────

  useEffect(() => {
    if (!draggingId) return;

    const onMove = (e: MouseEvent) => {
      const time = xToTime(e.clientX);

      // 获取排序后的锚点，限制拖动范围不超出相邻锚点
      const sorted = [...anchors].sort((a, b) => a.time - b.time);
      const idx = sorted.findIndex((a) => a.id === draggingId);
      const minTime = idx > 0 ? sorted[idx - 1].time + 0.1 : 0.1;
      const maxTime = idx < sorted.length - 1 ? sorted[idx + 1].time - 0.1 : duration - 0.1;
      const clamped = Math.max(minTime, Math.min(maxTime, time));

      onAnchorsChange(anchors.map((a) => (a.id === draggingId ? { ...a, time: clamped } : a)));

      // RAF 节流：避免 seek 调用过于密集
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onSeek?.(clamped);
        rafRef.current = null;
      });
    };

    const onUp = () => setDraggingId(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draggingId, anchors, duration, xToTime, onAnchorsChange, onSeek]);

  // ── 渲染 ─────────────────────────────────────────────────────────────

  const segments = deriveSegments(anchors, duration);
  const ticks = generateTicks(duration);
  const sortedAnchors = [...anchors].sort((a, b) => a.time - b.time);

  /** 时间轴高度（轨道主体） */
  const TRACK_HEIGHT = 44;

  return (
    <div className={className}>
      {/* ── 时间轴主轨道 ─────────────────────────────────── */}
      <div
        ref={trackRef}
        style={{
          position: 'relative',
          height: `${TRACK_HEIGHT + 12}px`, // 多出 12px 给锚点三角
          cursor: duration > 0 ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onClick={handleTrackClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTime(null)}
      >
        {/* 背景轨道 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${TRACK_HEIGHT}px`,
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-tertiary)',
            overflow: 'hidden',
          }}
        >
          {/* 各片段色块 */}
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                height: `${TRACK_HEIGHT}px`,
                left: `${toPercent(seg.start)}%`,
                width: `${toPercent(seg.end - seg.start)}%`,
                backgroundColor: segmentIncluded[i]
                  ? 'rgba(108,92,231,0.25)' // 保留段：紫色
                  : 'rgba(0,0,0,0.18)', // 跳过段：灰暗
                borderTop: segmentIncluded[i] ? '2px solid var(--color-accent)' : 'none',
                borderBottom: segmentIncluded[i] ? '2px solid var(--color-accent)' : 'none',
                boxSizing: 'border-box',
                cursor: 'default',
                transition: 'background-color 0.15s',
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleSegment(i);
              }}
            />
          ))}

          {/* 悬停 ghost 预览线 */}
          {hoverTime !== null && !draggingId && duration > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                width: '2px',
                height: `${TRACK_HEIGHT}px`,
                left: `${toPercent(hoverTime)}%`,
                backgroundColor: 'rgba(108,92,231,0.4)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* 锚点三角（在轨道底部伸出） */}
        {sortedAnchors.map((anchor) => (
          <div
            key={anchor.id}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${toPercent(anchor.time)}%`,
              transform: 'translateX(-50%)',
              zIndex: 10,
              cursor: draggingId === anchor.id ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => startDrag(anchor.id, e)}
          >
            {/* 竖线（从三角顶到轨道顶） */}
            <div
              style={{
                width: '2px',
                height: `${TRACK_HEIGHT}px`,
                backgroundColor: 'var(--color-accent)',
                margin: '0 auto',
                position: 'absolute',
                left: '50%',
                top: `-${TRACK_HEIGHT}px`,
                transform: 'translateX(-50%)',
              }}
            />
            {/* 倒三角 */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: '9px solid var(--color-accent)',
              }}
            />
            {/* 拖动时的时间提示气泡 */}
            {draggingId === anchor.id && (
              <div
                style={{
                  position: 'absolute',
                  top: `-${TRACK_HEIGHT + 26}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {formatTimecode(anchor.time)}
              </div>
            )}
          </div>
        ))}

        {/* 悬停时间提示（轨道右上角） */}
        {hoverTime !== null && !draggingId && duration > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: `${toPercent(hoverTime)}%`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          >
            {formatTimecode(hoverTime)}
          </div>
        )}
      </div>

      {/* ── 时间刻度 ─────────────────────────────────────── */}
      {duration > 0 && (
        <div style={{ position: 'relative', height: '16px', marginTop: '2px' }}>
          {ticks.map((tick) => (
            <div
              key={tick}
              style={{
                position: 'absolute',
                left: `${toPercent(tick)}%`,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <div
                style={{
                  width: '1px',
                  height: '4px',
                  backgroundColor: 'var(--color-text-placeholder)',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--color-text-placeholder)',
                  lineHeight: 1,
                }}
              >
                {formatTimecode(tick)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 精确时间输入（每个锚点一个） ─────────────────── */}
      {anchors.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '12px',
          }}
        >
          {sortedAnchors.map((anchor, i) => (
            <div
              key={anchor.id}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <label
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  userSelect: 'none',
                }}
              >
                #{i + 1}
              </label>
              <input
                type="text"
                defaultValue={formatTimecode(anchor.time)}
                key={`${anchor.id}-${anchor.time}`}
                onBlur={(e) => {
                  // blur 时解析并更新锚点时间
                  const parsed = parseTimecode(e.target.value);
                  if (!isNaN(parsed) && parsed >= 0 && parsed <= duration) {
                    onAnchorsChange(
                      anchors.map((a) => (a.id === anchor.id ? { ...a, time: parsed } : a)),
                    );
                  }
                }}
                style={{
                  width: '90px',
                  padding: '3px 8px',
                  fontSize: 'var(--font-size-xs)',
                  fontVariantNumeric: 'tabular-nums',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── 片段状态列表 ─────────────────────────────────── */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: segmentIncluded[i]
                ? 'var(--color-accent-light)'
                : 'var(--color-bg-tertiary)',
              border: segmentIncluded[i]
                ? '1px solid var(--color-accent)'
                : '1px solid transparent',
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
            onClick={() => toggleSegment(i)}
          >
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--color-text-primary)',
              }}
            >
              #{i + 1} &nbsp; {formatTimecode(seg.start)} → {formatTimecode(seg.end)}
              &nbsp;&nbsp;
              {formatTimecode(seg.end - seg.start)}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                color: segmentIncluded[i]
                  ? 'var(--color-accent)'
                  : 'var(--color-text-placeholder)',
              }}
            >
              {segmentIncluded[i] ? t('timeline.segmentKept') : t('timeline.segmentSkipped')}
            </span>
          </div>
        ))}
      </div>

      {/* ── 提示文案 ─────────────────────────────────────── */}
      <p
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-placeholder)',
          marginTop: '6px',
        }}
      >
        {anchors.length === 0 ? t('timeline.noAnchors') : t('timeline.anchorDeleteHint')}
      </p>
    </div>
  );
}
