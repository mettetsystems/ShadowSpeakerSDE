import { describe, expect, it } from 'vitest';
import {
  chapterIndexFromRatio,
  coveredToSegments,
  moveSegment,
  paintRange,
  punchGap,
  resizeSegment,
  segmentsToChapterIds,
} from './timelineSegments';

const chapters = ['c0', 'c1', 'c2', 'c3', 'c4'];

describe('timelineSegments', () => {
  it('derives contiguous segments and preserves gaps', () => {
    expect(coveredToSegments(['c0', 'c1', 'c3'], chapters)).toEqual([
      { start: 0, end: 1 },
      { start: 3, end: 3 },
    ]);
    expect(segmentsToChapterIds([{ start: 0, end: 1 }, { start: 3, end: 3 }], chapters)).toEqual([
      'c0',
      'c1',
      'c3',
    ]);
  });

  it('moves a segment in real time without losing other gaps', () => {
    const base = [
      { start: 0, end: 1 },
      { start: 3, end: 3 },
    ];
    const moved = moveSegment(base, 0, 1, chapters.length);
    expect(moved).toEqual([
      { start: 1, end: 2 },
      { start: 3, end: 3 },
    ]);
    expect(segmentsToChapterIds(moved, chapters)).toEqual(['c1', 'c2', 'c3']);
  });

  it('clamps moves at the timeline edges', () => {
    expect(moveSegment([{ start: 0, end: 1 }], 0, -3, chapters.length)).toEqual([
      { start: 0, end: 1 },
    ]);
    expect(moveSegment([{ start: 0, end: 1 }], 0, 10, chapters.length)).toEqual([
      { start: 3, end: 4 },
    ]);
  });

  it('scales segment edges', () => {
    expect(resizeSegment([{ start: 1, end: 2 }], 0, 'start', 0, chapters.length)).toEqual([
      { start: 0, end: 2 },
    ]);
    expect(resizeSegment([{ start: 1, end: 2 }], 0, 'end', 4, chapters.length)).toEqual([
      { start: 1, end: 4 },
    ]);
    expect(resizeSegment([{ start: 1, end: 2 }], 0, 'start', 2, chapters.length)).toEqual([
      { start: 2, end: 2 },
    ]);
  });

  it('paints ranges and punches gaps', () => {
    const covered = new Set(['c0', 'c1', 'c2']);
    expect([...paintRange(covered, chapters, 3, 4, 'add')].sort()).toEqual([
      'c0',
      'c1',
      'c2',
      'c3',
      'c4',
    ]);
    expect([...punchGap(covered, 'c1')].sort()).toEqual(['c0', 'c2']);
    expect(coveredToSegments(punchGap(covered, 'c1'), chapters)).toEqual([
      { start: 0, end: 0 },
      { start: 2, end: 2 },
    ]);
  });

  it('maps pointer ratios onto chapter indices', () => {
    expect(chapterIndexFromRatio(0, 5)).toBe(0);
    expect(chapterIndexFromRatio(0.39, 5)).toBe(1);
    expect(chapterIndexFromRatio(0.99, 5)).toBe(4);
    expect(chapterIndexFromRatio(1, 5)).toBe(4);
  });
});
