import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type ProjectSummary } from '../api';
import type { StoryProject } from '../types';

export interface UiState {
  selectedChapterId: string | null;
  selectedBlockId: string | null;
  selectedSubplotId: string | null;
  selectedPlotId: string | null;
  linkSourceBlockId: string | null;
  showReview: boolean;
  error: string | null;
  busy: boolean;
  bootstrapping: boolean;
}

const LAST_PROJECT_KEY = 'shadowspeaker.lastProjectId';

const initialUi: UiState = {
  selectedChapterId: null,
  selectedBlockId: null,
  selectedSubplotId: null,
  selectedPlotId: null,
  linkSourceBlockId: null,
  showReview: false,
  error: null,
  busy: false,
  bootstrapping: true,
};

function rememberProjectId(projectId: string | null) {
  if (projectId) {
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
  } else {
    localStorage.removeItem(LAST_PROJECT_KEY);
  }
}

function readLastProjectId(): string | null {
  return localStorage.getItem(LAST_PROJECT_KEY);
}

function sortProjects(projects: ProjectSummary[], lastId: string | null): ProjectSummary[] {
  if (!lastId) return projects;
  return [...projects].sort((a, b) => {
    if (a.id === lastId) return -1;
    if (b.id === lastId) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function useProjectWorkspace() {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [lastProjectId, setLastProjectId] = useState<string | null>(() => readLastProjectId());
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

  const refreshProjectList = useCallback(async () => {
    try {
      const result = await api.listProjects();
      const lastId = readLastProjectId();
      setLastProjectId(lastId);
      setProjects(sortProjects(result.projects, lastId));
      return result.projects;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not list projects';
      setUi((prev) => ({ ...prev, error: message }));
      return [];
    }
  }, []);

  const applyProject = useCallback((next: StoryProject) => {
    setProject(next);
    rememberProjectId(next.id);
    setLastProjectId(next.id);
    setUi((prev) => {
      const chapterStillThere = next.chapters.some((c) => c.id === prev.selectedChapterId);
      const blockStillThere = prev.selectedBlockId
        ? Boolean(next.blocks[prev.selectedBlockId])
        : false;
      const subplotStillThere = prev.selectedSubplotId
        ? next.subplots.some((s) => s.id === prev.selectedSubplotId)
        : false;
      const plotStillThere = prev.selectedPlotId
        ? next.plots.some((p) => p.id === prev.selectedPlotId)
        : false;
      return {
        ...prev,
        selectedChapterId: chapterStillThere
          ? prev.selectedChapterId
          : (next.chapters[0]?.id ?? null),
        selectedBlockId: blockStillThere ? prev.selectedBlockId : null,
        selectedSubplotId: subplotStillThere ? prev.selectedSubplotId : null,
        selectedPlotId: plotStillThere ? prev.selectedPlotId : null,
      };
    });
  }, []);

  const openProject = useCallback(
    async (projectId: string) => {
      const result = await run(() => api.getProject(projectId));
      if (result) {
        applyProject(result.project);
        return;
      }
      await refreshProjectList();
    },
    [applyProject, refreshProjectList, run],
  );

  const createProject = useCallback(
    async (name: string) => {
      const result = await run(() => api.createProject(name));
      if (result) {
        applyProject(result.project);
        await refreshProjectList();
      }
    },
    [applyProject, refreshProjectList, run],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      const result = await run(async () => {
        await api.deleteProject(projectId);
        return true;
      });
      if (!result) return false;
      if (readLastProjectId() === projectId) {
        rememberProjectId(null);
        setLastProjectId(null);
      }
      if (project?.id === projectId) {
        setProject(null);
      }
      await refreshProjectList();
      return true;
    },
    [project?.id, refreshProjectList, run],
  );

  const closeProject = useCallback(async () => {
    setProject(null);
    setUi((prev) => ({
      ...prev,
      selectedChapterId: null,
      selectedBlockId: null,
      selectedSubplotId: null,
      selectedPlotId: null,
      linkSourceBlockId: null,
      showReview: false,
    }));
    await refreshProjectList();
  }, [refreshProjectList]);

  const reload = useCallback(async () => {
    if (!project) return;
    const result = await run(() => api.getProject(project.id));
    if (result) applyProject(result.project);
  }, [applyProject, project, run]);

  const mutate = useCallback(
    async (fn: (projectId: string) => Promise<{ project: StoryProject }>) => {
      if (!project) return null;
      const result = await run(() => fn(project.id));
      if (result) {
        applyProject(result.project);
        return result.project;
      }
      return null;
    },
    [applyProject, project, run],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Always land on the start page with the saved-project list.
      await refreshProjectList();
      if (!cancelled) {
        setUi((prev) => ({ ...prev, bootstrapping: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProjectList]);

  return {
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
    applyProject,
  };
}
