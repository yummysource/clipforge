/**
 * @file 时间轴选择器组件
 * @description 裁剪/GIF 页面复用的时间范围选择器，支持入点/出点拖拽手柄和精确输入
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { formatTimecode, parseTimecode, formatDuration } from '@/lib/format';
import { useT } from '@/i18n';

/** 时间片段 */
export interface TimeSegment {
  /** 片段 ID */
  id: string;
  /** 入点时间（秒） */
  start: number;
  /** 出点时间（秒） */
  end: number;
}

/** 拖拽类型：左手柄（入点）或右手柄（出点） */
type DragType = 'start' | 'end' | null;

/** TimelineSelector 组件 Props */
interface TimelineSelectorProps {
  /** 视频总时长（秒） */
  duration: number;
  /** 当前片段列表 */
  segments: TimeSegment[];
  /** 片段变化回调 */
  onSegmentsChange: (segments: TimeSegment[]) => void;
  /** 当前播放位置（秒） */
  currentTime?: number;
  /** 点击时间轴跳转回调 */
  onSeek?: (time: number) => void;
  /** 是否支持多片段 */
  multiSegment?: boolean;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 生成时间刻度标记
 *
 * 根据视频总时长自动选择合适的刻度间隔，
 * 返回需要显示的时间点数组
 *
 * @param duration - 视频总时长（秒）
 * @returns 需要显示刻度的时间点数组
 */
function generateTicks(duration: number): number[] {
  if (duration <= 0) return [];

  /* 根据时长选择合适的刻度间隔（秒） */
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

/**
 * 时间轴选择器组件
 *
 * 显示可交互的时间轴：
 * - 可拖拽的入点/出点手柄
 * - 选区高亮显示
 * - 时间刻度标记
 * - 精确时间码输入
 * - 拖拽时实时悬浮时间提示
 * - 多片段支持（裁剪页用）
 *
 * @param props - 时间轴配置和片段数据
 */
export function TimelineSelector({
  duration,
  segments,
  onSegmentsChange,
  currentTime = 0,
  onSeek,
  multiSegment = false,
  className,
}: TimelineSelectorProps) {
  const t = useT();

  /** 当前正在编辑的片段索引 */
  const [activeIndex, setActiveIndex] = useState(0);
  /** 当前拖拽类型 */
  const [dragging, setDragging] = useState<DragType>(null);
  /** 拖拽时的实时时间（用于悬浮提示） */
  const [dragTime, setDragTime] = useState<number | null>(null);
  /** 悬浮时间提示的 X 坐标 */
  const [tooltipX, setTooltipX] = useState(0);
  /** 鼠标悬停时的时间 */
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  /** 悬停提示的 X 坐标 */
  const [hoverX, setHoverX] = useState(0);
  /** 时间轴容器 ref */
  const trackRef = useRef<HTMLDivElement>(null);

  const activeSegment = segments[activeIndex] || { id: '0', start: 0, end: duration };

  /** 最小选区时长（秒），避免入点出点重合 */
  const MIN_SEGMENT_DURATION = 0.1;

  /** 将鼠标 X 坐标转换为时间值 */
  const xToTime = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track || duration <= 0) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  /** 时间转百分比 */
  const toPercent = (time: number) => duration > 0 ? (time / duration) * 100 : 0;

  /** 更新指定片段 */
  const updateSegment = useCallback((index: number, update: Partial<TimeSegment>) => {
    const updated = segments.map((seg, i) =>
      i === index ? { ...seg, ...update } : seg
    );
    onSegmentsChange(updated);
  }, [segments, onSegmentsChange]);

  /** 添加新片段（智能定位到最大空闲区间） */
  const addSegment = useCallback(() => {
    // 收集已有片段并按起始时间排序
    const sorted = [...segments].sort((a, b) => a.start - b.start);

    // 查找最大空闲区间（已有片段之间的间隙）
    let bestStart = 0;
    let bestEnd = duration;
    let bestGap = 0;

    // 检查第一个片段之前的空隙
    if (sorted.length > 0 && sorted[0].start > bestGap) {
      bestGap = sorted[0].start;
      bestStart = 0;
      bestEnd = sorted[0].start;
    }
    // 检查相邻片段之间的空隙
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].start - sorted[i].end;
      if (gap > bestGap) {
        bestGap = gap;
        bestStart = sorted[i].end;
        bestEnd = sorted[i + 1].start;
      }
    }
    // 检查最后一个片段之后的空隙
    if (sorted.length > 0) {
      const lastEnd = sorted[sorted.length - 1].end;
      const gap = duration - lastEnd;
      if (gap > bestGap) {
        bestGap = gap;
        bestStart = lastEnd;
        bestEnd = duration;
      }
    }

    // 在最大空闲区间中创建新片段（取中间 50% 或最多 10 秒）
    const gapDuration = bestEnd - bestStart;
    const segLen = Math.min(gapDuration, Math.max(gapDuration * 0.5, MIN_SEGMENT_DURATION));
    const midpoint = bestStart + gapDuration / 2;
    const newStart = Math.max(bestStart, midpoint - segLen / 2);
    const newEnd = Math.min(bestEnd, midpoint + segLen / 2);

    const newSeg: TimeSegment = {
      id: String(Date.now()),
      start: Math.round(newStart * 1000) / 1000,
      end: Math.round(newEnd * 1000) / 1000,
    };
    onSegmentsChange([...segments, newSeg]);
    setActiveIndex(segments.length);
  }, [segments, duration, onSegmentsChange]);

  /** 删除片段 */
  const removeSegment = useCallback((index: number) => {
    if (segments.length <= 1) return;
    const updated = segments.filter((_, i) => i !== index);
    onSegmentsChange(updated);
    setActiveIndex(Math.min(activeIndex, updated.length - 1));
  }, [segments, activeIndex, onSegmentsChange]);

  /* ---- 拖拽逻辑 ---- */

  /** 开始拖拽手柄 */
  const startDrag = useCallback((type: DragType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    const time = xToTime(e.clientX);
    setDragTime(time);
    setTooltipX(e.clientX - (trackRef.current?.getBoundingClientRect().left ?? 0));
  }, [xToTime]);

  /** 拖拽过程中更新（绑定到 window） */
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = xToTime(e.clientX);
      setDragTime(time);
      setTooltipX(e.clientX - (trackRef.current?.getBoundingClientRect().left ?? 0));

      if (dragging === 'start') {
        const newStart = Math.max(0, Math.min(time, activeSegment.end - MIN_SEGMENT_DURATION));
        updateSegment(activeIndex, { start: newStart });
      } else if (dragging === 'end') {
        const newEnd = Math.min(duration, Math.max(time, activeSegment.start + MIN_SEGMENT_DURATION));
        updateSegment(activeIndex, { end: newEnd });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setDragTime(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, activeIndex, activeSegment, duration, xToTime, updateSegment]);

  /** 鼠标悬停显示时间 */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging) return;
    const time = xToTime(e.clientX);
    setHoverTime(time);
    setHoverX(e.clientX - (trackRef.current?.getBoundingClientRect().left ?? 0));
  }, [dragging, xToTime]);

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  /** 点击时间轴区域跳转播放位置 */
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging) return;
    const time = xToTime(e.clientX);
    onSeek?.(time);
  }, [dragging, xToTime, onSeek]);

  /** 时间刻度 */
  const ticks = generateTicks(duration);

  return (
    <div className={className}>
      {/* 时间轴主体 */}
      <div
        ref={trackRef}
        className="relative w-full select-none"
        style={{ paddingBottom: '24px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleTrackClick}
      >
        {/* 轨道背景 */}
        <div
          className="relative w-full rounded-lg overflow-hidden"
          style={{
            height: '48px',
            backgroundColor: 'var(--color-bg-tertiary)',
            cursor: dragging ? 'grabbing' : 'pointer',
          }}
        >
          {/* 未选中区域（灰色蒙层） */}
          {/* 左侧未选中 */}
          {toPercent(activeSegment.start) > 0 && (
            <div
              className="absolute top-0 left-0 h-full"
              style={{
                width: `${toPercent(activeSegment.start)}%`,
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
          )}
          {/* 右侧未选中 */}
          {toPercent(activeSegment.end) < 100 && (
            <div
              className="absolute top-0 h-full"
              style={{
                left: `${toPercent(activeSegment.end)}%`,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* 所有片段选区 */}
          {segments.map((seg, i) => (
            <div
              key={seg.id}
              className="absolute top-0 h-full"
              style={{
                left: `${toPercent(seg.start)}%`,
                width: `${toPercent(seg.end - seg.start)}%`,
                backgroundColor: i === activeIndex
                  ? 'rgba(108, 92, 231, 0.2)'
                  : 'rgba(108, 92, 231, 0.08)',
                borderTop: i === activeIndex ? '2px solid var(--color-accent)' : 'none',
                borderBottom: i === activeIndex ? '2px solid var(--color-accent)' : 'none',
                zIndex: 2,
              }}
              onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
            />
          ))}

          {/* 入点手柄（左） */}
          <div
            className="absolute top-0 h-full flex items-center"
            style={{
              left: `${toPercent(activeSegment.start)}%`,
              transform: 'translateX(-50%)',
              zIndex: 10,
              cursor: 'ew-resize',
            }}
            onMouseDown={(e) => startDrag('start', e)}
          >
            <div
              className="flex flex-col items-center justify-center rounded-sm"
              style={{
                width: '14px',
                height: '48px',
                backgroundColor: 'var(--color-accent)',
                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ width: '2px', height: '16px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
            </div>
          </div>

          {/* 出点手柄（右） */}
          <div
            className="absolute top-0 h-full flex items-center"
            style={{
              left: `${toPercent(activeSegment.end)}%`,
              transform: 'translateX(-50%)',
              zIndex: 10,
              cursor: 'ew-resize',
            }}
            onMouseDown={(e) => startDrag('end', e)}
          >
            <div
              className="flex flex-col items-center justify-center rounded-sm"
              style={{
                width: '14px',
                height: '48px',
                backgroundColor: 'var(--color-accent)',
                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ width: '2px', height: '16px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
            </div>
          </div>

          {/* 当前播放位置指示线 */}
          {currentTime > 0 && (
            <div
              className="absolute top-0 h-full"
              style={{
                left: `${toPercent(currentTime)}%`,
                width: '2px',
                backgroundColor: '#FF3B30',
                zIndex: 8,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* 拖拽时的悬浮时间提示 */}
          {dragging && dragTime !== null && (
            <div
              className="absolute flex items-center justify-center px-2 py-1 rounded"
              style={{
                left: `${tooltipX}px`,
                top: '-32px',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                fontSize: '11px',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              {formatTimecode(dragTime)}
            </div>
          )}

          {/* 悬停时间提示 */}
          {!dragging && hoverTime !== null && (
            <div
              className="absolute flex items-center justify-center px-2 py-1 rounded"
              style={{
                left: `${hoverX}px`,
                top: '-28px',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '10px',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                zIndex: 15,
                pointerEvents: 'none',
              }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        {/* 时间刻度 */}
        <div className="relative w-full" style={{ height: '20px' }}>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute flex flex-col items-center"
              style={{
                left: `${toPercent(t)}%`,
                transform: 'translateX(-50%)',
                top: '2px',
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
                  fontSize: '9px',
                  color: 'var(--color-text-placeholder)',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: '1px',
                }}
              >
                {formatDuration(t)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 精确时间输入 */}
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-2">
          <label
            className="shrink-0"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
          >
            {t('timeline.inPoint')}
          </label>
          <input
            type="text"
            value={formatTimecode(activeSegment.start)}
            onChange={(e) => {
              const time = parseTimecode(e.target.value);
              updateSegment(activeIndex, { start: Math.min(time, activeSegment.end - MIN_SEGMENT_DURATION) });
            }}
            className="w-28 px-2 py-1 rounded-md text-center"
            style={{
              fontSize: 'var(--font-size-xs)',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            className="shrink-0"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
          >
            {t('timeline.outPoint')}
          </label>
          <input
            type="text"
            value={formatTimecode(activeSegment.end)}
            onChange={(e) => {
              const time = parseTimecode(e.target.value);
              updateSegment(activeIndex, { end: Math.max(time, activeSegment.start + MIN_SEGMENT_DURATION) });
            }}
            className="w-28 px-2 py-1 rounded-md text-center"
            style={{
              fontSize: 'var(--font-size-xs)',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        </div>

        <span
          className="px-2 py-1 rounded-md"
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-light)',
          }}
        >
          {t('timeline.duration')}: {formatTimecode(Math.max(0, activeSegment.end - activeSegment.start))}
        </span>
      </div>

      {/* 多片段管理 */}
      {multiSegment && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {t('timeline.segmentsSelected', { count: segments.length })}
            </span>
            <button
              onClick={addSegment}
              className="text-xs px-3 py-1 rounded-md cursor-pointer transition-colors"
              style={{
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
                backgroundColor: 'transparent',
              }}
            >
              {t('timeline.addSegment')}
            </button>
          </div>

          {/* 片段列表 */}
          <div className="flex flex-col gap-1">
            {segments.map((seg, i) => (
              <div
                key={seg.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  backgroundColor: i === activeIndex ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                  border: i === activeIndex ? '1px solid var(--color-accent)' : '1px solid transparent',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-primary)',
                }}
                onClick={() => setActiveIndex(i)}
              >
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  #{i + 1}  {formatTimecode(seg.start)} → {formatTimecode(seg.end)}
                </span>
                {segments.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSegment(i); }}
                    className="text-xs px-2 py-0.5 rounded cursor-pointer transition-colors"
                    style={{ color: 'var(--color-error)' }}
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
