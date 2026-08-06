import type { StoryProject } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    let detail = response.statusText;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { detail?: string; code?: string };
      detail = body.detail ?? detail;
      code = body.code;
    } catch {
      // keep status text
    }
    throw new ApiError(detail, response.status, code);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

type ProjectEnvelope = { project: StoryProject };

export const api = {
  createProject(name: string) {
    return request<ProjectEnvelope>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  getProject(projectId: string) {
    return request<ProjectEnvelope>(`/projects/${projectId}`);
  },
  updateDefaults(
    projectId: string,
    body: { point_of_view?: string; writing_style_material?: string },
  ) {
    return request<ProjectEnvelope>(`/projects/${projectId}/defaults`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  createChapter(
    projectId: string,
    body: {
      title: string;
      subtitle?: string | null;
      description?: string;
      timescale?: string;
    },
  ) {
    return request<ProjectEnvelope>(`/projects/${projectId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  patchChapter(projectId: string, chapterId: string, body: Record<string, unknown>) {
    return request<ProjectEnvelope>(`/projects/${projectId}/chapters/${chapterId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  deleteChapter(projectId: string, chapterId: string) {
    return request<ProjectEnvelope>(`/projects/${projectId}/chapters/${chapterId}`, {
      method: 'DELETE',
    });
  },
  reorderChapters(projectId: string, chapterIds: string[]) {
    return request<ProjectEnvelope>(`/projects/${projectId}/chapters/reorder`, {
      method: 'POST',
      body: JSON.stringify({ chapter_ids: chapterIds }),
    });
  },
  createSubplot(
    projectId: string,
    body: { name: string; description?: string; chapter_ids?: string[] },
  ) {
    return request<ProjectEnvelope>(`/projects/${projectId}/subplots`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  associateSubplot(projectId: string, subplotId: string, chapterIds: string[]) {
    return request<ProjectEnvelope>(
      `/projects/${projectId}/subplots/${subplotId}/chapters`,
      {
        method: 'POST',
        body: JSON.stringify({ chapter_ids: chapterIds }),
      },
    );
  },
  createBlock(
    projectId: string,
    chapterId: string,
    body: { template_id?: string; block_type?: string },
  ) {
    return request<ProjectEnvelope>(
      `/projects/${projectId}/chapters/${chapterId}/blocks`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },
  patchBlock(projectId: string, blockId: string, body: Record<string, unknown>) {
    return request<ProjectEnvelope>(`/projects/${projectId}/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  deleteBlock(projectId: string, blockId: string) {
    return request<ProjectEnvelope>(`/projects/${projectId}/blocks/${blockId}`, {
      method: 'DELETE',
    });
  },
  moveBlock(
    projectId: string,
    body: { block_id: string; target_chapter_id: string; target_index?: number },
  ) {
    return request<ProjectEnvelope>(`/projects/${projectId}/blocks/move`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  reorderBlocks(projectId: string, chapterId: string, blockIds: string[]) {
    return request<ProjectEnvelope>(
      `/projects/${projectId}/chapters/${chapterId}/blocks/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ block_ids: blockIds }),
      },
    );
  },
  createLink(
    projectId: string,
    body: { source_block_id: string; target_block_id: string; description?: string },
  ) {
    return request<ProjectEnvelope>(`/projects/${projectId}/block-links`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  deleteLink(projectId: string, linkId: string) {
    return request<ProjectEnvelope>(`/projects/${projectId}/block-links/${linkId}`, {
      method: 'DELETE',
    });
  },
  exportUrl(
    projectId: string,
    kind: 'json' | 'markdown' | 'writing-style' | 'agent-pack',
  ) {
    return `${API_BASE}/projects/${projectId}/export/${kind}`;
  },
};
