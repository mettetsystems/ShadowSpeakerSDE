"""Project persistence interfaces and file-backed implementation."""

from __future__ import annotations

import asyncio
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Protocol

from pydantic import ValidationError

from shadowspeaker.domain.models import StoryProject

_SAFE_ID = re.compile(r"^[A-Za-z0-9_-]+$")


class ProjectRepository(Protocol):
    async def create(self, project: StoryProject) -> StoryProject: ...

    async def get(self, project_id: str) -> StoryProject | None: ...

    async def save(self, project: StoryProject) -> StoryProject: ...

    async def delete(self, project_id: str) -> bool: ...

    async def list_ids(self) -> list[str]: ...


class ProjectStoreError(Exception):
    pass


class InvalidProjectDataError(ProjectStoreError):
    pass


class JsonFileProjectRepository:
    """One UTF-8 JSON file per project with atomic writes and per-project locks."""

    def __init__(self, root: Path) -> None:
        self._root = root.resolve()
        self._root.mkdir(parents=True, exist_ok=True)
        self._locks: dict[str, asyncio.Lock] = {}
        self._locks_guard = asyncio.Lock()

    async def create(self, project: StoryProject) -> StoryProject:
        path = self._project_path(project.id)
        if path.exists():
            raise ProjectStoreError(f"Project already exists: {project.id}")
        return await self.save(project)

    async def get(self, project_id: str) -> StoryProject | None:
        path = self._project_path(project_id)
        if not path.exists():
            return None
        try:
            raw = await asyncio.to_thread(path.read_text, encoding="utf-8")
            data = json.loads(raw)
            return StoryProject.model_validate(data)
        except (OSError, json.JSONDecodeError, ValidationError) as exc:
            raise InvalidProjectDataError(
                f"Stored project data is invalid for {project_id}: {exc}"
            ) from exc

    async def save(self, project: StoryProject) -> StoryProject:
        lock = await self._lock_for(project.id)
        async with lock:
            path = self._project_path(project.id)
            payload = project.model_dump(mode="json")
            text = json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
            await asyncio.to_thread(self._atomic_write, path, text)
            return project

    async def delete(self, project_id: str) -> bool:
        lock = await self._lock_for(project_id)
        async with lock:
            path = self._project_path(project_id)
            if not path.exists():
                return False
            await asyncio.to_thread(path.unlink)
            return True

    async def list_ids(self) -> list[str]:
        def _list() -> list[str]:
            ids: list[str] = []
            for entry in sorted(self._root.glob("*.json")):
                ids.append(entry.stem)
            return ids

        return await asyncio.to_thread(_list)

    async def _lock_for(self, project_id: str) -> asyncio.Lock:
        async with self._locks_guard:
            if project_id not in self._locks:
                self._locks[project_id] = asyncio.Lock()
            return self._locks[project_id]

    def _project_path(self, project_id: str) -> Path:
        if not _SAFE_ID.match(project_id):
            raise ProjectStoreError(f"Invalid project id: {project_id}")
        path = (self._root / f"{project_id}.json").resolve()
        if not str(path).startswith(str(self._root)):
            raise ProjectStoreError("Path traversal rejected")
        return path

    @staticmethod
    def _atomic_write(path: Path, text: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(prefix=f".{path.stem}.", suffix=".tmp", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(text)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_name, path)
        except Exception:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise
