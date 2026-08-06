import type { FormEvent } from 'react';
import { assertNever, type StoryBlock } from '../types';

interface BlockEditorProps {
  block: StoryBlock;
  onSave: (patch: Record<string, unknown>) => void;
  onClose: () => void;
  onStartLink: () => void;
  onDelete: () => void;
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
  onSave,
  onClose,
  onStartLink,
  onDelete,
  linkHint,
}: BlockEditorProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const patch = buildPatch(block, form);
    onSave(patch);
  }

  return (
    <aside className="block-editor" aria-label="Block editor">
      <header className="panel-header">
        <h2>Edit {block.block_type.replace('_', ' ')}</h2>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </header>
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Title
          <input name="title" defaultValue={block.title} />
        </label>
        {renderTypedFields(block)}
        <div className="button-row">
          <button type="submit">Save block</button>
          <button type="button" className="secondary" onClick={onStartLink}>
            Link to another block
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            Delete
          </button>
        </div>
        {linkHint ? <p className="hint">{linkHint}</p> : null}
      </form>
    </aside>
  );
}

function renderTypedFields(block: StoryBlock) {
  switch (block.block_type) {
    case 'setting':
      return (
        <>
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
        </>
      );
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
  const base = { title: get('title') };
  switch (block.block_type) {
    case 'setting':
      return {
        ...base,
        time_of_day: get('time_of_day'),
        environment_state: get('environment_state'),
        description: get('description'),
        micro_settings: listField(get('micro_settings')),
      };
    case 'character':
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
      };
    case 'dialogue':
      return {
        ...base,
        character: get('character'),
        emotional_state: get('emotional_state'),
        volume: get('volume'),
        conversation: get('conversation'),
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
