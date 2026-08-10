import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { StoryBlock, StoryProject, TimelineSlot } from '../types';
import { BLOCK_TYPE_LABELS, orderedChapters, settingShadeIndex } from '../types';
import { chapterBlocks } from '../chapterBlocks';
import {
  chapterIndexFromRatio,
  coveredToSegments,
  moveSegment,
  paintRange,
  punchGap,
  resizeSegment,
  segmentsToChapterIds,
  type Segment,
} from '../timelineSegments';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

const MAX_SLOTS = 100;

/** Mid shade for non-setting chips; settings use their stable color_variant. */
function timelineChipShade(block: StoryBlock): number {
  if (block.block_type === 'setting') {
    return settingShadeIndex(block.color_variant);
  }
  return 3;
}

interface TimelineProps {
  project: StoryProject;
  selectedChapterId: string | null;
  selectedSubplotId: string | null;
  selectedBlockId?: string | null;
  onSelectChapter: (chapterId: string) => void;
  onSelectSubplot: (subplotId: string | null) => void;
  onSelectBlock?: (blockId: string) => void;
  onMoveChapter?: (chapterId: string, direction: -1 | 1) => void;
  onAddSlots: (count?: number) => void;
  onRenameSlot: (slotId: string, name: string) => void;
  onPaintCoverage: (slotId: string, chapterIds: string[]) => void;
  defaultOpen?: boolean;
}

type DragState =
  | {
      kind: 'move';
      segmentIndex: number;
      originIndex: number;
      base: Segment[];
    }
  | {
      kind: 'resize';
      segmentIndex: number;
      edge: 'start' | 'end';
      base: Segment[];
    }
  | {
      kind: 'paint';
      mode: 'add' | 'remove';
      originIndex: number;
      baseCovered: Set<string>;
    };

export function Timeline({
  project,
  selectedChapterId,
  selectedSubplotId,
  selectedBlockId = null,
  onSelectChapter,
  onSelectSubplot,
  onSelectBlock,
  onMoveChapter,
  onAddSlots,
  onRenameSlot,
  onPaintCoverage,
  defaultOpen = true,
}: TimelineProps) {
  const chapters = orderedChapters(project);
  const slots = project.timeline_slots ?? [];
  const atCap = slots.length >= MAX_SLOTS;
  const chapterTemplate = `repeat(${Math.max(chapters.length, 1)}, minmax(7.5rem, 1fr))`;
  const { open, toggle } = useCollapsiblePanel(defaultOpen);

  return (
    <section
      className={`timeline${open ? '' : ' panel-collapsed'}`}
      aria-label="Story timeline"
    >
      <CollapsiblePanelHeader
        title="Timeline"
        open={open}
        onToggle={toggle}
        actions={
          <div className="timeline-toolbar">
            <span className="muted">
              {chapters.length} chapter{chapters.length === 1 ? '' : 's'} · {slots.length} /{' '}
              {MAX_SLOTS} rows · drag bars to move · handles to scale · Alt-click to gap · ← →
              reorder chapters
            </span>
            <button type="button" disabled={atCap} onClick={() => onAddSlots(1)}>
              Add row
            </button>
          </div>
        }
      />

      {open ? (
        chapters.length === 0 ? (
          <p className="empty">Add a chapter to begin the timeline.</p>
        ) : (
          <div className="timeline-scroll">
            <div className="timeline-gantt" style={{ ['--gantt-cols' as string]: chapterTemplate }}>
              <div className="timeline-corner" />
              <div className="gantt-chapters" role="row">
                {chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className={`timeline-chapter-cell${selectedChapterId === chapter.id ? ' selected' : ''}`}
                  >
                    <div className="timeline-chapter-reorder">
                      <button
                        type="button"
                        className="ghost"
                        disabled={!onMoveChapter || index === 0}
                        aria-label={`Move ${chapter.title} left`}
                        onClick={() => onMoveChapter?.(chapter.id, -1)}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={!onMoveChapter || index === chapters.length - 1}
                        aria-label={`Move ${chapter.title} right`}
                        onClick={() => onMoveChapter?.(chapter.id, 1)}
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`timeline-chapter${selectedChapterId === chapter.id ? ' selected' : ''}`}
                      onClick={() => onSelectChapter(chapter.id)}
                    >
                      <strong>{chapter.title}</strong>
                      {chapter.subtitle ? <span>{chapter.subtitle}</span> : null}
                    </button>
                    <ul className="timeline-chapter-blocks" aria-label={`Blocks in ${chapter.title}`}>
                      {chapterBlocks(chapter, project.blocks).length === 0 ? (
                        <li className="muted timeline-block-empty">No blocks</li>
                      ) : (
                        chapterBlocks(chapter, project.blocks).map((block) => {
                          const typeLabel = BLOCK_TYPE_LABELS[block.block_type];
                          const title = block.title || 'Untitled';
                          return (
                            <li key={block.id}>
                              <button
                                type="button"
                                className={`timeline-block-chip${selectedBlockId === block.id ? ' selected' : ''}`}
                                data-block-type={block.block_type}
                                data-shade={timelineChipShade(block)}
                                aria-label={`${typeLabel}: ${title}`}
                                title={`${typeLabel}: ${title}`}
                                onClick={() => onSelectBlock?.(block.id)}
                              >
                                <span className="timeline-chip-type">{typeLabel}</span>
                                <span className="timeline-chip-title">{title}</span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                ))}
              </div>

              {slots.map((slot, index) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  rowIndex={index + 1}
                  project={project}
                  chapters={chapters}
                  selected={Boolean(slot.subplot_id && slot.subplot_id === selectedSubplotId)}
                  selectedChapterId={selectedChapterId}
                  onRename={(name) => onRenameSlot(slot.id, name)}
                  onPaint={(chapterIds) => onPaintCoverage(slot.id, chapterIds)}
                  onSelectChapter={onSelectChapter}
                  onSelectSubplot={onSelectSubplot}
                />
              ))}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}

function SlotRow({
  slot,
  rowIndex,
  project,
  chapters,
  selected,
  selectedChapterId,
  onRename,
  onPaint,
  onSelectChapter,
  onSelectSubplot,
}: {
  slot: TimelineSlot;
  rowIndex: number;
  project: StoryProject;
  chapters: StoryProject['chapters'];
  selected: boolean;
  selectedChapterId: string | null;
  onRename: (name: string) => void;
  onPaint: (chapterIds: string[]) => void;
  onSelectChapter: (chapterId: string) => void;
  onSelectSubplot: (subplotId: string | null) => void;
}) {
  const subplot = slot.subplot_id
    ? project.subplots.find((item) => item.id === slot.subplot_id)
    : undefined;
  const orderedIds = chapters.map((chapter) => chapter.id);
  const covered = new Set(subplot?.chapter_ids ?? []);
  const coverageKey = (subplot?.chapter_ids ?? []).join(',');

  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<Set<string> | null>(null);
  const [previewCovered, setPreviewCovered] = useState<Set<string> | null>(null);
  const [interacting, setInteracting] = useState(false);
  const display = previewCovered ?? covered;
  const segments = coveredToSegments(display, orderedIds);
  const label = slot.name || subplot?.name || `Row ${rowIndex}`;

  function setPreview(next: Set<string> | null) {
    previewRef.current = next;
    setPreviewCovered(next);
  }

  function indexFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track || orderedIds.length === 0) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
    return chapterIndexFromRatio(ratio, orderedIds.length);
  }

  function applyDrag(clientX: number) {
    const state = dragRef.current;
    if (!state) return;
    const index = indexFromClientX(clientX);
    if (state.kind === 'move') {
      const delta = index - state.originIndex;
      const moved = moveSegment(state.base, state.segmentIndex, delta, orderedIds.length);
      setPreview(new Set(segmentsToChapterIds(moved, orderedIds)));
      return;
    }
    if (state.kind === 'resize') {
      const resized = resizeSegment(
        state.base,
        state.segmentIndex,
        state.edge,
        index,
        orderedIds.length,
      );
      setPreview(new Set(segmentsToChapterIds(resized, orderedIds)));
      return;
    }
    setPreview(paintRange(state.baseCovered, orderedIds, state.originIndex, index, state.mode));
  }

  function endDrag() {
    if (!dragRef.current) return;
    const next = previewRef.current;
    dragRef.current = null;
    setInteracting(false);
    if (next) {
      onPaint([...next]);
      setPreview(null);
    }
  }

  function capture(event: ReactPointerEvent<HTMLElement>) {
    const track = trackRef.current;
    if (track && typeof track.setPointerCapture === 'function') {
      track.setPointerCapture(event.pointerId);
    }
    setInteracting(true);
  }

  function commitCovered(next: Set<string>) {
    dragRef.current = null;
    setInteracting(false);
    onPaint([...next]);
    setPreview(null);
  }

  useEffect(() => {
    setPreview(null);
    dragRef.current = null;
    setInteracting(false);
  }, [coverageKey, chapters.length]);

  function beginMove(
    event: ReactPointerEvent<HTMLElement>,
    segmentIndex: number,
    baseSegments: Segment[],
  ) {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      kind: 'move',
      segmentIndex,
      originIndex: indexFromClientX(event.clientX),
      base: baseSegments.map((segment) => ({ ...segment })),
    };
    setPreview(new Set(segmentsToChapterIds(baseSegments, orderedIds)));
    capture(event);
  }

  function beginResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    segmentIndex: number,
    edge: 'start' | 'end',
    baseSegments: Segment[],
  ) {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      kind: 'resize',
      segmentIndex,
      edge,
      base: baseSegments.map((segment) => ({ ...segment })),
    };
    setPreview(new Set(segmentsToChapterIds(baseSegments, orderedIds)));
    capture(event);
  }

  function beginPaint(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.gantt-bar')) return;
    event.preventDefault();
    const originIndex = indexFromClientX(event.clientX);
    const chapterId = orderedIds[originIndex]!;
    const mode: 'add' | 'remove' = display.has(chapterId) ? 'remove' : 'add';
    const baseCovered = new Set(display);
    dragRef.current = { kind: 'paint', mode, originIndex, baseCovered };
    setPreview(paintRange(baseCovered, orderedIds, originIndex, originIndex, mode));
    capture(event);
  }

  return (
    <>
      <div
        className={`timeline-row-label slot-label${selected ? ' selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`Open subplot row ${rowIndex}`}
        aria-pressed={selected}
        onClick={() => {
          if (slot.subplot_id) onSelectSubplot(slot.subplot_id);
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && slot.subplot_id) {
            event.preventDefault();
            onSelectSubplot(slot.subplot_id);
          }
        }}
      >
        <span className="pill subplot">row {rowIndex}</span>
        <input
          aria-label={`Subplot row ${rowIndex} name`}
          placeholder="Name subplot…"
          defaultValue={slot.name}
          key={`${slot.id}-${slot.name}`}
          onBlur={(event) => {
            if (event.target.value !== slot.name) {
              onRename(event.target.value);
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      <div
        ref={trackRef}
        className={`gantt-track${interacting ? ' interacting' : ''}`}
        role="group"
        aria-label={`${label} coverage`}
        onPointerDown={beginPaint}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          applyDrag(event.clientX);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className={`gantt-lane${selectedChapterId === chapter.id ? ' selected' : ''}${
              display.has(chapter.id) ? ' covered' : ''
            }`}
            aria-hidden="true"
          />
        ))}

        {segments.map((segment, segmentIndex) => {
          const spanLabel =
            segment.start === segment.end
              ? (chapters[segment.start]?.title ?? label)
              : `${chapters[segment.start]?.title ?? ''} → ${chapters[segment.end]?.title ?? ''}`;
          return (
            <div
              key={`${slot.id}-seg-${segment.start}-${segment.end}-${segmentIndex}`}
              className="gantt-bar segment"
              style={{
                gridColumn: `${segment.start + 1} / ${segment.end + 2}`,
                gridRow: 1,
              }}
              role="button"
              tabIndex={0}
              aria-label={`${label} from ${chapters[segment.start]?.title} to ${chapters[segment.end]?.title}`}
              onPointerDown={(event) => {
                if (event.altKey) {
                  event.preventDefault();
                  event.stopPropagation();
                  const chapterId = orderedIds[indexFromClientX(event.clientX)]!;
                  commitCovered(punchGap(display, chapterId));
                  return;
                }
                beginMove(event, segmentIndex, segments);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                const chapterId = orderedIds[indexFromClientX(event.clientX)]!;
                onSelectChapter(chapterId);
                if (slot.subplot_id) onSelectSubplot(slot.subplot_id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectChapter(orderedIds[segment.start]!);
                  if (slot.subplot_id) onSelectSubplot(slot.subplot_id);
                }
              }}
            >
              <button
                type="button"
                className="gantt-handle start"
                aria-label={`Scale start of ${label}`}
                onPointerDown={(event) => beginResize(event, segmentIndex, 'start', segments)}
              />
              <span className="gantt-bar-label">{spanLabel}</span>
              <button
                type="button"
                className="gantt-handle end"
                aria-label={`Scale end of ${label}`}
                onPointerDown={(event) => beginResize(event, segmentIndex, 'end', segments)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
