import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import type { StoryProject } from '../types';

const LAST_PROJECT_KEY = 'shadowspeaker.lastProjectId';

function emptyProject(id: string, name: string): StoryProject {
  return {
    id,
    name,
    narrative_defaults: {
      point_of_view: 'third_limited',
      writing_style_material: '',
      structural_devices: [],
      structural_devices_custom: [],
    },
    writing_style_material: '',
    chapters: [],
    plots: [],
    subplots: [],
    blocks: {},
    block_links: [],
    block_templates: [],
    timeline_slots: [],
  };
}

describe('useProjectWorkspace persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, 'listProjects').mockResolvedValue({ projects: [] });
    vi.spyOn(api, 'getProject').mockRejectedValue(new Error('not stubbed'));
    vi.spyOn(api, 'createProject').mockRejectedValue(new Error('not stubbed'));
    vi.spyOn(api, 'deleteProject').mockRejectedValue(new Error('not stubbed'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists saved projects on the start page without auto-opening', async () => {
    const saved = emptyProject('proj_saved', 'Saved Harbor');
    localStorage.setItem(LAST_PROJECT_KEY, saved.id);
    vi.spyOn(api, 'listProjects').mockResolvedValue({
      projects: [
        { id: 'proj_other', name: 'Other' },
        { id: saved.id, name: saved.name },
      ],
    });

    const { result } = renderHook(() => useProjectWorkspace());

    await waitFor(() => expect(result.current.ui.bootstrapping).toBe(false));
    expect(result.current.project).toBeNull();
    expect(result.current.lastProjectId).toBe('proj_saved');
    expect(result.current.projects[0]?.id).toBe('proj_saved');
    expect(api.getProject).not.toHaveBeenCalled();
  });

  it('lists saved projects and opens one from the picker', async () => {
    const listed = emptyProject('proj_open', 'Open Me');
    vi.spyOn(api, 'listProjects').mockResolvedValue({
      projects: [{ id: listed.id, name: listed.name }],
    });
    vi.spyOn(api, 'getProject').mockResolvedValue({ project: listed });

    const { result } = renderHook(() => useProjectWorkspace());
    await waitFor(() => expect(result.current.ui.bootstrapping).toBe(false));
    expect(result.current.projects).toEqual([{ id: listed.id, name: listed.name }]);

    await act(async () => {
      await result.current.openProject(listed.id);
    });
    expect(result.current.project?.name).toBe('Open Me');
    expect(localStorage.getItem(LAST_PROJECT_KEY)).toBe('proj_open');
  });

  it('remembers a newly created project id', async () => {
    const created = emptyProject('proj_new', 'Fresh');
    vi.spyOn(api, 'createProject').mockResolvedValue({ project: created });
    vi.spyOn(api, 'listProjects')
      .mockResolvedValueOnce({ projects: [] })
      .mockResolvedValue({ projects: [{ id: created.id, name: created.name }] });

    const { result } = renderHook(() => useProjectWorkspace());
    await waitFor(() => expect(result.current.ui.bootstrapping).toBe(false));

    await act(async () => {
      await result.current.createProject('Fresh');
    });
    expect(result.current.project?.id).toBe('proj_new');
    expect(localStorage.getItem(LAST_PROJECT_KEY)).toBe('proj_new');
  });

  it('deletes a project and clears the recent marker', async () => {
    const doomed = emptyProject('proj_doomed', 'Doomed');
    localStorage.setItem(LAST_PROJECT_KEY, doomed.id);
    vi.spyOn(api, 'listProjects')
      .mockResolvedValueOnce({
        projects: [{ id: doomed.id, name: doomed.name }],
      })
      .mockResolvedValue({ projects: [] });
    vi.spyOn(api, 'deleteProject').mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectWorkspace());
    await waitFor(() => expect(result.current.ui.bootstrapping).toBe(false));
    expect(result.current.projects).toHaveLength(1);

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteProject(doomed.id);
    });
    expect(ok).toBe(true);
    expect(api.deleteProject).toHaveBeenCalledWith('proj_doomed');
    expect(result.current.projects).toEqual([]);
    expect(localStorage.getItem(LAST_PROJECT_KEY)).toBeNull();
    expect(result.current.lastProjectId).toBeNull();
  });
});
