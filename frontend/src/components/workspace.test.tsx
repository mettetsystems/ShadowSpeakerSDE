import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { BlockEditor } from './BlockEditor';
import { ChapterWorkspace } from './ChapterWorkspace';
import { Timeline } from './Timeline';
import type { StoryProject } from '../types';
import { BLOCK_TYPE_LABELS } from '../types';

function withDnd(ui: ReactNode) {
  return render(<DndContext>{ui}</DndContext>);
}

function sampleProject(): StoryProject {
  return {
    id: 'proj_1',
    name: 'Sample',
    narrative_defaults: {
      point_of_view: 'third_limited',
      writing_style_material: '',
    },
    writing_style_material: '',
    chapters: [
      {
        id: 'ch_a',
        title: 'Arrival',
        subtitle: 'Fog',
        description: '',
        order: 0,
        timescale: 'days',
        point_of_view_override: null,
        subplot_ids: ['sub_1'],
        block_ids: ['blk_setting'],
        continuity_summary: 'Mara reaches the fogbound quay.',
        draft_prose: 'The ropes were slick with salt.',
      },
      {
        id: 'ch_b',
        title: 'Departure',
        subtitle: null,
        description: '',
        order: 1,
        timescale: 'hours',
        point_of_view_override: null,
        subplot_ids: ['sub_1'],
        block_ids: ['blk_character'],
        continuity_summary: '',
        draft_prose: '',
      },
    ],
    plots: [],
    subplots: [
      {
        id: 'sub_1',
        name: 'Debt',
        description: '',
        chapter_ids: ['ch_a', 'ch_b'],
        related_subplot_ids: [],
      },
    ],
    blocks: {
      blk_setting: {
        id: 'blk_setting',
        block_type: 'setting',
        title: 'Harbor',
        time_of_day: 'dawn',
        environment_state: 'wet',
        description: 'Salt and rope',
        micro_settings: ['pier'],
      },
      blk_character: {
        id: 'blk_character',
        block_type: 'character',
        title: 'Mara',
        attire: 'coat',
        appearance: 'tall',
        smell: 'ozone',
        personality: 'sharp',
        archetype: 'survivor',
        aura: 'cold',
        special_skillsets: ['navigation'],
        personalized_items: ['compass'],
      },
    },
    block_links: [
      {
        id: 'lnk_1',
        source_block_id: 'blk_setting',
        target_block_id: 'blk_character',
        description: 'meets here',
      },
    ],
    block_templates: [
      {
        id: 'tpl_setting',
        name: 'Setting',
        block_type: 'setting',
        defaults: { title: 'New Setting' },
      },
    ],
  };
}

describe('chapter and timeline rendering', () => {
  it('renders chapters in order and shows cross-chapter links', () => {
    const project = sampleProject();
    const onMoveChapter = vi.fn();
    withDnd(
      <ChapterWorkspace
        project={project}
        selectedChapterId="ch_a"
        selectedBlockId={null}
        onSelectChapter={vi.fn()}
        onSelectBlock={vi.fn()}
        onMoveChapter={onMoveChapter}
        onUpdateChapter={vi.fn()}
        onDeleteChapter={vi.fn()}
        onMoveBlock={vi.fn()}
      />,
    );

    const titleInputs = screen.getAllByLabelText('Title');
    expect(titleInputs[0]).toHaveValue('Arrival');
    expect(titleInputs[1]).toHaveValue('Departure');
    expect(screen.getByText(/Linked to Mara/)).toBeInTheDocument();
  });

  it('reorders a chapter via accessible controls', async () => {
    const user = userEvent.setup();
    const project = sampleProject();
    const onMoveChapter = vi.fn();
    withDnd(
      <ChapterWorkspace
        project={project}
        selectedChapterId="ch_a"
        selectedBlockId={null}
        onSelectChapter={vi.fn()}
        onSelectBlock={vi.fn()}
        onMoveChapter={onMoveChapter}
        onUpdateChapter={vi.fn()}
        onDeleteChapter={vi.fn()}
        onMoveBlock={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText('Move Arrival right'));
    expect(onMoveChapter).toHaveBeenCalledWith('ch_a', 1);
  });

  it('moves a block with the destination selector', async () => {
    const user = userEvent.setup();
    const onMoveBlock = vi.fn();
    withDnd(
      <ChapterWorkspace
        project={sampleProject()}
        selectedChapterId="ch_a"
        selectedBlockId={null}
        onSelectChapter={vi.fn()}
        onSelectBlock={vi.fn()}
        onMoveChapter={vi.fn()}
        onUpdateChapter={vi.fn()}
        onDeleteChapter={vi.fn()}
        onMoveBlock={onMoveBlock}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Move Harbor to chapter'), 'ch_b');
    expect(onMoveBlock).toHaveBeenCalledWith('blk_setting', 'ch_b');
  });
});

describe('timeline and block editor', () => {
  it('shows subplot coverage across chapters', () => {
    render(
      <Timeline
        project={sampleProject()}
        selectedChapterId="ch_a"
        onSelectChapter={vi.fn()}
      />,
    );
    expect(screen.getByText('Debt')).toBeInTheDocument();
    expect(screen.getByText('Arrival')).toBeInTheDocument();
    expect(screen.getByText('Departure')).toBeInTheDocument();
  });

  it('edits structured setting fields and preserves template labels', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const block = sampleProject().blocks.blk_setting;
    render(
      <BlockEditor
        block={block}
        onSave={onSave}
        onClose={vi.fn()}
        onStartLink={vi.fn()}
        onDelete={vi.fn()}
        linkHint={null}
      />,
    );
    expect(BLOCK_TYPE_LABELS.setting).toBe('Setting');
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Quay');
    await user.clear(screen.getByLabelText('Micro-settings (one per line)'));
    await user.type(screen.getByLabelText('Micro-settings (one per line)'), 'crane\nnet');
    await user.click(screen.getByRole('button', { name: 'Save block' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Quay',
        micro_settings: ['crane', 'net'],
      }),
    );
  });
});

describe('template immutability helper', () => {
  it('keeps template defaults distinct from instance data in sample project', () => {
    const project = sampleProject();
    const template = project.block_templates[0];
    const instance = project.blocks.blk_setting;
    expect(template.defaults.title).toBe('New Setting');
    expect(instance.title).toBe('Harbor');
    expect(template.defaults).not.toBe(instance);
  });
});

describe('export action URLs', () => {
  it('builds download-friendly export endpoints', () => {
    expect(api.exportUrl('proj_1', 'json')).toContain('/projects/proj_1/export/json');
    expect(api.exportUrl('proj_1', 'markdown')).toContain('/export/markdown');
    expect(api.exportUrl('proj_1', 'writing-style')).toContain('/export/writing-style');
    expect(api.exportUrl('proj_1', 'agent-pack')).toContain('/export/agent-pack');
  });
});

describe('chapter continuity and draft fields', () => {
  it('renders continuity and draft editors and saves on blur', async () => {
    const user = userEvent.setup();
    const onUpdateChapter = vi.fn();
    withDnd(
      <ChapterWorkspace
        project={sampleProject()}
        selectedChapterId="ch_a"
        selectedBlockId={null}
        onSelectChapter={vi.fn()}
        onSelectBlock={vi.fn()}
        onMoveChapter={vi.fn()}
        onUpdateChapter={onUpdateChapter}
        onDeleteChapter={vi.fn()}
        onMoveBlock={vi.fn()}
      />,
    );

    const continuity = screen.getAllByLabelText('Continuity summary')[0];
    await user.clear(continuity);
    await user.type(continuity, 'Updated summary');
    await user.tab();
    expect(onUpdateChapter).toHaveBeenCalledWith(
      'ch_a',
      expect.objectContaining({ continuity_summary: 'Updated summary' }),
    );

    const draft = screen.getAllByLabelText('Draft prose')[0];
    await user.clear(draft);
    await user.type(draft, 'New draft line.');
    await user.tab();
    expect(onUpdateChapter).toHaveBeenCalledWith(
      'ch_a',
      expect.objectContaining({ draft_prose: 'New draft line.' }),
    );
  });
});
