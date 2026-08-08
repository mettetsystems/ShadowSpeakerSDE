import { describe, expect, it } from 'vitest';
import {
  reorderSettingSequence,
  settingSequenceInChapter,
} from './chapterBlocks';
import type { Chapter, StoryProject } from './types';

const chapter: Chapter = {
  id: 'ch_1',
  title: 'One',
  subtitle: null,
  description: '',
  order: 0,
  timescale: 'days',
  point_of_view_override: null,
  subplot_ids: [],
  block_ids: ['set_a', 'char_1', 'set_b', 'set_c'],
  continuity_summary: '',
  draft_prose: '',
  pacing_devices: [],
  pacing_devices_custom: [],
  syntactic_pacing_notes: '',
  suspense_mechanisms: [],
  suspense_custom: [],
  writing_texture: {
    rule_of_three: 0,
    emotional_flatlining: 0,
    metaphor_stacking: 0,
    list_rhythm_stacking: 0,
    subject_x_vs_subject_y: 0,
    metaphor_with_personification: 0,
    clean_pivot_sentences: 0,
    over_dramatic_metaphor: 0,
    emotional_shorthand_stacking: 0,
  },
};

const blocks = {
  set_a: { id: 'set_a', block_type: 'setting', title: 'A' },
  set_b: { id: 'set_b', block_type: 'setting', title: 'B' },
  set_c: { id: 'set_c', block_type: 'setting', title: 'C' },
  char_1: { id: 'char_1', block_type: 'character', title: 'Cara' },
} as unknown as StoryProject['blocks'];

describe('chapterBlocks setting sequence', () => {
  it('reports 1-based setting sequence among settings only', () => {
    expect(settingSequenceInChapter(chapter, blocks, 'set_a')).toBe(1);
    expect(settingSequenceInChapter(chapter, blocks, 'set_b')).toBe(2);
    expect(settingSequenceInChapter(chapter, blocks, 'set_c')).toBe(3);
  });

  it('reorders settings without disturbing non-setting slots', () => {
    const next = reorderSettingSequence(chapter, blocks, 'set_c', 1);
    expect(next).toEqual(['set_c', 'char_1', 'set_a', 'set_b']);
  });
});
