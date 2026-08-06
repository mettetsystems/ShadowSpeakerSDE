import { useCallback, useState } from 'react';
import { api, ApiError } from '../api';
import type { StoryProject } from '../types';

export interface UiState {
  selectedChapterId: string | null;
  selectedBlockId: string | null;
  linkSourceBlockId: string | null;
  error: string | null;
  busy: boolean;
}

const initialUi: UiState = {
  selectedChapterId: null,
  selectedBlockId: null,
  linkSourceBlockId: null,
  error: null,
  busy: false,
};

export function useProjectWorkspace() {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [ui, setUi] = useState<UiState>(initialUi);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setUi((prev) => ({ ...prev, busy: true, error: null }));
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unexpected error';
      setUi((prev) => ({ ...prev, error: message }));
      return null;
    } finally {
      setUi((prev) => ({ ...prev, busy: false }));
    }
  }, []);

  const applyProject = useCallback((next: StoryProject) => {
    setProject(next);
    setUi((prev) => {
      const chapterStillThere = next.chapters.some((c) => c.id === prev.selectedChapterId);
      const blockStillThere = prev.selectedBlockId
        ? Boolean(next.blocks[prev.selectedBlockId])
        : false;
      return {
        ...prev,
        selectedChapterId: chapterStillThere
          ? prev.selectedChapterId
          : next.chapters[0]?.id ?? null,
        selectedBlockId: blockStillThere ? prev.selectedBlockId : null,
      };
    });
  }, []);

  const createProject = useCallback(
    async (name: string) => {
      const result = await run(() => api.createProject(name));
      if (result) applyProject(result.project);
    },
    [applyProject, run],
  );

  const reload = useCallback(async () => {
    if (!project) return;
    const result = await run(() => api.getProject(project.id));
    if (result) applyProject(result.project);
  }, [applyProject, project, run]);

  const mutate = useCallback(
    async (fn: (projectId: string) => Promise<{ project: StoryProject }>) => {
      if (!project) return;
      const result = await run(() => fn(project.id));
      if (result) applyProject(result.project);
    },
    [applyProject, project, run],
  );

  return {
    project,
    ui,
    setUi,
    createProject,
    reload,
    mutate,
    applyProject,
  };
}
