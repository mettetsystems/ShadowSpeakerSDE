import type { FormEvent } from 'react';
import {
  FIGURATIVE_DEVICES,
  assertNever,
  type FigurativeDevice,
  type StoryBlock,
  type StoryProject,
} from '../types';
import {
  findChapterForBlock,
  settingIdsInChapter,
  settingSequenceInChapter,
} from '../chapterBlocks';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

interface BlockEditorProps {
  block: StoryBlock;
  project: StoryProject;
  onSave: (patch: Record<string, unknown>) => void;
  onClose: () => void;
  onStartLink: () => void;
  onDelete: () => void;
  onSaveAsTemplate?: () => void;
  onSetSettingSequence?: (blockId: string, sequence: number) => void;
  linkHint: string | null;
}

function listField(value: string): string[] {
  return value
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function BlockEditor({
  block,
  project,
  onSave,
  onClose,
  onStartLink,
  onDelete,
  onSaveAsTemplate,
  onSetSettingSequence,
  linkHint,
}: BlockEditorProps) {
  const title = `Edit ${block.block_type.replace('_', ' ')}`;
  const { open, toggle } = useCollapsiblePanel(true);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const patch = buildPatch(block, form);
    onSave(patch);
  }

  return (
    <aside
      className={`block-editor${open ? '' : ' panel-collapsed'}`}
      aria-label="Block editor"
    >
      <CollapsiblePanelHeader
        title={title}
        open={open}
        onToggle={toggle}
        showActionsWhenCollapsed
        actions={
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        }
      />
      {open ? (
        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Title
            <input name="title" defaultValue={block.title} aria-label="Title" />
          </label>
          {renderTypedFields(block, project, onSetSettingSequence)}
          <div className="button-row">
            <button type="submit">Save block</button>
            {block.block_type === 'dialogue' && onSaveAsTemplate ? (
              <button type="button" className="secondary" onClick={onSaveAsTemplate}>
                Save as template
              </button>
            ) : null}
            <button type="button" className="secondary" onClick={onStartLink}>
              Link to another block
            </button>
            <button type="button" className="danger" onClick={onDelete}>
              Delete
            </button>
          </div>
          {linkHint ? <p className="hint">{linkHint}</p> : null}
        </form>
      ) : null}
    </aside>
  );
}

function foilOptions(project: StoryProject, excludeId: string) {
  return Object.values(project.blocks).filter(
    (item) =>
      item.id !== excludeId && (item.block_type === 'character' || item.block_type === 'group'),
  );
}

function characterOptions(project: StoryProject) {
  return Object.values(project.blocks).filter((item) => item.block_type === 'character');
}

function renderTypedFields(
  block: StoryBlock,
  project: StoryProject,
  onSetSettingSequence?: (blockId: string, sequence: number) => void,
) {
  switch (block.block_type) {
    case 'setting': {
      const chapter = findChapterForBlock(project, block.id);
      const sequence = chapter
        ? settingSequenceInChapter(chapter, project.blocks, block.id)
        : 0;
      const settingCount = chapter
        ? settingIdsInChapter(chapter, project.blocks).length
        : 0;
      return (
        <>
          {chapter && onSetSettingSequence ? (
            <label>
              Sequence in chapter
              <input
                type="number"
                min={1}
                max={Math.max(settingCount, 1)}
                defaultValue={sequence || 1}
                key={`seq-${block.id}-${sequence}`}
                aria-label="Setting sequence in chapter"
                onBlur={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next) || next === sequence) return;
                  onSetSettingSequence(block.id, next);
                }}
              />
            </label>
          ) : null}
          <label>
            Time of day
            <input name="time_of_day" defaultValue={block.time_of_day} />
          </label>
          <label>
            Environment state
            <input name="environment_state" defaultValue={block.environment_state} />
          </label>
          <label>
            Description
            <textarea name="description" defaultValue={block.description} rows={3} />
          </label>
          <label>
            Micro-settings (one per line)
            <textarea
              name="micro_settings"
              defaultValue={block.micro_settings.join('\n')}
              rows={3}
            />
          </label>
          <label>
            Juxtaposition (optional)
            <textarea name="juxtaposition" defaultValue={block.juxtaposition ?? ''} rows={2} />
          </label>
        </>
      );
    }
    case 'character':
      return (
        <>
          <label>
            Attire
            <input name="attire" defaultValue={block.attire} />
          </label>
          <label>
            Appearance
            <textarea name="appearance" defaultValue={block.appearance} rows={2} />
          </label>
          <label>
            Smell
            <input name="smell" defaultValue={block.smell} />
          </label>
          <label>
            Personality
            <textarea name="personality" defaultValue={block.personality} rows={2} />
          </label>
          <label>
            Archetype
            <input name="archetype" defaultValue={block.archetype} />
          </label>
          <label>
            Aura
            <input name="aura" defaultValue={block.aura} />
          </label>
          <label>
            Special skillsets (one per line)
            <textarea
              name="special_skillsets"
              defaultValue={block.special_skillsets.join('\n')}
              rows={2}
            />
          </label>
          <label>
            Personalized items (one per line)
            <textarea
              name="personalized_items"
              defaultValue={block.personalized_items.join('\n')}
              rows={2}
            />
          </label>
          <label>
            Character foil
            <select
              name="character_foil_id"
              aria-label="Character foil"
              defaultValue={block.character_foil_id ?? ''}
            >
              <option value="">None</option>
              {foilOptions(project, block.id).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || item.id} ({item.block_type})
                </option>
              ))}
            </select>
          </label>
        </>
      );
    case 'dialogue':
      return (
        <>
          <label>
            Character
            <input name="character" defaultValue={block.character} />
          </label>
          <label>
            Emotional state
            <input name="emotional_state" defaultValue={block.emotional_state} />
          </label>
          <label>
            Volume
            <input name="volume" defaultValue={block.volume} />
          </label>
          <label>
            Conversation
            <textarea name="conversation" defaultValue={block.conversation} rows={4} />
          </label>
          <label>
            Subtext
            <textarea name="subtext" defaultValue={block.subtext ?? ''} rows={2} />
          </label>
          <fieldset className="multi-select dialogue-switches">
            <legend>Speech mode</legend>
            <label className="checkbox-row">
              <input
                type="radio"
                name="speech_mode"
                value="dialogue"
                defaultChecked={!block.internal_monologue}
                aria-label="True dialogue"
              />
              True dialogue
            </label>
            <label className="checkbox-row">
              <input
                type="radio"
                name="speech_mode"
                value="monologue"
                defaultChecked={Boolean(block.internal_monologue)}
                aria-label="Internal monologue"
              />
              Internal monologue
            </label>
          </fieldset>
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="overheard"
              defaultChecked={Boolean(block.overheard)}
              aria-label="Overheard"
            />
            Overheard
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="fourth_wall"
              defaultChecked={Boolean(block.fourth_wall)}
              aria-label="Fourth Wall"
            />
            Fourth Wall
          </label>
        </>
      );
    case 'group':
      return (
        <fieldset className="multi-select">
          <legend>Characters in group (optional)</legend>
          {characterOptions(project).map((item) => (
            <label key={item.id} className="checkbox-row">
              <input
                type="checkbox"
                name="character_ids"
                value={item.id}
                defaultChecked={(block.character_ids ?? []).includes(item.id)}
              />
              {item.title || item.id}
            </label>
          ))}
        </fieldset>
      );
    case 'prose_builder':
      return (
        <>
          <label>
            Subject
            <textarea
              name="subject"
              defaultValue={block.subject ?? ''}
              rows={3}
              aria-label="Prose subject"
            />
          </label>
          <fieldset className="multi-select">
            <legend>Figurative devices</legend>
            {FIGURATIVE_DEVICES.map((device) => (
              <label key={device.value} className="checkbox-row">
                <input
                  type="checkbox"
                  name="figurative_devices"
                  value={device.value}
                  defaultChecked={(block.figurative_devices ?? []).includes(device.value)}
                />
                {device.label}
              </label>
            ))}
            <label>
              Custom figurative devices (one per line)
              <textarea
                name="figurative_devices_custom"
                aria-label="Custom figurative devices"
                defaultValue={(block.figurative_devices_custom ?? []).join('\n')}
                rows={2}
              />
            </label>
          </fieldset>
        </>
      );
    case 'special_item':
      return (
        <>
          <label>
            Reaction
            <input name="reaction" defaultValue={block.reaction} />
          </label>
          <label>
            Significance
            <textarea name="significance" defaultValue={block.significance} rows={2} />
          </label>
          <label>
            What it does
            <textarea name="what_it_does" defaultValue={block.what_it_does} rows={2} />
          </label>
          <label>
            How it works
            <textarea name="how_it_works" defaultValue={block.how_it_works} rows={2} />
          </label>
          <label>
            Environmental effects
            <textarea
              name="environmental_effects"
              defaultValue={block.environmental_effects}
              rows={2}
            />
          </label>
        </>
      );
    case 'vehicle':
      return (
        <>
          <label>
            Behaviors (one per line)
            <textarea name="behaviors" defaultValue={block.behaviors.join('\n')} rows={2} />
          </label>
          <label>
            Movement
            <input name="movement" defaultValue={block.movement} />
          </label>
          <label>
            Scale
            <input name="scale" defaultValue={block.scale} />
          </label>
          <label>
            Scope
            <input name="scope" defaultValue={block.scope} />
          </label>
        </>
      );
    case 'tool':
      return (
        <>
          <label>
            Behaviors (one per line)
            <textarea name="behaviors" defaultValue={block.behaviors.join('\n')} rows={2} />
          </label>
          <label>
            Description
            <textarea name="description" defaultValue={block.description} rows={2} />
          </label>
          <label>
            Properties (one per line)
            <textarea name="properties" defaultValue={block.properties.join('\n')} rows={2} />
          </label>
        </>
      );
    default:
      return assertNever(block);
  }
}

function buildPatch(block: StoryBlock, form: FormData): Record<string, unknown> {
  const get = (name: string) => String(form.get(name) ?? '');
  const getAll = (name: string) => form.getAll(name).map(String);
  const base = { title: get('title') };
  switch (block.block_type) {
    case 'setting':
      return {
        ...base,
        time_of_day: get('time_of_day'),
        environment_state: get('environment_state'),
        description: get('description'),
        micro_settings: listField(get('micro_settings')),
        juxtaposition: get('juxtaposition'),
      };
    case 'character': {
      const foil = get('character_foil_id');
      return {
        ...base,
        attire: get('attire'),
        appearance: get('appearance'),
        smell: get('smell'),
        personality: get('personality'),
        archetype: get('archetype'),
        aura: get('aura'),
        special_skillsets: listField(get('special_skillsets')),
        personalized_items: listField(get('personalized_items')),
        character_foil_id: foil || null,
      };
    }
    case 'dialogue':
      return {
        ...base,
        character: get('character'),
        emotional_state: get('emotional_state'),
        volume: get('volume'),
        conversation: get('conversation'),
        subtext: get('subtext'),
        internal_monologue: get('speech_mode') === 'monologue',
        overheard: form.get('overheard') === 'on',
        fourth_wall: form.get('fourth_wall') === 'on',
      };
    case 'group':
      return {
        ...base,
        character_ids: getAll('character_ids'),
      };
    case 'prose_builder':
      return {
        ...base,
        subject: get('subject'),
        figurative_devices: getAll('figurative_devices') as FigurativeDevice[],
        figurative_devices_custom: listField(get('figurative_devices_custom')),
      };
    case 'special_item':
      return {
        ...base,
        reaction: get('reaction'),
        significance: get('significance'),
        what_it_does: get('what_it_does'),
        how_it_works: get('how_it_works'),
        environmental_effects: get('environmental_effects'),
      };
    case 'vehicle':
      return {
        ...base,
        behaviors: listField(get('behaviors')),
        movement: get('movement'),
        scale: get('scale'),
        scope: get('scope'),
      };
    case 'tool':
      return {
        ...base,
        behaviors: listField(get('behaviors')),
        description: get('description'),
        properties: listField(get('properties')),
      };
    default:
      return assertNever(block);
  }
}
