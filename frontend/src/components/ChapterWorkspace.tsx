import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BLOCK_TYPE_LABELS,
  TIMESCALES,
  orderedChapters,
  type Chapter,
  type StoryBlock,
  type StoryProject,
  type Timescale,
} from '../types';

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
}: ChapterWorkspaceProps) {
  const chapters = orderedChapters(project);

  return (
    <section className="workspace" aria-label="Chapter workspace">
      <header className="panel-header">
        <h2>Chapter workspace</h2>
      </header>
      {chapters.length === 0 ? (
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
            />
          ))}
        </div>
      )}
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
              onSelect={onSelectBlock}
              onMoveBlock={onMoveBlock}
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
  onSelect,
  onMoveBlock,
}: {
  block: StoryBlock;
  selected: boolean;
  links: StoryProject['block_links'];
  allBlocks: StoryProject['blocks'];
  chapters: Chapter[];
  currentChapterId: string;
  onSelect: (blockId: string) => void;
  onMoveBlock: (blockId: string, targetChapterId: string) => void;
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
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </label>
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
