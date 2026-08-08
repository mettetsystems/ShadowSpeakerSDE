/** Inclusive chapter-index range for one contiguous Gantt bar. */
export interface Segment {
  start: number;
  end: number;
}

export function coveredToSegments(
  covered: Iterable<string>,
  orderedChapterIds: string[],
): Segment[] {
  const set = covered instanceof Set ? covered : new Set(covered);
  const segments: Segment[] = [];
  let start: number | null = null;
  for (let i = 0; i < orderedChapterIds.length; i += 1) {
    const on = set.has(orderedChapterIds[i]!);
    if (on && start === null) start = i;
    if (!on && start !== null) {
      segments.push({ start, end: i - 1 });
      start = null;
    }
  }
  if (start !== null) segments.push({ start, end: orderedChapterIds.length - 1 });
  return segments;
}

export function segmentsToChapterIds(
  segments: Segment[],
  orderedChapterIds: string[],
): string[] {
  const ids = new Set<string>();
  for (const segment of segments) {
    const from = Math.max(0, segment.start);
    const to = Math.min(orderedChapterIds.length - 1, segment.end);
    if (from > to) continue;
    for (let i = from; i <= to; i += 1) {
      ids.add(orderedChapterIds[i]!);
    }
  }
  return [...ids];
}

/** Shift one segment by delta chapters; clamp within the timeline. */
export function moveSegment(
  segments: Segment[],
  index: number,
  delta: number,
  chapterCount: number,
): Segment[] {
  if (delta === 0 || chapterCount <= 0) return segments.map((s) => ({ ...s }));
  const current = segments[index];
  if (!current) return segments.map((s) => ({ ...s }));
  const length = current.end - current.start;
  let nextStart = current.start + delta;
  nextStart = Math.max(0, Math.min(chapterCount - 1 - length, nextStart));
  return segments.map((segment, i) =>
    i === index ? { start: nextStart, end: nextStart + length } : { ...segment },
  );
}

/** Resize a segment edge to a target chapter index. */
export function resizeSegment(
  segments: Segment[],
  index: number,
  edge: 'start' | 'end',
  toIndex: number,
  chapterCount: number,
): Segment[] {
  const current = segments[index];
  if (!current || chapterCount <= 0) return segments.map((s) => ({ ...s }));
  const clamped = Math.max(0, Math.min(chapterCount - 1, toIndex));
  let start = current.start;
  let end = current.end;
  if (edge === 'start') {
    start = Math.min(clamped, end);
  } else {
    end = Math.max(clamped, start);
  }
  return segments.map((segment, i) => (i === index ? { start, end } : { ...segment }));
}

/** Add or extend coverage for an inclusive drag range on empty track. */
export function paintRange(
  covered: Set<string>,
  orderedChapterIds: string[],
  fromIndex: number,
  toIndex: number,
  mode: 'add' | 'remove',
): Set<string> {
  const next = new Set(covered);
  const lo = Math.max(0, Math.min(fromIndex, toIndex));
  const hi = Math.min(orderedChapterIds.length - 1, Math.max(fromIndex, toIndex));
  for (let i = lo; i <= hi; i += 1) {
    const id = orderedChapterIds[i]!;
    if (mode === 'add') next.add(id);
    else next.delete(id);
  }
  return next;
}

/** Remove one chapter from coverage, creating or widening a gap. */
export function punchGap(
  covered: Set<string>,
  chapterId: string,
): Set<string> {
  const next = new Set(covered);
  next.delete(chapterId);
  return next;
}

export function chapterIndexFromRatio(ratio: number, chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  return Math.max(0, Math.min(chapterCount - 1, Math.floor(ratio * chapterCount)));
}
