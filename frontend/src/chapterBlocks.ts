import type { Chapter, StoryBlock, StoryProject } from './types';

/** Setting block ids in chapter order. */
export function settingIdsInChapter(
  chapter: Chapter,
  blocks: StoryProject['blocks'],
): string[] {
  return chapter.block_ids.filter((id) => blocks[id]?.block_type === 'setting');
}

/** 1-based sequence of a setting among settings in its chapter, or 0 if absent. */
export function settingSequenceInChapter(
  chapter: Chapter,
  blocks: StoryProject['blocks'],
  settingId: string,
): number {
  const index = settingIdsInChapter(chapter, blocks).indexOf(settingId);
  return index >= 0 ? index + 1 : 0;
}

/**
 * Rebuild chapter.block_ids so the given setting moves to a 1-based sequence
 * among settings, without changing the relative positions of non-setting blocks.
 */
export function reorderSettingSequence(
  chapter: Chapter,
  blocks: StoryProject['blocks'],
  settingId: string,
  sequence: number,
): string[] | null {
  const settings = settingIdsInChapter(chapter, blocks);
  if (!settings.includes(settingId)) return null;
  const clamped = Math.max(1, Math.min(Math.round(sequence), settings.length));
  const nextSettings = settings.filter((id) => id !== settingId);
  nextSettings.splice(clamped - 1, 0, settingId);
  let settingIndex = 0;
  return chapter.block_ids.map((id) => {
    if (blocks[id]?.block_type === 'setting') {
      const next = nextSettings[settingIndex]!;
      settingIndex += 1;
      return next;
    }
    return id;
  });
}

export function findChapterForBlock(
  project: StoryProject,
  blockId: string,
): Chapter | undefined {
  return project.chapters.find((chapter) => chapter.block_ids.includes(blockId));
}

export function chapterBlocks(
  chapter: Chapter,
  blocks: StoryProject['blocks'],
): StoryBlock[] {
  return chapter.block_ids
    .map((id) => blocks[id])
    .filter((block): block is StoryBlock => Boolean(block));
}
