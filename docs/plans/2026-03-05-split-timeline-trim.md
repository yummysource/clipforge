# Split Timeline Trim Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 替换视频剪切页面的时间轴交互，改为锚点式分割模型——用户在时间轴上放置三角锚点来精确分割视频，每段可独立保留或丢弃，拖动锚点时实时 seek 视频以辅助定位。

**Architecture:** 新建 `SplitTimeline` 组件替换 `TrimPage` 中的 `TimelineSelector`（`TimelineSelector` 本身不动，GifPage 继续使用）。通过给 `FeatureLayout` 和 `VideoPreview` 各加一个 `onVideoSeekReady` / `onSeekReady` prop，将 seek 函数传递到 `SplitTimeline`，实现拖动锚点时实时预览视频帧。

**Tech Stack:** React 19, TypeScript, Tauri 2, HTML5 video element, requestAnimationFrame

---

## 背景知识

### 现有代码结构（必读）

- `src/pages/TrimPage.tsx` — 裁剪页，使用 `TimelineSelector` + 多片段列表，改造目标
- `src/components/shared/TimelineSelector.tsx` — 现有时间轴（入/出点双手柄模式），**不要改动它**
- `src/components/shared/VideoPreview.tsx` — 右侧视频预览，内部用 `useVideoPlayer` hook，有 `seek(time)` 函数
- `src/components/layout/FeatureLayout.tsx` — 三栏布局，内嵌 `VideoPreview`，`TrimPage` 用它渲染整个页面
- `src/hooks/useVideoPlayer.ts` — 封装 `videoRef` + `seek` 等控制函数
- `src/i18n/en.ts` + `src/i18n/zh.ts` — 双语 i18n，所有文案必须同时加两个文件

### 数据模型

```typescript
// 锚点 = 时间轴上的一个分割点
interface Anchor {
  id: string;   // Date.now().toString() 即可
  time: number; // 秒，精确到毫秒
}

// 视频被 N 个锚点分成 N+1 段，TrimPage 维护每段的 included 状态
// 最终传给 ffmpeg 的是 included=true 的段（类型复用现有 TimeSegment）
```

### 锚点 ↔ 片段同步规则
- 新增锚点时：找到它落在哪个 segment index，把该 segment 一分为二，两个新 segment 继承原来的 included 状态
- 删除锚点时：合并相邻两段，新段 included = 原两段任一为 true

---

## Task 1: i18n 新增文案

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`

**Step 1: 在 en.ts 的 `timeline` 对象中追加新 key**

找到现有的 `timeline:` 块（约第 402 行），在 `addSegment` 后面追加：

```typescript
  timeline: {
    inPoint: 'In',
    outPoint: 'Out',
    duration: 'Duration',
    segmentsSelected: '{count} segments selected',
    addSegment: '+ Add segment',
    // 新增：
    clickToAddAnchor: 'Click to add anchor',
    anchorCount: '{count} anchors',
    segmentKept: 'Keep',
    segmentSkipped: 'Skip',
    noAnchors: 'No anchors — click timeline to split',
    anchorDeleteHint: 'Click anchor to delete',
  },
```

同时在 `trim:` 块新增：
```typescript
  trim: {
    preciseCut: 'Precise cut',
    preciseCutDesc: 'Re-encode for frame-accurate cutting, slower',
    mergeSegments: 'Merge segments',
    mergeSegmentsDesc: 'Merge multiple segments into one file',
    // 新增：
    keptSegments: '{count} segments kept',
    allSegmentsSkipped: 'At least one segment must be kept',
  },
```

**Step 2: 在 zh.ts 对应位置添加中文翻译**

```typescript
  timeline: {
    // 现有 key 保持不变，追加：
    clickToAddAnchor: '点击添加锚点',
    anchorCount: '{count} 个锚点',
    segmentKept: '保留',
    segmentSkipped: '跳过',
    noAnchors: '无锚点 — 点击时间轴分割视频',
    anchorDeleteHint: '点击锚点可删除',
  },
  trim: {
    // 现有 key 保持不变，追加：
    keptSegments: '已保留 {count} 段',
    allSegmentsSkipped: '至少保留一段',
  },
```

**Step 3: 验证 TypeScript 编译（类型检查，不用实际编译全部）**

```bash
cd /Users/james/codeSpace/tools/ffmpeg-ui && npx tsc --noEmit 2>&1 | head -30
```

Expected: 无报错（i18n 类型会校验 zh.ts 实现了 en.ts 中所有 key）

**Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/zh.ts
git commit -m "feat(trim): add i18n keys for split timeline"
```

---

## Task 2: VideoPreview 暴露 seek 函数

**Files:**
- Modify: `src/components/shared/VideoPreview.tsx`（只改 interface + 一个 useEffect）
- Modify: `src/components/layout/FeatureLayout.tsx`（只改 interface + 一行传参）

**Step 1: 修改 VideoPreview.tsx**

在 `VideoPreviewProps` interface 加一个 prop：

```typescript
interface VideoPreviewProps {
  filePath: string | null;
  className?: string;
  /** 视频播放器 seek 函数就绪时的回调，用于外部组件控制预览位置 */
  onSeekReady?: (seek: (time: number) => void) => void;
}
```

在 `VideoPreview` 函数体内，现有的 `useVideoPlayer` 调用之后（约第 89 行），加一个 effect：

```typescript
/** 当视频文件就绪时，把 seek 函数传给父组件 */
useEffect(() => {
  if (mediaType === 'video' && filePath) {
    onSeekReady?.(seek);
  }
}, [filePath, mediaType, seek, onSeekReady]);
```

注意：`seek` 是 `useVideoPlayer` 返回的 stable callback，`onSeekReady` 应该在 dependency array 中——但要避免 onSeekReady 因父组件 re-render 导致无限循环。在 `TrimPage` 中记得用 `useCallback` 包住。

**Step 2: 修改 FeatureLayout.tsx**

在 `FeatureLayoutProps` interface 加 prop：

```typescript
  /** 透传给 VideoPreview：视频 seek 函数就绪回调 */
  onVideoSeekReady?: (seek: (time: number) => void) => void;
```

在 render 中找到 `<VideoPreview filePath={previewFilePath} />` 这行，改为：

```typescript
<VideoPreview
  filePath={previewFilePath}
  onSeekReady={onVideoSeekReady}
/>
```

**Step 3: 类型检查**

```bash
cd /Users/james/codeSpace/tools/ffmpeg-ui && npx tsc --noEmit 2>&1 | head -30
```

Expected: 无报错

**Step 4: Commit**

```bash
git add src/components/shared/VideoPreview.tsx src/components/layout/FeatureLayout.tsx
git commit -m "feat(trim): expose VideoPreview seek via onSeekReady prop"
```

---

## Task 3: 新建 SplitTimeline 组件

**Files:**
- Create: `src/components/shared/SplitTimeline.tsx`

这是核心新组件，约 300 行。下面是完整实现，**逐段理解后照写，不要直接复制粘贴**。

### 接口定义

```typescript
/** 时间轴锚点，代表一个精确分割点 */
export interface Anchor {
  id: string;
  time: number; // 秒
}

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
  className?: string;
}
```

### 派生片段计算（组件内 helper）

```typescript
/** 从锚点推导出完整片段列表（按时间排序） */
function deriveSegments(anchors: Anchor[], duration: number) {
  const sorted = [...anchors].sort((a, b) => a.time - b.time);
  const points = [0, ...sorted.map(a => a.time), duration];
  return points.slice(0, -1).map((start, i) => ({
    start,
    end: points[i + 1],
  }));
}
```

### 主要交互逻辑

**添加锚点（click on track）：**
```typescript
const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
  if (draggingId) return; // 拖动中不触发 click
  const time = xToTime(e.clientX);

  // 如果点击位置距离已有锚点 < 8px（时间比例换算），改为删除操作
  const threshold = duration * (8 / trackWidth);
  const nearby = anchors.find(a => Math.abs(a.time - time) < threshold);
  if (nearby) {
    removeAnchor(nearby.id);
    return;
  }

  addAnchor(time);
  onSeek?.(time); // 同时 seek 到该位置
};
```

**添加锚点（含 segmentIncluded 同步）：**
```typescript
const addAnchor = (time: number) => {
  // 找到新锚点落在哪个 segment index
  const segments = deriveSegments(anchors, duration);
  const segIdx = segments.findIndex(s => time >= s.start && time <= s.end);
  const inheritedIncluded = segmentIncluded[segIdx] ?? true;

  const newAnchor: Anchor = { id: String(Date.now()), time };
  const newAnchors = [...anchors, newAnchor].sort((a, b) => a.time - b.time);

  // 把 segIdx 位置的 included 一分为二（两个新段继承原状态）
  const newIncluded = [...segmentIncluded];
  newIncluded.splice(segIdx, 1, inheritedIncluded, inheritedIncluded);

  onAnchorsChange(newAnchors);
  onSegmentIncludedChange(newIncluded);
};
```

**删除锚点（含 segmentIncluded 同步）：**
```typescript
const removeAnchor = (anchorId: string) => {
  const sorted = [...anchors].sort((a, b) => a.time - b.time);
  const anchorIdx = sorted.findIndex(a => a.id === anchorId);

  // 合并 anchorIdx 和 anchorIdx+1 两段，任一为 true 则保留
  const mergedIncluded = (segmentIncluded[anchorIdx] ?? true) || (segmentIncluded[anchorIdx + 1] ?? true);
  const newIncluded = [...segmentIncluded];
  newIncluded.splice(anchorIdx, 2, mergedIncluded);

  onAnchorsChange(anchors.filter(a => a.id !== anchorId));
  onSegmentIncludedChange(newIncluded);
};
```

**拖动锚点（含 RAF 节流 seek）：**
```typescript
const [draggingId, setDraggingId] = useState<string | null>(null);
const rafRef = useRef<number | null>(null);

// mousedown on anchor
const startDrag = (anchorId: string, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setDraggingId(anchorId);
};

// 绑定到 window 的 mousemove
useEffect(() => {
  if (!draggingId) return;
  const onMove = (e: MouseEvent) => {
    const time = xToTime(e.clientX);
    // 更新该锚点时间（不超出相邻锚点范围）
    const sorted = [...anchors].sort((a, b) => a.time - b.time);
    const idx = sorted.findIndex(a => a.id === draggingId);
    const minTime = idx > 0 ? sorted[idx - 1].time + 0.1 : 0.1;
    const maxTime = idx < sorted.length - 1 ? sorted[idx + 1].time - 0.1 : duration - 0.1;
    const clamped = Math.max(minTime, Math.min(maxTime, time));

    onAnchorsChange(anchors.map(a => a.id === draggingId ? { ...a, time: clamped } : a));

    // RAF 节流 seek
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
}, [draggingId, anchors, duration, onAnchorsChange, onSeek]);
```

### 渲染结构

```tsx
// 时间轴主轨道（高度 52px）
<div ref={trackRef} style={{ position: 'relative', height: '52px', cursor: 'crosshair' }}
     onClick={handleTrackClick}
     onMouseMove={handleMouseMove}
     onMouseLeave={() => setHoverTime(null)}>

  {/* 背景轨道 */}
  <div style={{ height: '44px', borderRadius: '8px', backgroundColor: 'var(--color-bg-tertiary)' }}>

    {/* 各片段色块 */}
    {deriveSegments(anchors, duration).map((seg, i) => (
      <div key={i}
           style={{
             position: 'absolute', top: 0, height: '44px',
             left: `${toPercent(seg.start)}%`,
             width: `${toPercent(seg.end - seg.start)}%`,
             backgroundColor: segmentIncluded[i]
               ? 'rgba(108,92,231,0.25)'   // 保留段：紫色
               : 'rgba(0,0,0,0.18)',        // 跳过段：灰暗
             borderTop: segmentIncluded[i] ? '2px solid var(--color-accent)' : 'none',
             borderBottom: segmentIncluded[i] ? '2px solid var(--color-accent)' : 'none',
             cursor: 'default',
           }}
           onClick={(e) => { e.stopPropagation(); toggleSegment(i); }}
      />
    ))}

    {/* 悬停时的 ghost 锚点线 */}
    {hoverTime !== null && !draggingId && (
      <div style={{
        position: 'absolute', top: 0, width: '2px', height: '44px',
        left: `${toPercent(hoverTime)}%`,
        backgroundColor: 'rgba(108,92,231,0.4)',
        pointerEvents: 'none',
      }} />
    )}
  </div>

  {/* 锚点三角（在轨道底部向下伸出） */}
  {[...anchors].sort((a, b) => a.time - b.time).map(anchor => (
    <div key={anchor.id}
         style={{
           position: 'absolute', bottom: '0px',
           left: `${toPercent(anchor.time)}%`,
           transform: 'translateX(-50%)',
           zIndex: 10, cursor: draggingId === anchor.id ? 'grabbing' : 'grab',
         }}
         onMouseDown={(e) => startDrag(anchor.id, e)}
    >
      {/* 竖线 */}
      <div style={{ width: '2px', height: '44px', backgroundColor: 'var(--color-accent)',
                    margin: '0 auto', position: 'absolute', left: '50%', top: '-44px', transform: 'translateX(-50%)' }} />
      {/* 倒三角 */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: '9px solid var(--color-accent)',
      }} />
      {/* 拖动时间提示 */}
      {draggingId === anchor.id && (
        <div style={{
          position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-accent)', color: 'white',
          fontSize: '11px', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
        }}>
          {formatTimecode(anchor.time)}
        </div>
      )}
    </div>
  ))}

  {/* 悬停时间提示 */}
  {hoverTime !== null && !draggingId && (
    <div style={{ /* tooltip 样式，同 TimelineSelector */ }}>
      {formatTimecode(hoverTime)}
    </div>
  )}
</div>

{/* 时间刻度（复用 generateTicks，样式同 TimelineSelector） */}
...

{/* 精确时间输入：每个锚点显示一个输入框 */}
{anchors.length > 0 && (
  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
    {[...anchors].sort((a,b) => a.time - b.time).map((anchor, i) => (
      <div key={anchor.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          #{i+1}
        </label>
        <input
          type="text"
          value={formatTimecode(anchor.time)}
          onChange={(e) => {
            const t = parseTimecode(e.target.value);
            onAnchorsChange(anchors.map(a => a.id === anchor.id ? { ...a, time: t } : a));
          }}
          style={{ width: '90px', /* 样式同 TimelineSelector 的时间输入框 */ }}
        />
      </div>
    ))}
  </div>
)}

{/* 片段状态列表 */}
<div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
  {deriveSegments(anchors, duration).map((seg, i) => (
    <div key={i}
         style={{
           display: 'flex', alignItems: 'center', justifyContent: 'space-between',
           padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
           backgroundColor: segmentIncluded[i] ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
           border: segmentIncluded[i] ? '1px solid var(--color-accent)' : '1px solid transparent',
         }}
         onClick={() => toggleSegment(i)}>
      <span style={{ fontSize: 'var(--font-size-xs)', fontVariantNumeric: 'tabular-nums' }}>
        #{i+1}  {formatTimecode(seg.start)} → {formatTimecode(seg.end)}
        {'  '}{formatTimecode(seg.end - seg.start)}
      </span>
      <span style={{
        fontSize: 'var(--font-size-xs)', fontWeight: 600,
        color: segmentIncluded[i] ? 'var(--color-accent)' : 'var(--color-text-placeholder)',
      }}>
        {segmentIncluded[i] ? t('timeline.segmentKept') : t('timeline.segmentSkipped')}
      </span>
    </div>
  ))}
</div>

{/* 提示文案 */}
<p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-placeholder)', marginTop: '6px' }}>
  {anchors.length === 0 ? t('timeline.noAnchors') : t('timeline.anchorDeleteHint')}
</p>
```

**Step 1: 新建文件并实现上述完整组件**

**Step 2: 类型检查**

```bash
cd /Users/james/codeSpace/tools/ffmpeg-ui && npx tsc --noEmit 2>&1 | head -30
```

Expected: 无报错

**Step 3: Commit**

```bash
git add src/components/shared/SplitTimeline.tsx
git commit -m "feat(trim): add SplitTimeline component with anchor-based splitting"
```

---

## Task 4: 改造 TrimPage

**Files:**
- Modify: `src/pages/TrimPage.tsx`

完整替换后的 TrimPage：

```typescript
/**
 * @file 裁剪剪切页面（锚点式分割版本）
 * @description 用户在时间轴放置锚点分割视频，选择保留哪些片段，拖动锚点时实时预览
 */
import { useState, useCallback, useRef } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { SplitTimeline, type Anchor } from '@/components/shared/SplitTimeline';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { trimVideo } from '@/services/ffmpeg';
import { generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import { useT } from '@/i18n';

export function TrimPage() {
  const { status, progress, result, error, execute, cancel, reset } = useTask('trim');
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);
  const t = useT();

  const currentFile = files[selectedIndex];
  const duration = currentFile?.mediaInfo?.duration ?? 0;

  /** 锚点列表（空 = 无分割，整段视频） */
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  /** 每段的保留状态（长度 = anchors.length + 1） */
  const [segmentIncluded, setSegmentIncluded] = useState<boolean[]>([true]);
  const [preciseCut, setPreciseCut] = useState(false);

  /** seek 函数 ref，由 VideoPreview 通过 FeatureLayout 注入 */
  const seekRef = useRef<((t: number) => void) | null>(null);
  const handleVideoSeekReady = useCallback((seekFn: (t: number) => void) => {
    seekRef.current = seekFn;
  }, []);

  /** 计算最终要处理的片段（仅 included=true 的） */
  const computeSegments = useCallback(() => {
    const sorted = [...anchors].sort((a, b) => a.time - b.time);
    const points = [0, ...sorted.map(a => a.time), duration];
    return points.slice(0, -1)
      .map((start, i) => ({ start, end: points[i + 1] }))
      .filter((_, i) => segmentIncluded[i] ?? true);
  }, [anchors, segmentIncluded, duration]);

  const handleStart = useCallback(() => {
    if (!currentFile) return;
    const segments = computeSegments();
    if (segments.length === 0) return; // 至少保留一段
    execute(trimVideo, {
      inputPath: currentFile.path,
      outputPath: buildOutputPath(
        currentFile.path,
        generateOutputName(currentFile.name, outputSuffix),
      ),
      segments,
      preciseCut,
      mergeSegments: true, // 多段始终合并为单文件
    });
  }, [currentFile, computeSegments, preciseCut, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
    setAnchors([]);
    setSegmentIncluded([true]);
  }, [reset, clearFiles]);

  const keptCount = segmentIncluded.filter(Boolean).length;
  const startDisabled = keptCount === 0;

  return (
    <FeatureLayout
      title={t('features.trim.name')}
      description={t('features.trim.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
      taskResult={result}
      startDisabled={startDisabled}
      onVideoSeekReady={handleVideoSeekReady}
    >
      <SplitTimeline
        duration={duration}
        anchors={anchors}
        segmentIncluded={segmentIncluded}
        onAnchorsChange={setAnchors}
        onSegmentIncludedChange={setSegmentIncluded}
        onSeek={(t) => seekRef.current?.(t)}
        className="mb-6"
      />

      {/* 全部跳过时的警告 */}
      {startDisabled && duration > 0 && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', marginBottom: '8px' }}>
          {t('trim.allSegmentsSkipped')}
        </p>
      )}

      {/* 精确切割开关 */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
            {t('trim.preciseCut')}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {t('trim.preciseCutDesc')}
          </p>
        </div>
        <button
          onClick={() => setPreciseCut(!preciseCut)}
          className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
          style={{
            backgroundColor: preciseCut ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
            style={{
              left: preciseCut ? '20px' : '2px',
              backgroundColor: preciseCut ? 'white' : 'var(--color-text-placeholder)',
            }}
          />
        </button>
      </div>
    </FeatureLayout>
  );
}
```

**Step 1: 用上述代码完整替换 TrimPage.tsx**

**Step 2: 类型检查**

```bash
cd /Users/james/codeSpace/tools/ffmpeg-ui && npx tsc --noEmit 2>&1 | head -30
```

Expected: 无报错

**Step 3: Commit**

```bash
git add src/pages/TrimPage.tsx
git commit -m "feat(trim): integrate SplitTimeline into TrimPage with seek support"
```

---

## Task 5: 编译验证

**Step 1: 完整 build**

```bash
cd /Users/james/codeSpace/tools/ffmpeg-ui && npm run build 2>&1 | tail -20
```

Expected: `✓ built in Xs` 无错误

**Step 2: 若有报错，逐一修复再重跑 build**

常见问题：
- i18n key 拼写错误 → 检查 `en.ts` 和 `zh.ts` key 是否完全一致
- `onVideoSeekReady` prop 未传递 → 检查 `FeatureLayout.tsx` 接口和渲染
- `SplitTimeline` import 路径 → 确认文件在 `src/components/shared/SplitTimeline.tsx`

**Step 3: 最终 commit**

```bash
git add -A
git commit -m "feat(trim): anchor-based split timeline with video seek preview"
```

---

## 验收标准

1. **添加锚点**：点击时间轴任意位置出现倒三角锚点，同时视频 seek 到该帧
2. **删除锚点**：点击锚点（或在 8px 范围内点击）删除该锚点，相邻两段合并
3. **拖动锚点**：拖动过程中右侧视频实时更新到对应帧位置
4. **切换段**：点击片段色块或片段列表行，在「保留/跳过」间切换
5. **全部跳过警告**：所有段都标为跳过时，「开始」按钮禁用，显示警告文案
6. **精确剪切**：开关仍然可用，传给 ffmpeg 的 segments 只包含 included=true 的段
7. **GifPage 正常**：TimelineSelector 没有被改动，GifPage 功能完好
