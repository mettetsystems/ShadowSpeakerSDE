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
import { api } from './api';
import { BlockBins } from './components/BlockBins';
import { BlockEditor } from './components/BlockEditor';
import { ChapterWorkspace } from './components/ChapterWorkspace';
import { Timeline } from './components/Timeline';
import { useProjectWorkspace } from './hooks/useProjectWorkspace';
import { POINT_OF_VIEWS, orderedChapters, type NarrativePointOfView } from './types';
import './App.css';

export default function App() {
  const { project, ui, setUi, createProject, reload, mutate } = useProjectWorkspace();
  const [projectName, setProjectName] = useState('Harbor Lights');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterSubtitle, setChapterSubtitle] = useState('');
  const [subplotName, setSubplotName] = useState('');
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selectedBlock = useMemo(() => {
    if (!project || !ui.selectedBlockId) return null;
    return project.blocks[ui.selectedBlockId] ?? null;
  }, [project, ui.selectedBlockId]);

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
    await mutate((id) =>
      api.createSubplot(id, {
        name: subplotName.trim(),
        chapter_ids: chapterIds,
      }),
    );
    setSubplotName('');
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

        <section className="controls-row">
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
                  {value}
                </option>
              ))}
            </select>
          </label>
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
        </section>

        <Timeline
          project={project}
          selectedChapterId={ui.selectedChapterId}
          onSelectChapter={(chapterId) =>
            setUi((prev) => ({ ...prev, selectedChapterId: chapterId }))
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
              onDelete={() =>
                void mutate((id) => api.deleteBlock(id, selectedBlock.id))
              }
            />
          ) : null}
        </div>
      </div>
      <DragOverlay>{activeDragLabel ? <div className="drag-ghost">{activeDragLabel}</div> : null}</DragOverlay>
    </DndContext>
  );
}
