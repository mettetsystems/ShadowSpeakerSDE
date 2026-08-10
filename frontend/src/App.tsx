import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo, useState, type FormEvent } from 'react';
import { api, type ProjectSummary } from './api';
import { BlockBins } from './components/BlockBins';
import { BlockEditor } from './components/BlockEditor';
import { ChapterWorkspace } from './components/ChapterWorkspace';
import { DeleteProjectDialog } from './components/DeleteProjectDialog';
import { PlotPanel } from './components/PlotPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { SubplotPanel } from './components/SubplotPanel';
import { Timeline } from './components/Timeline';
import {
  CollapsiblePanelHeader,
  useCollapsiblePanel,
} from './components/CollapsiblePanel';
import { useProjectWorkspace } from './hooks/useProjectWorkspace';
import {
  POINT_OF_VIEWS,
  STRUCTURAL_DEVICES,
  orderedChapters,
  type NarrativePointOfView,
  type ReviewWarning,
  type StructuralDevice,
} from './types';
import { findChapterForBlock, reorderSettingSequence } from './chapterBlocks';
import './App.css';

export default function App() {
  const {
    project,
    projects,
    lastProjectId,
    ui,
    setUi,
    createProject,
    deleteProject,
    openProject,
    closeProject,
    reload,
    mutate,
  } = useProjectWorkspace();
  const [projectName, setProjectName] = useState('Harbor Lights');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterSubtitle, setChapterSubtitle] = useState('');
  const [subplotName, setSubplotName] = useState('');
  const [plotName, setPlotName] = useState('');
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const [reviewWarnings, setReviewWarnings] = useState<ReviewWarning[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null);
  const controlsPanel = useCollapsiblePanel(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selectedBlock = useMemo(() => {
    if (!project || !ui.selectedBlockId) return null;
    return project.blocks[ui.selectedBlockId] ?? null;
  }, [project, ui.selectedBlockId]);

  const selectedSubplot = useMemo(() => {
    if (!project || !ui.selectedSubplotId) return null;
    return project.subplots.find((item) => item.id === ui.selectedSubplotId) ?? null;
  }, [project, ui.selectedSubplotId]);

  const selectedPlot = useMemo(() => {
    if (!project || !ui.selectedPlotId) return null;
    return project.plots.find((item) => item.id === ui.selectedPlotId) ?? null;
  }, [project, ui.selectedPlotId]);

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    await createProject(projectName.trim() || 'Untitled Story');
  }

  async function handleAddChapter(event: FormEvent) {
    event.preventDefault();
    if (!project || !chapterTitle.trim()) return;
    await mutate((id) =>
      api.createChapter(id, {
        title: chapterTitle.trim(),
        subtitle: chapterSubtitle.trim() || null,
      }),
    );
    setChapterTitle('');
    setChapterSubtitle('');
  }

  async function handleAddSubplot(event: FormEvent) {
    event.preventDefault();
    if (!project || !subplotName.trim()) return;
    const chapterIds = orderedChapters(project).map((chapter) => chapter.id);
    const previousIds = new Set(project.subplots.map((subplot) => subplot.id));
    const next = await mutate((id) =>
      api.createSubplot(id, {
        name: subplotName.trim(),
        chapter_ids: chapterIds,
      }),
    );
    setSubplotName('');
    if (next) {
      const created = next.subplots.find((subplot) => !previousIds.has(subplot.id));
      if (created) {
        setUi((prev) => ({ ...prev, selectedSubplotId: created.id }));
      }
    }
  }

  async function handleAddPlot(event: FormEvent) {
    event.preventDefault();
    if (!project || !plotName.trim()) return;
    const chapterIds = orderedChapters(project).map((chapter) => chapter.id);
    const previousIds = new Set(project.plots.map((plot) => plot.id));
    const next = await mutate((id) =>
      api.createPlot(id, {
        name: plotName.trim(),
        chapter_ids: chapterIds,
      }),
    );
    setPlotName('');
    if (next) {
      const created = next.plots.find((plot) => !previousIds.has(plot.id));
      if (created) {
        setUi((prev) => ({ ...prev, selectedPlotId: created.id }));
      }
    }
  }

  async function openReview() {
    if (!project) return;
    try {
      const result = await api.getReview(project.id);
      setReviewWarnings(result.warnings);
      setUi((prev) => ({ ...prev, showReview: true }));
    } catch (err) {
      setUi((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Could not load review',
      }));
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.kind === 'template') {
      setActiveDragLabel('Template');
    } else if (data?.kind === 'block') {
      setActiveDragLabel('Block');
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragLabel(null);
    if (!project) return;
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const overChapterId =
      overData?.kind === 'chapter'
        ? String(overData.chapterId)
        : overData?.kind === 'block'
          ? String(overData.chapterId)
          : String(over.id).startsWith('chapter:')
            ? String(over.id).slice('chapter:'.length)
            : null;

    if (activeData?.kind === 'template' && overChapterId) {
      await mutate((id) =>
        api.createBlock(id, overChapterId, { template_id: String(activeData.templateId) }),
      );
      return;
    }

    if (activeData?.kind === 'block' && overChapterId) {
      const blockId = String(activeData.blockId);
      const sourceChapterId = String(activeData.chapterId);
      if (sourceChapterId !== overChapterId) {
        await mutate((id) =>
          api.moveBlock(id, {
            block_id: blockId,
            target_chapter_id: overChapterId,
          }),
        );
        return;
      }

      // Same-chapter reorder via sortable drop target.
      if (overData?.kind === 'block') {
        const chapter = project.chapters.find((item) => item.id === sourceChapterId);
        if (!chapter) return;
        const ids = [...chapter.block_ids];
        const from = ids.indexOf(blockId);
        const to = ids.indexOf(String(overData.blockId));
        if (from < 0 || to < 0 || from === to) return;
        ids.splice(from, 1);
        ids.splice(to, 0, blockId);
        await mutate((id) => api.reorderBlocks(id, sourceChapterId, ids));
      }
    }
  }

  async function moveChapter(chapterId: string, direction: -1 | 1) {
    if (!project) return;
    const chapters = orderedChapters(project);
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= chapters.length) return;
    const next = [...chapters];
    const temp = next[index];
    next[index] = next[swapWith];
    next[swapWith] = temp;
    await mutate((id) => api.reorderChapters(id, next.map((chapter) => chapter.id)));
  }

  if (ui.bootstrapping) {
    return (
      <div className="app shell">
        <header className="brand-bar">
          <div>
            <p className="eyebrow">Story Development Environment</p>
            <h1>ShadowSpeakerSDE</h1>
            <p className="lede">Loading saved projects…</p>
          </div>
        </header>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="app shell">
        <header className="brand-bar">
          <div>
            <p className="eyebrow">Story Development Environment</p>
            <h1>ShadowSpeakerSDE</h1>
            <p className="lede">
              Design chapters, plots, and structured story blocks locally — then export
              context for future writing agents.
            </p>
          </div>
        </header>
        <section className="project-list" aria-label="Saved projects">
          <h2>Saved projects</h2>
          {projects.length === 0 ? (
            <p className="empty">
              No saved projects yet. Create one below — it will be stored locally under{' '}
              <code>backend/data/projects/</code> and appear here after reload.
            </p>
          ) : (
            <ul>
              {projects.map((item) => {
                const isLast = item.id === lastProjectId;
                return (
                  <li key={item.id} className="project-row">
                    <button
                      type="button"
                      className={`project-open${isLast ? ' recent' : ''}`}
                      disabled={ui.busy}
                      onClick={() => void openProject(item.id)}
                    >
                      <span className="project-open-name">
                        {item.name}
                        {isLast ? <span className="pill recent-pill">Recent</span> : null}
                      </span>
                      <span className="muted project-open-id">{item.id}</span>
                    </button>
                    <button
                      type="button"
                      className="ghost project-delete"
                      disabled={ui.busy}
                      aria-label={`Delete ${item.name}`}
                      onClick={() => setPendingDelete(item)}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <form className="start-form" onSubmit={handleCreateProject}>
          <label>
            Project name
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              autoFocus
            />
          </label>
          <button type="submit" disabled={ui.busy}>
            Create story project
          </button>
          {ui.error ? <p className="error">{ui.error}</p> : null}
        </form>
        {pendingDelete ? (
          <DeleteProjectDialog
            project={pendingDelete}
            busy={ui.busy}
            onCancel={() => setPendingDelete(null)}
            onConfirm={async () => {
              const ok = await deleteProject(pendingDelete.id);
              if (ok) setPendingDelete(null);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="app shell project-view">
        <header className="brand-bar compact">
          <div>
            <p className="eyebrow">ShadowSpeakerSDE</p>
            <h1>{project.name}</h1>
          </div>
          <div className="toolbar">
            <button type="button" className="secondary" onClick={() => void closeProject()} disabled={ui.busy}>
              Projects
            </button>
            <button type="button" className="secondary" onClick={() => void openReview()} disabled={ui.busy}>
              Review
            </button>
            <button type="button" className="secondary" onClick={() => void reload()} disabled={ui.busy}>
              Reload
            </button>
            <a href={api.exportUrl(project.id, 'json')} download>
              Export JSON
            </a>
            <a href={api.exportUrl(project.id, 'markdown')} download>
              Export Markdown
            </a>
            <a href={api.exportUrl(project.id, 'writing-style')} download>
              Export writing style
            </a>
            <a href={api.exportUrl(project.id, 'agent-pack')} download>
              Export agent pack
            </a>
          </div>
        </header>

        {ui.error ? <p className="error banner">{ui.error}</p> : null}

        <section
          className={`controls-row${controlsPanel.open ? '' : ' panel-collapsed'}`}
          aria-label="Story controls"
        >
          <CollapsiblePanelHeader
            title="Story controls"
            open={controlsPanel.open}
            onToggle={controlsPanel.toggle}
          />
          {controlsPanel.open ? (
            <div className="controls-row-body">
          <form className="inline-form" onSubmit={handleAddChapter}>
            <input
              placeholder="Chapter title"
              value={chapterTitle}
              onChange={(event) => setChapterTitle(event.target.value)}
              aria-label="Chapter title"
            />
            <input
              placeholder="Optional subtitle"
              value={chapterSubtitle}
              onChange={(event) => setChapterSubtitle(event.target.value)}
              aria-label="Chapter subtitle"
            />
            <button type="submit">Add chapter</button>
          </form>
          <form className="inline-form" onSubmit={handleAddSubplot}>
            <input
              placeholder="Subplot name"
              value={subplotName}
              onChange={(event) => setSubplotName(event.target.value)}
              aria-label="Subplot name"
            />
            <button type="submit">Add subplot across chapters</button>
          </form>
          <form className="inline-form" onSubmit={handleAddPlot}>
            <input
              placeholder="Plot name"
              value={plotName}
              onChange={(event) => setPlotName(event.target.value)}
              aria-label="Plot name"
            />
            <button type="submit">Add plot</button>
          </form>
          {project.plots.length > 0 ? (
            <label className="inline-form">
              Open plot
              <select
                aria-label="Open plot"
                value={ui.selectedPlotId ?? ''}
                onChange={(event) =>
                  setUi((prev) => ({
                    ...prev,
                    selectedPlotId: event.target.value || null,
                  }))
                }
              >
                <option value="">Select plot…</option>
                {project.plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="inline-form">
            Default POV
            <select
              value={project.narrative_defaults.point_of_view}
              onChange={(event) => {
                const value = event.target.value as NarrativePointOfView;
                void mutate((id) => api.updateDefaults(id, { point_of_view: value }));
              }}
            >
              {POINT_OF_VIEWS.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="inline-form multi-select structural-devices">
            <legend>Structural devices</legend>
            {STRUCTURAL_DEVICES.map((device) => {
              const selected = (project.narrative_defaults.structural_devices ?? []).includes(
                device.value,
              );
              return (
                <label key={device.value} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = project.narrative_defaults.structural_devices ?? [];
                      const next = selected
                        ? current.filter((item) => item !== device.value)
                        : [...current, device.value];
                      void mutate((id) =>
                        api.updateDefaults(id, {
                          structural_devices: next as StructuralDevice[],
                        }),
                      );
                    }}
                  />
                  {device.label}
                </label>
              );
            })}
            <label>
              Custom structural device
              <input
                aria-label="Custom structural device"
                placeholder="Add custom and press Enter"
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  const value = event.currentTarget.value.trim();
                  if (!value) return;
                  const current = project.narrative_defaults.structural_devices_custom ?? [];
                  if (current.includes(value)) return;
                  void mutate((id) =>
                    api.updateDefaults(id, {
                      structural_devices_custom: [...current, value],
                    }),
                  );
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {(project.narrative_defaults.structural_devices_custom ?? []).length > 0 ? (
              <ul className="chip-list">
                {(project.narrative_defaults.structural_devices_custom ?? []).map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        void mutate((id) =>
                          api.updateDefaults(id, {
                            structural_devices_custom: (
                              project.narrative_defaults.structural_devices_custom ?? []
                            ).filter((entry) => entry !== item),
                          }),
                        )
                      }
                    >
                      {item} ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </fieldset>
          <label className="inline-form grow">
            Writing style material
            <input
              defaultValue={project.writing_style_material}
              key={`style-${project.writing_style_material}`}
              onBlur={(event) => {
                const value = event.target.value;
                if (value !== project.writing_style_material) {
                  void mutate((id) =>
                    api.updateDefaults(id, { writing_style_material: value }),
                  );
                }
              }}
            />
          </label>
            </div>
          ) : null}
        </section>

        <Timeline
          project={project}
          selectedChapterId={ui.selectedChapterId}
          selectedSubplotId={ui.selectedSubplotId}
          selectedBlockId={ui.selectedBlockId}
          onSelectChapter={(chapterId) =>
            setUi((prev) => ({ ...prev, selectedChapterId: chapterId }))
          }
          onSelectSubplot={(subplotId) =>
            setUi((prev) => ({ ...prev, selectedSubplotId: subplotId }))
          }
          onSelectBlock={(blockId) =>
            setUi((prev) => ({ ...prev, selectedBlockId: blockId }))
          }
          onMoveChapter={(chapterId, direction) => void moveChapter(chapterId, direction)}
          onAddSlots={(count = 1) =>
            void mutate((id) => api.addTimelineSlots(id, count))
          }
          onRenameSlot={(slotId, name) =>
            void mutate((id) => api.patchTimelineSlot(id, slotId, { name }))
          }
          onPaintCoverage={(slotId, chapterIds) =>
            void mutate((id) => api.paintTimelineSlot(id, slotId, chapterIds))
          }
        />

        <div className="main-grid">
          <ChapterWorkspace
            project={project}
            selectedChapterId={ui.selectedChapterId}
            selectedBlockId={ui.selectedBlockId}
            onSelectChapter={(chapterId) =>
              setUi((prev) => ({ ...prev, selectedChapterId: chapterId }))
            }
            onSelectBlock={(blockId) => {
              void (async () => {
                if (ui.linkSourceBlockId && ui.linkSourceBlockId !== blockId) {
                  const source = ui.linkSourceBlockId;
                  await mutate((id) =>
                    api.createLink(id, {
                      source_block_id: source,
                      target_block_id: blockId,
                    }),
                  );
                  setUi((prev) => ({
                    ...prev,
                    selectedBlockId: blockId,
                    linkSourceBlockId: null,
                  }));
                  return;
                }
                setUi((prev) => ({ ...prev, selectedBlockId: blockId }));
              })();
            }}
            onMoveChapter={(chapterId, direction) => void moveChapter(chapterId, direction)}
            onUpdateChapter={(chapterId, patch) =>
              void mutate((id) => api.patchChapter(id, chapterId, patch))
            }
            onDeleteChapter={(chapterId) =>
              void mutate((id) => api.deleteChapter(id, chapterId))
            }
            onMoveBlock={(blockId, targetChapterId) =>
              void mutate((id) =>
                api.moveBlock(id, {
                  block_id: blockId,
                  target_chapter_id: targetChapterId,
                }),
              )
            }
            onCloneBlock={(blockId, targetChapterId) =>
              void mutate((id) =>
                api.cloneBlock(id, {
                  block_id: blockId,
                  target_chapter_id: targetChapterId,
                }),
              )
            }
            onDeleteBlock={(blockId) => {
              void (async () => {
                await mutate((id) => api.deleteBlock(id, blockId));
                setUi((prev) => ({
                  ...prev,
                  selectedBlockId: prev.selectedBlockId === blockId ? null : prev.selectedBlockId,
                  linkSourceBlockId:
                    prev.linkSourceBlockId === blockId ? null : prev.linkSourceBlockId,
                }));
              })();
            }}
            onSetSettingSequence={(chapterId, blockId, sequence) => {
              const chapter = project.chapters.find((item) => item.id === chapterId);
              if (!chapter) return;
              const nextIds = reorderSettingSequence(
                chapter,
                project.blocks,
                blockId,
                sequence,
              );
              if (!nextIds || nextIds.join() === chapter.block_ids.join()) return;
              void mutate((id) => api.reorderBlocks(id, chapterId, nextIds));
            }}
          />

          <BlockBins
            templates={project.block_templates}
            selectedChapterId={ui.selectedChapterId}
            onAddToSelectedChapter={(templateId) => {
              if (!ui.selectedChapterId) return;
              void mutate((id) =>
                api.createBlock(id, ui.selectedChapterId!, { template_id: templateId }),
              );
            }}
          />

          {selectedBlock ? (
            <BlockEditor
              block={selectedBlock}
              project={project}
              linkHint={
                ui.linkSourceBlockId
                  ? ui.linkSourceBlockId === selectedBlock.id
                    ? 'Select a different block to complete the link.'
                    : 'Saving a link to the previously marked block…'
                  : null
              }
              onClose={() =>
                setUi((prev) => ({
                  ...prev,
                  selectedBlockId: null,
                  linkSourceBlockId: null,
                }))
              }
              onStartLink={() => {
                setUi((prev) => ({ ...prev, linkSourceBlockId: selectedBlock.id }));
              }}
              onSave={(patch) => {
                void mutate((id) => api.patchBlock(id, selectedBlock.id, patch));
              }}
              onSaveAsTemplate={() => {
                void mutate((id) => api.saveBlockAsTemplate(id, selectedBlock.id));
              }}
              onDelete={() =>
                void mutate((id) => api.deleteBlock(id, selectedBlock.id))
              }
              onSetSettingSequence={(blockId, sequence) => {
                const chapter = findChapterForBlock(project, blockId);
                if (!chapter) return;
                const nextIds = reorderSettingSequence(
                  chapter,
                  project.blocks,
                  blockId,
                  sequence,
                );
                if (!nextIds || nextIds.join() === chapter.block_ids.join()) return;
                void mutate((id) => api.reorderBlocks(id, chapter.id, nextIds));
              }}
            />
          ) : null}

          {selectedSubplot ? (
            <SubplotPanel
              subplot={selectedSubplot}
              onClose={() => setUi((prev) => ({ ...prev, selectedSubplotId: null }))}
              onSave={(patch) => {
                void mutate((id) => api.patchSubplot(id, selectedSubplot.id, patch));
              }}
              onAddPhase={() => {
                void mutate((id) => api.addSubplotPhase(id, selectedSubplot.id));
              }}
            />
          ) : null}

          {selectedPlot ? (
            <PlotPanel
              plot={selectedPlot}
              onClose={() => setUi((prev) => ({ ...prev, selectedPlotId: null }))}
              onSave={(patch) => {
                void mutate((id) => api.patchPlot(id, selectedPlot.id, patch));
              }}
            />
          ) : null}

          {ui.showReview ? (
            <ReviewPanel
              warnings={reviewWarnings}
              onClose={() => setUi((prev) => ({ ...prev, showReview: false }))}
              onSelectChapter={(chapterId) =>
                setUi((prev) => ({
                  ...prev,
                  selectedChapterId: chapterId,
                  showReview: false,
                }))
              }
              onSelectBlock={(blockId) =>
                setUi((prev) => ({
                  ...prev,
                  selectedBlockId: blockId,
                  showReview: false,
                }))
              }
            />
          ) : null}
        </div>
      </div>
      <DragOverlay>{activeDragLabel ? <div className="drag-ghost">{activeDragLabel}</div> : null}</DragOverlay>
    </DndContext>
  );
}
