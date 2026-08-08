import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BLOCK_TYPE_LABELS,
  EMPTY_WRITING_TEXTURE,
  PACING_DEVICES,
  POINT_OF_VIEWS,
  SUSPENSE_MECHANISMS,
  TIMESCALES,
  WRITING_TEXTURE_BUDGET,
  WRITING_TEXTURE_TECHNIQUES,
  orderedChapters,
  writingTextureTotal,
  type Chapter,
  type NarrativePointOfView,
  type PacingDevice,
  type StoryBlock,
  type StoryProject,
  type SuspenseMechanism,
  type Timescale,
  type WritingTexture,
  type WritingTextureTechnique,
} from '../types';
import {
  settingSequenceInChapter,
} from '../chapterBlocks';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

interface ChapterWorkspaceProps {
  project: StoryProject;
  selectedChapterId: string | null;
  selectedBlockId: string | null;
  onSelectChapter: (chapterId: string) => void;
  onSelectBlock: (blockId: string) => void;
  onMoveChapter: (chapterId: string, direction: -1 | 1) => void;
  onUpdateChapter: (chapterId: string, patch: Record<string, unknown>) => void;
  onDeleteChapter: (chapterId: string) => void;
  onMoveBlock: (blockId: string, targetChapterId: string) => void;
  onCloneBlock: (blockId: string, targetChapterId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onSetSettingSequence: (chapterId: string, blockId: string, sequence: number) => void;
  defaultOpen?: boolean;
}

export function ChapterWorkspace({
  project,
  selectedChapterId,
  selectedBlockId,
  onSelectChapter,
  onSelectBlock,
  onMoveChapter,
  onUpdateChapter,
  onDeleteChapter,
  onMoveBlock,
  onCloneBlock,
  onDeleteBlock,
  onSetSettingSequence,
  defaultOpen = false,
}: ChapterWorkspaceProps) {
  const chapters = orderedChapters(project);
  const { open, toggle } = useCollapsiblePanel(defaultOpen);

  return (
    <section
      className={`workspace${open ? '' : ' panel-collapsed'}`}
      aria-label="Chapter workspace"
    >
      <CollapsiblePanelHeader title="Chapter workspace" open={open} onToggle={toggle} />
      {open ? (
        chapters.length === 0 ? (
          <p className="empty">Create a chapter to place story blocks.</p>
        ) : (
          <div className="chapter-columns">
            {chapters.map((chapter, index) => (
              <ChapterColumn
                key={chapter.id}
                chapter={chapter}
                index={index}
                total={chapters.length}
                blocks={chapter.block_ids
                  .map((id) => project.blocks[id])
                  .filter((block): block is StoryBlock => Boolean(block))}
                links={project.block_links}
                allBlocks={project.blocks}
                selected={selectedChapterId === chapter.id}
                selectedBlockId={selectedBlockId}
                chapters={chapters}
                onSelectChapter={onSelectChapter}
                onSelectBlock={onSelectBlock}
                onMoveChapter={onMoveChapter}
                onUpdateChapter={onUpdateChapter}
                onDeleteChapter={onDeleteChapter}
                onMoveBlock={onMoveBlock}
                onCloneBlock={onCloneBlock}
                onDeleteBlock={onDeleteBlock}
                onSetSettingSequence={onSetSettingSequence}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

function ChapterColumn({
  chapter,
  index,
  total,
  blocks,
  links,
  allBlocks,
  selected,
  selectedBlockId,
  chapters,
  onSelectChapter,
  onSelectBlock,
  onMoveChapter,
  onUpdateChapter,
  onDeleteChapter,
  onMoveBlock,
  onCloneBlock,
  onDeleteBlock,
  onSetSettingSequence,
}: {
  chapter: Chapter;
  index: number;
  total: number;
  blocks: StoryBlock[];
  links: StoryProject['block_links'];
  allBlocks: StoryProject['blocks'];
  selected: boolean;
  selectedBlockId: string | null;
  chapters: Chapter[];
  onSelectChapter: (chapterId: string) => void;
  onSelectBlock: (blockId: string) => void;
  onMoveChapter: (chapterId: string, direction: -1 | 1) => void;
  onUpdateChapter: (chapterId: string, patch: Record<string, unknown>) => void;
  onDeleteChapter: (chapterId: string) => void;
  onMoveBlock: (blockId: string, targetChapterId: string) => void;
  onCloneBlock: (blockId: string, targetChapterId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onSetSettingSequence: (chapterId: string, blockId: string, sequence: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `chapter:${chapter.id}`,
    data: { kind: 'chapter', chapterId: chapter.id },
  });

  return (
    <article
      ref={setNodeRef}
      className={`chapter-column${selected ? ' selected' : ''}${isOver ? ' drop-target' : ''}`}
      onClick={() => onSelectChapter(chapter.id)}
    >
      <div className="chapter-toolbar">
        <button
          type="button"
          className="ghost"
          disabled={index === 0}
          aria-label={`Move ${chapter.title} left`}
          onClick={(event) => {
            event.stopPropagation();
            onMoveChapter(chapter.id, -1);
          }}
        >
          ←
        </button>
        <button
          type="button"
          className="ghost"
          disabled={index === total - 1}
          aria-label={`Move ${chapter.title} right`}
          onClick={(event) => {
            event.stopPropagation();
            onMoveChapter(chapter.id, 1);
          }}
        >
          →
        </button>
        <button
          type="button"
          className="danger ghost"
          aria-label={`Delete ${chapter.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteChapter(chapter.id);
          }}
        >
          Delete
        </button>
      </div>

      <label>
        Title
        <input
          defaultValue={chapter.title}
          key={`${chapter.id}-title-${chapter.title}`}
          onBlur={(event) => {
            if (event.target.value !== chapter.title) {
              onUpdateChapter(chapter.id, { title: event.target.value });
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </label>
      <label>
        Subtitle
        <input
          defaultValue={chapter.subtitle ?? ''}
          key={`${chapter.id}-subtitle-${chapter.subtitle ?? ''}`}
          onBlur={(event) => {
            const next = event.target.value || null;
            if (next !== chapter.subtitle) {
              onUpdateChapter(chapter.id, { subtitle: next });
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </label>
      <label>
        Description
        <textarea
          defaultValue={chapter.description}
          key={`${chapter.id}-description-${chapter.description}`}
          rows={2}
          onBlur={(event) => {
            if (event.target.value !== chapter.description) {
              onUpdateChapter(chapter.id, { description: event.target.value });
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </label>
      <label>
        Timescale
        <select
          value={chapter.timescale}
          onChange={(event) =>
            onUpdateChapter(chapter.id, { timescale: event.target.value as Timescale })
          }
          onClick={(event) => event.stopPropagation()}
        >
          {TIMESCALES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        POV override
        <select
          aria-label={`POV override for ${chapter.title}`}
          value={chapter.point_of_view_override ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            onUpdateChapter(chapter.id, {
              point_of_view_override: value ? (value as NarrativePointOfView) : null,
            });
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <option value="">Use project default</option>
          {POINT_OF_VIEWS.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </label>
      <fieldset
        className="multi-select"
        onClick={(event) => event.stopPropagation()}
      >
        <legend>Pacing devices</legend>
        {PACING_DEVICES.map((device) => {
          const checked = (chapter.pacing_devices ?? []).includes(device.value);
          return (
            <label key={device.value} className="checkbox-row">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const current = chapter.pacing_devices ?? [];
                  const next = checked
                    ? current.filter((item) => item !== device.value)
                    : [...current, device.value];
                  onUpdateChapter(chapter.id, { pacing_devices: next as PacingDevice[] });
                }}
              />
              {device.label}
            </label>
          );
        })}
        <label>
          Custom pacing device
          <input
            aria-label={`Custom pacing for ${chapter.title}`}
            placeholder="Add custom and press Enter"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const value = event.currentTarget.value.trim();
              if (!value) return;
              const current = chapter.pacing_devices_custom ?? [];
              if (current.includes(value)) return;
              onUpdateChapter(chapter.id, { pacing_devices_custom: [...current, value] });
              event.currentTarget.value = '';
            }}
          />
        </label>
        {(chapter.pacing_devices_custom ?? []).length > 0 ? (
          <ul className="chip-list">
            {(chapter.pacing_devices_custom ?? []).map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    onUpdateChapter(chapter.id, {
                      pacing_devices_custom: (chapter.pacing_devices_custom ?? []).filter(
                        (entry) => entry !== item,
                      ),
                    })
                  }
                >
                  {item} ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>
      {(chapter.pacing_devices ?? []).includes('syntactic_pacing') ? (
        <label>
          Syntactic pacing notes
          <input
            aria-label={`Syntactic pacing notes for ${chapter.title}`}
            defaultValue={chapter.syntactic_pacing_notes ?? ''}
            key={`${chapter.id}-syn-${chapter.syntactic_pacing_notes ?? ''}`}
            onBlur={(event) => {
              if (event.target.value !== (chapter.syntactic_pacing_notes ?? '')) {
                onUpdateChapter(chapter.id, { syntactic_pacing_notes: event.target.value });
              }
            }}
            onClick={(event) => event.stopPropagation()}
          />
        </label>
      ) : null}
      <fieldset
        className="multi-select"
        onClick={(event) => event.stopPropagation()}
      >
        <legend>Suspense mechanisms</legend>
        {SUSPENSE_MECHANISMS.map((device) => {
          const checked = (chapter.suspense_mechanisms ?? []).includes(device.value);
          return (
            <label key={device.value} className="checkbox-row">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const current = chapter.suspense_mechanisms ?? [];
                  const next = checked
                    ? current.filter((item) => item !== device.value)
                    : [...current, device.value];
                  onUpdateChapter(chapter.id, {
                    suspense_mechanisms: next as SuspenseMechanism[],
                  });
                }}
              />
              {device.label}
            </label>
          );
        })}
        <label>
          Custom suspense
          <input
            aria-label={`Custom suspense for ${chapter.title}`}
            placeholder="Add custom mechanism and press Enter"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const value = event.currentTarget.value.trim();
              if (!value) return;
              const current = chapter.suspense_custom ?? [];
              if (current.includes(value)) return;
              onUpdateChapter(chapter.id, { suspense_custom: [...current, value] });
              event.currentTarget.value = '';
            }}
          />
        </label>
        {(chapter.suspense_custom ?? []).length > 0 ? (
          <ul className="chip-list">
            {(chapter.suspense_custom ?? []).map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    onUpdateChapter(chapter.id, {
                      suspense_custom: (chapter.suspense_custom ?? []).filter(
                        (entry) => entry !== item,
                      ),
                    })
                  }
                >
                  {item} ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>
      <WritingTexturePanel chapter={chapter} onUpdateChapter={onUpdateChapter} />
      <label>
        Continuity summary
        <textarea
          defaultValue={chapter.continuity_summary}
          key={`${chapter.id}-continuity-${chapter.continuity_summary}`}
          rows={3}
          onBlur={(event) => {
            if (event.target.value !== chapter.continuity_summary) {
              onUpdateChapter(chapter.id, { continuity_summary: event.target.value });
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </label>
      <label>
        Draft prose
        <textarea
          defaultValue={chapter.draft_prose}
          key={`${chapter.id}-draft-${chapter.draft_prose}`}
          rows={5}
          onBlur={(event) => {
            if (event.target.value !== chapter.draft_prose) {
              onUpdateChapter(chapter.id, { draft_prose: event.target.value });
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </label>

      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <ul className="block-list">
          {blocks.map((block) => (
            <SortableBlockCard
              key={block.id}
              block={block}
              selected={selectedBlockId === block.id}
              links={links}
              allBlocks={allBlocks}
              chapters={chapters}
              currentChapterId={chapter.id}
              chapter={chapter}
              onSelect={onSelectBlock}
              onMoveBlock={onMoveBlock}
              onCloneBlock={onCloneBlock}
              onDeleteBlock={onDeleteBlock}
              onSetSettingSequence={onSetSettingSequence}
            />
          ))}
        </ul>
      </SortableContext>
    </article>
  );
}

function SortableBlockCard({
  block,
  selected,
  links,
  allBlocks,
  chapters,
  currentChapterId,
  chapter,
  onSelect,
  onMoveBlock,
  onCloneBlock,
  onDeleteBlock,
  onSetSettingSequence,
}: {
  block: StoryBlock;
  selected: boolean;
  links: StoryProject['block_links'];
  allBlocks: StoryProject['blocks'];
  chapters: Chapter[];
  currentChapterId: string;
  chapter: Chapter;
  onSelect: (blockId: string) => void;
  onMoveBlock: (blockId: string, targetChapterId: string) => void;
  onCloneBlock: (blockId: string, targetChapterId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onSetSettingSequence: (chapterId: string, blockId: string, sequence: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { kind: 'block', blockId: block.id, chapterId: currentChapterId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const related = links.filter(
    (link) => link.source_block_id === block.id || link.target_block_id === block.id,
  );
  const settingSequence =
    block.block_type === 'setting'
      ? settingSequenceInChapter(chapter, allBlocks, block.id)
      : 0;
  const settingCount =
    block.block_type === 'setting'
      ? chapter.block_ids.filter((id) => allBlocks[id]?.block_type === 'setting').length
      : 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`block-card${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <button
        type="button"
        className="block-select"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(block.id);
        }}
      >
        <span className="muted">{BLOCK_TYPE_LABELS[block.block_type]}</span>
        <strong>{block.title || 'Untitled'}</strong>
      </button>
      {block.block_type === 'setting' ? (
        <label className="setting-sequence" onClick={(event) => event.stopPropagation()}>
          Sequence
          <input
            type="number"
            min={1}
            max={Math.max(settingCount, 1)}
            value={settingSequence || 1}
            aria-label={`Setting sequence for ${block.title || 'Untitled'}`}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onSetSettingSequence(chapter.id, block.id, next);
            }}
          />
        </label>
      ) : null}
      <div className="block-actions">
        <button type="button" className="ghost handle" {...attributes} {...listeners}>
          Drag
        </button>
        <label className="move-select">
          Move to
          <select
            aria-label={`Move ${block.title} to chapter`}
            value={currentChapterId}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const target = event.target.value;
              if (target !== currentChapterId) {
                onMoveBlock(block.id, target);
              }
            }}
          >
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="move-select">
          Clone to
          <select
            aria-label={`Clone ${block.title} to chapter`}
            defaultValue=""
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const target = event.target.value;
              if (target) {
                onCloneBlock(block.id, target);
                event.target.value = '';
              }
            }}
          >
            <option value="" disabled>
              Choose chapter…
            </option>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="danger"
          aria-label={`Delete ${block.title || 'block'}`}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteBlock(block.id);
          }}
        >
          Delete
        </button>
      </div>
      {related.length > 0 ? (
        <ul className="link-list">
          {related.map((link) => {
            const otherId =
              link.source_block_id === block.id
                ? link.target_block_id
                : link.source_block_id;
            const other = allBlocks[otherId];
            return (
              <li key={link.id}>
                Linked to {other?.title ?? otherId}
                {link.description ? ` — ${link.description}` : ''}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function WritingTexturePanel({
  chapter,
  onUpdateChapter,
}: {
  chapter: Chapter;
  onUpdateChapter: (chapterId: string, patch: Record<string, unknown>) => void;
}) {
  const texture: WritingTexture = {
    ...EMPTY_WRITING_TEXTURE,
    ...(chapter.writing_texture ?? {}),
  };
  const used = writingTextureTotal(texture);
  const remaining = WRITING_TEXTURE_BUDGET - used;

  function setTechnique(technique: WritingTextureTechnique, rawValue: number) {
    const current = texture[technique] ?? 0;
    const capped = Math.max(0, Math.min(WRITING_TEXTURE_BUDGET, Math.round(rawValue)));
    const maxAllowed = current + remaining;
    const nextValue = Math.min(capped, maxAllowed);
    if (nextValue === current) return;
    onUpdateChapter(chapter.id, {
      writing_texture: { ...texture, [technique]: nextValue },
    });
  }

  return (
    <fieldset
      className="multi-select writing-texture"
      onClick={(event) => event.stopPropagation()}
    >
      <legend>Writing Texture</legend>
      <p className="writing-texture-lede">
        Density of advanced emotional-impact techniques for a ~3000–4000 word chapter.
        Assign up to {WRITING_TEXTURE_BUDGET} points total to constrain later prose agents.
      </p>
      <div
        className={`writing-texture-budget${remaining === 0 ? ' spent' : ''}`}
        aria-live="polite"
      >
        <strong>
          {used} / {WRITING_TEXTURE_BUDGET}
        </strong>
        <span className="muted">
          {remaining === 0 ? 'budget fully assigned' : `${remaining} points remaining`}
        </span>
        <div
          className="writing-texture-meter"
          role="presentation"
          style={{ ['--texture-used' as string]: `${(used / WRITING_TEXTURE_BUDGET) * 100}%` }}
        />
      </div>
      {WRITING_TEXTURE_TECHNIQUES.map((technique) => {
        const value = texture[technique.value] ?? 0;
        const maxForSlider = Math.min(WRITING_TEXTURE_BUDGET, value + remaining);
        return (
          <label key={technique.value} className="texture-scale-row">
            <span className="texture-scale-label">{technique.label}</span>
            <input
              type="range"
              min={0}
              max={maxForSlider}
              step={1}
              value={value}
              aria-label={`${technique.label} for ${chapter.title}`}
              aria-valuemin={0}
              aria-valuemax={maxForSlider}
              aria-valuenow={value}
              onChange={(event) => setTechnique(technique.value, Number(event.target.value))}
            />
            <input
              type="number"
              className="texture-scale-value"
              min={0}
              max={maxForSlider}
              step={1}
              value={value}
              aria-label={`${technique.label} value for ${chapter.title}`}
              onChange={(event) => setTechnique(technique.value, Number(event.target.value))}
            />
          </label>
        );
      })}
    </fieldset>
  );
}
