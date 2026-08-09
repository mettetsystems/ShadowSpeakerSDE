import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { BlockEditor } from './BlockEditor';
import { ChapterWorkspace } from './ChapterWorkspace';
import { ReviewPanel } from './ReviewPanel';
import { SubplotPanel } from './SubplotPanel';
import { Timeline } from './Timeline';
import type { StoryProject } from '../types';
import { BLOCK_TYPE_LABELS, type SettingBlock } from '../types';

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
      structural_devices: [],
      structural_devices_custom: [],
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
        phases: [
          { id: 'ph_1', description: 'Owed favor' },
          { id: 'ph_2', description: '' },
          { id: 'ph_3', description: '' },
        ],
        inciting_incident: '',
        macguffin: '',
        plot_twist: '',
        deus_ex_machina: '',
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
        juxtaposition: '',
        color_variant: 0,
        character_ids: [],
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
        character_foil_id: null,
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
    timeline_slots: Array.from({ length: 10 }, (_, index) => ({
      id: `slot_${index}`,
      name: index === 0 ? 'Debt' : '',
      subplot_id: index === 0 ? 'sub_1' : null,
    })),
  };
}

function workspaceProps(overrides: Record<string, unknown> = {}) {
  return {
    project: sampleProject(),
    selectedChapterId: 'ch_a' as string | null,
    selectedBlockId: null as string | null,
    onSelectChapter: vi.fn(),
    onSelectBlock: vi.fn(),
    onMoveChapter: vi.fn(),
    onUpdateChapter: vi.fn(),
    onDeleteChapter: vi.fn(),
    onMoveBlock: vi.fn(),
    onCloneBlock: vi.fn(),
    onDeleteBlock: vi.fn(),
    onSetSettingSequence: vi.fn(),
    defaultOpen: true,
    ...overrides,
  };
}

describe('chapter and timeline rendering', () => {
  it('keeps chapter workspace collapsed by default and expands on demand', async () => {
    const user = userEvent.setup();
    withDnd(<ChapterWorkspace {...workspaceProps({ defaultOpen: false })} />);
    expect(screen.queryByLabelText('Continuity summary')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Chapter workspace' }));
    expect(screen.getAllByLabelText('Continuity summary')[0]).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Collapse Chapter workspace' }));
    expect(screen.queryByLabelText('Continuity summary')).not.toBeInTheDocument();
  });

  it('renders chapters in order and shows cross-chapter links', () => {
    const onMoveChapter = vi.fn();
    withDnd(<ChapterWorkspace {...workspaceProps({ onMoveChapter })} />);

    const titleInputs = screen.getAllByLabelText('Title');
    expect(titleInputs[0]).toHaveValue('Arrival');
    expect(titleInputs[1]).toHaveValue('Departure');
    expect(screen.getByText(/Linked to Mara/)).toBeInTheDocument();
  });

  it('reorders a chapter via accessible controls', async () => {
    const user = userEvent.setup();
    const onMoveChapter = vi.fn();
    withDnd(<ChapterWorkspace {...workspaceProps({ onMoveChapter })} />);
    await user.click(screen.getByLabelText('Move Arrival right'));
    expect(onMoveChapter).toHaveBeenCalledWith('ch_a', 1);
  });

  it('moves a block with the destination selector', async () => {
    const user = userEvent.setup();
    const onMoveBlock = vi.fn();
    withDnd(<ChapterWorkspace {...workspaceProps({ onMoveBlock })} />);
    await user.selectOptions(screen.getByLabelText('Move Harbor to chapter'), 'ch_b');
    expect(onMoveBlock).toHaveBeenCalledWith('blk_setting', 'ch_b');
  });

  it('clones a block with the clone selector', async () => {
    const user = userEvent.setup();
    const onCloneBlock = vi.fn();
    withDnd(<ChapterWorkspace {...workspaceProps({ onCloneBlock })} />);
    await user.selectOptions(screen.getByLabelText('Clone Harbor to chapter'), 'ch_b');
    expect(onCloneBlock).toHaveBeenCalledWith('blk_setting', 'ch_b');
  });

  it('deletes a block from the chapter panel', async () => {
    const user = userEvent.setup();
    const onDeleteBlock = vi.fn();
    withDnd(<ChapterWorkspace {...workspaceProps({ onDeleteBlock })} />);
    await user.click(screen.getByRole('button', { name: 'Delete Harbor' }));
    expect(onDeleteBlock).toHaveBeenCalledWith('blk_setting');
  });

  it('sets setting sequence within a chapter', () => {
    const onSetSettingSequence = vi.fn();
    const project = sampleProject();
    project.chapters[0]!.block_ids = ['blk_setting', 'blk_setting_b'];
    project.blocks.blk_setting_b = {
      id: 'blk_setting_b',
      block_type: 'setting',
      title: 'Quay',
      time_of_day: 'dusk',
      environment_state: 'dry',
      description: '',
      micro_settings: [],
      juxtaposition: '',
      color_variant: 1,
      character_ids: [],
    };
    withDnd(
      <ChapterWorkspace {...workspaceProps({ project, onSetSettingSequence })} />,
    );
    const sequence = screen.getByLabelText('Setting sequence for Harbor');
    fireEvent.change(sequence, { target: { value: '2' } });
    expect(onSetSettingSequence).toHaveBeenCalledWith('ch_a', 'blk_setting', 2);
  });
});

describe('timeline and block editor', () => {
  it('renders gantt rows and paints coverage on empty track', async () => {
    const user = userEvent.setup();
    const onPaintCoverage = vi.fn();
    const onAddSlots = vi.fn();
    const onSelectSubplot = vi.fn();
    render(
      <Timeline
        project={sampleProject()}
        selectedChapterId="ch_a"
        selectedSubplotId={null}
        onSelectChapter={vi.fn()}
        onSelectSubplot={onSelectSubplot}
        onAddSlots={onAddSlots}
        onRenameSlot={vi.fn()}
        onPaintCoverage={onPaintCoverage}
      />,
    );
    expect(screen.getByText(/10 \/ 100 rows/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Debt')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Debt from Arrival to Departure' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Blocks in Arrival')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Setting: Harbor' })).toHaveAttribute(
      'data-shade',
      '0',
    );
    await user.click(screen.getByRole('button', { name: 'Add row' }));
    expect(onAddSlots).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Open subplot row 1' }));
    expect(onSelectSubplot).toHaveBeenCalledWith('sub_1');

    const emptyTrack = screen.getByRole('group', { name: 'Row 2 coverage' });
    emptyTrack.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 40,
        right: 200,
        width: 200,
        height: 40,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    await user.pointer([
      { keys: '[MouseLeft>]', target: emptyTrack, coords: { clientX: 150, clientY: 20 } },
      { keys: '[/MouseLeft]', coords: { clientX: 150, clientY: 20 } },
    ]);
    expect(onPaintCoverage).toHaveBeenCalled();
    expect(onPaintCoverage.mock.calls[0]?.[0]).toBe('slot_1');
    expect(onPaintCoverage.mock.calls[0]?.[1]).toEqual(['ch_b']);
  });

  it('moves a subplot bar across chapters in real time', () => {
    const onPaintCoverage = vi.fn();
    const project = sampleProject();
    project.subplots[0]!.chapter_ids = ['ch_a'];
    project.chapters[0]!.subplot_ids = ['sub_1'];
    project.chapters[1]!.subplot_ids = [];
    render(
      <Timeline
        project={project}
        selectedChapterId="ch_a"
        selectedSubplotId={null}
        onSelectChapter={vi.fn()}
        onSelectSubplot={vi.fn()}
        onAddSlots={vi.fn()}
        onRenameSlot={vi.fn()}
        onPaintCoverage={onPaintCoverage}
      />,
    );
    const track = screen.getByRole('group', { name: 'Debt coverage' });
    track.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 40,
        right: 200,
        width: 200,
        height: 40,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    const bar = screen.getByRole('button', { name: 'Debt from Arrival to Arrival' });
    fireEvent.pointerDown(bar, { clientX: 40, clientY: 20, button: 0, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 160, clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(track, { clientX: 160, clientY: 20, pointerId: 1 });
    expect(onPaintCoverage).toHaveBeenCalledWith('slot_0', ['ch_b']);
  });

  it('disables add row at 100 slots', () => {
    const project = sampleProject();
    project.timeline_slots = Array.from({ length: 100 }, (_, index) => ({
      id: `slot_${index}`,
      name: '',
      subplot_id: null,
    }));
    render(
      <Timeline
        project={project}
        selectedChapterId="ch_a"
        selectedSubplotId={null}
        onSelectChapter={vi.fn()}
        onSelectSubplot={vi.fn()}
        onAddSlots={vi.fn()}
        onRenameSlot={vi.fn()}
        onPaintCoverage={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add row' })).toBeDisabled();
  });

  it('edits structured setting fields and preserves template labels', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const project = sampleProject();
    const block = project.blocks.blk_setting;
    render(
      <BlockEditor
        block={block}
        project={project}
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
    await user.click(screen.getByLabelText('Mara'));
    await user.click(screen.getByRole('button', { name: 'Save block' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Quay',
        micro_settings: ['crane', 'net'],
        character_ids: ['blk_character'],
      }),
    );
  });

  it('keeps cloned setting shade on the timeline chip', () => {
    const onSelectBlock = vi.fn();
    const project = sampleProject();
    project.chapters[0]!.block_ids = ['blk_setting', 'blk_setting_clone'];
    project.blocks.blk_setting_clone = {
      ...(project.blocks.blk_setting as SettingBlock),
      id: 'blk_setting_clone',
      title: 'Harbor (return)',
      color_variant: 0,
    };
    project.blocks.blk_setting_b = {
      id: 'blk_setting_b',
      block_type: 'setting',
      title: 'Quay',
      time_of_day: 'dusk',
      environment_state: 'dry',
      description: '',
      micro_settings: [],
      juxtaposition: '',
      color_variant: 1,
      character_ids: [],
    };
    project.chapters[0]!.block_ids.push('blk_setting_b');
    render(
      <Timeline
        project={project}
        selectedChapterId="ch_a"
        selectedSubplotId={null}
        selectedBlockId="blk_setting_clone"
        onSelectChapter={vi.fn()}
        onSelectSubplot={vi.fn()}
        onSelectBlock={onSelectBlock}
        onAddSlots={vi.fn()}
        onRenameSlot={vi.fn()}
        onPaintCoverage={vi.fn()}
      />,
    );
    const original = screen.getByRole('button', { name: 'Setting: Harbor' });
    const clone = screen.getByRole('button', { name: 'Setting: Harbor (return)' });
    const next = screen.getByRole('button', { name: 'Setting: Quay' });
    expect(original).toHaveAttribute('data-shade', '0');
    expect(clone).toHaveAttribute('data-shade', '0');
    expect(next).toHaveAttribute('data-shade', '1');
    expect(clone.className).toContain('selected');
  });

  it('saves dialogue script lines with speech mode and overheard', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const project = sampleProject();
    project.chapters[0]!.block_ids = ['blk_setting', 'blk_character', 'blk_dialogue'];
    project.chapters[1]!.block_ids = [];
    project.blocks.blk_dialogue = {
      id: 'blk_dialogue',
      block_type: 'dialogue',
      title: 'Aside',
      lines: [
        {
          character_id: 'blk_character',
          character_label: 'Mara',
          emotional_state: 'tense',
          volume: 'whisper',
          conversation: 'Stay back',
          subtext: '',
          action: '',
          fourth_wall: false,
          internal_monologue: false,
          overheard: false,
        },
      ],
      template_source_id: null,
    };
    render(
      <BlockEditor
        block={project.blocks.blk_dialogue}
        project={project}
        onSave={onSave}
        onClose={vi.fn()}
        onStartLink={vi.fn()}
        onDelete={vi.fn()}
        linkHint={null}
      />,
    );
    expect(screen.getByLabelText('Character for line 1')).toHaveValue('blk_character');
    await user.click(screen.getByLabelText(/Internal monologue/i));
    await user.click(screen.getByLabelText('Overheard for line 1'));
    await user.clear(screen.getByLabelText('Action for line 1'));
    await user.type(screen.getByLabelText('Action for line 1'), 'jaw tick');
    await user.click(screen.getByRole('button', { name: 'Add line' }));
    expect(screen.getByLabelText('Conversation for line 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save block' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            character_id: 'blk_character',
            conversation: 'Stay back',
            action: 'jaw tick',
            internal_monologue: true,
            overheard: true,
          }),
        ],
      }),
    );
  });
});

describe('subplot panel phases', () => {
  it('renders default phases and adds another', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onAddPhase = vi.fn();
    const subplot = sampleProject().subplots[0];
    render(
      <SubplotPanel
        subplot={subplot}
        onClose={vi.fn()}
        onSave={onSave}
        onAddPhase={onAddPhase}
      />,
    );
    expect(screen.getByLabelText('Phase 1 description')).toHaveValue('Owed favor');
    expect(screen.getByLabelText('Phase 2 description')).toBeInTheDocument();
    expect(screen.getByLabelText('Phase 3 description')).toBeInTheDocument();
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add phase' }));
    expect(onAddPhase).toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Phase 2 description'));
    await user.type(screen.getByLabelText('Phase 2 description'), 'Call in');
    await user.tab();
    expect(onSave).toHaveBeenCalledWith({
      phases: [{ id: 'ph_2', description: 'Call in' }],
    });
  });

  it('disables add phase at ten', () => {
    const subplot = {
      ...sampleProject().subplots[0],
      phases: Array.from({ length: 10 }, (_, index) => ({
        id: `ph_${index}`,
        description: '',
      })),
    };
    render(
      <SubplotPanel
        subplot={subplot}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onAddPhase={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add phase' })).toBeDisabled();
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
  });
});

describe('review panel', () => {
  it('lists soft warnings and navigates', async () => {
    const user = userEvent.setup();
    const onSelectBlock = vi.fn();
    render(
      <ReviewPanel
        warnings={[
          {
            code: 'duplicate_dialogue',
            message: 'Duplicate dialogue conversation found',
            chapter_id: null,
            block_id: 'blk_1',
          },
        ]}
        onClose={vi.fn()}
        onSelectChapter={vi.fn()}
        onSelectBlock={onSelectBlock}
      />,
    );
    expect(screen.getByText(/Duplicate dialogue/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open block' }));
    expect(onSelectBlock).toHaveBeenCalledWith('blk_1');
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
    withDnd(<ChapterWorkspace {...workspaceProps({ onUpdateChapter })} />);

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

  it('updates writing texture density within the shared 160 budget', async () => {
    const user = userEvent.setup();
    const onUpdateChapter = vi.fn();
    withDnd(<ChapterWorkspace {...workspaceProps({ onUpdateChapter })} />);

    expect(screen.getAllByText('Writing Texture')[0]).toBeInTheDocument();
    expect(screen.getAllByText('0 / 160')[0]).toBeInTheDocument();

    const ruleOfThree = screen.getByLabelText('Rule of Three for Arrival');
    await user.click(ruleOfThree);
    fireEvent.change(ruleOfThree, { target: { value: '40' } });
    expect(onUpdateChapter).toHaveBeenCalledWith(
      'ch_a',
      expect.objectContaining({
        writing_texture: expect.objectContaining({ rule_of_three: 40 }),
      }),
    );
  });
});
