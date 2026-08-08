"""Application service coordinating domain mutations and persistence."""

from __future__ import annotations

from typing import Any

from shadowspeaker.domain.models import (
    NarrativePointOfView,
    PacingDevice,
    StoryProject,
    StructuralDevice,
    SuspenseMechanism,
    Timescale,
    WritingTexture,
)
from shadowspeaker.domain.mutations import (
    DomainError,
    DuplicateLinkError,
    NotFoundError,
    ValidationConflictError,
    add_block_from_template,
    add_chapter,
    add_plot,
    add_subplot,
    add_subplot_phase,
    add_timeline_slots,
    associate_subplot_chapters,
    clone_block,
    create_block_link,
    create_project,
    delete_block,
    delete_block_link,
    delete_chapter,
    move_block,
    paint_timeline_slot_coverage,
    reorder_blocks_in_chapter,
    reorder_chapters,
    save_block_as_template,
    update_block,
    update_chapter,
    update_narrative_defaults,
    update_plot,
    update_subplot,
    update_timeline_slot,
)
from shadowspeaker.domain.review import collect_review_warnings
from shadowspeaker.export import (
    export_agent_writing_pack,
    export_story_json,
    export_story_markdown,
    export_writing_style,
)
from shadowspeaker.persistence import InvalidProjectDataError, ProjectRepository


class ProjectService:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repo = repository

    async def create_project(self, name: str) -> StoryProject:
        project = create_project(name)
        return await self._repo.create(project)

    async def list_projects(self) -> list[dict[str, str]]:
        if hasattr(self._repo, "list_summaries"):
            return await self._repo.list_summaries()  # type: ignore[no-any-return]
        summaries: list[dict[str, str]] = []
        for project_id in await self._repo.list_ids():
            try:
                project = await self._repo.get(project_id)
            except InvalidProjectDataError:
                summaries.append({"id": project_id, "name": project_id})
                continue
            if project is None:
                continue
            summaries.append({"id": project.id, "name": project.name})
        return summaries

    async def get_project(self, project_id: str) -> StoryProject:
        project = await self._repo.get(project_id)
        if project is None:
            raise NotFoundError(f"Project not found: {project_id}")
        return project

    async def save_project(self, project: StoryProject) -> StoryProject:
        existing = await self._repo.get(project.id)
        if existing is None:
            raise NotFoundError(f"Project not found: {project.id}")
        return await self._repo.save(project)

    async def delete_project(self, project_id: str) -> None:
        deleted = await self._repo.delete(project_id)
        if not deleted:
            raise NotFoundError(f"Project not found: {project_id}")

    async def update_defaults(
        self,
        project_id: str,
        *,
        point_of_view: NarrativePointOfView | None = None,
        writing_style_material: str | None = None,
        structural_devices: list[StructuralDevice] | None = None,
        structural_devices_custom: list[str] | None = None,
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = update_narrative_defaults(
            project,
            point_of_view=point_of_view,
            writing_style_material=writing_style_material,
            structural_devices=structural_devices,
            structural_devices_custom=structural_devices_custom,
        )
        return await self._repo.save(updated)

    async def add_chapter(self, project_id: str, payload: dict[str, Any]) -> StoryProject:
        project = await self.get_project(project_id)
        updated = add_chapter(
            project,
            title=payload["title"],
            subtitle=payload.get("subtitle"),
            description=payload.get("description", ""),
            timescale=Timescale(payload["timescale"])
            if payload.get("timescale")
            else Timescale.DAYS,
            point_of_view_override=NarrativePointOfView(payload["point_of_view_override"])
            if payload.get("point_of_view_override")
            else None,
        )
        return await self._repo.save(updated)

    async def patch_chapter(
        self, project_id: str, chapter_id: str, payload: dict[str, Any]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        kwargs: dict[str, Any] = {}
        for key in (
            "title",
            "description",
            "subplot_ids",
            "continuity_summary",
            "draft_prose",
            "syntactic_pacing_notes",
            "suspense_custom",
            "pacing_devices_custom",
        ):
            if key in payload:
                kwargs[key] = payload[key]
        if "subtitle" in payload:
            kwargs["subtitle"] = payload["subtitle"]
        if "timescale" in payload and payload["timescale"] is not None:
            kwargs["timescale"] = Timescale(payload["timescale"])
        if "point_of_view_override" in payload:
            value = payload["point_of_view_override"]
            kwargs["point_of_view_override"] = (
                NarrativePointOfView(value) if value is not None else None
            )
        if "pacing_devices" in payload and payload["pacing_devices"] is not None:
            kwargs["pacing_devices"] = [PacingDevice(item) for item in payload["pacing_devices"]]
        if "suspense_mechanisms" in payload and payload["suspense_mechanisms"] is not None:
            kwargs["suspense_mechanisms"] = [
                SuspenseMechanism(item) for item in payload["suspense_mechanisms"]
            ]
        if "writing_texture" in payload and payload["writing_texture"] is not None:
            value = payload["writing_texture"]
            kwargs["writing_texture"] = (
                value if isinstance(value, WritingTexture) else WritingTexture.model_validate(value)
            )
        updated = update_chapter(project, chapter_id, **kwargs)
        return await self._repo.save(updated)

    async def delete_chapter(self, project_id: str, chapter_id: str) -> StoryProject:
        project = await self.get_project(project_id)
        updated = delete_chapter(project, chapter_id)
        return await self._repo.save(updated)

    async def reorder_chapters(self, project_id: str, ordered_ids: list[str]) -> StoryProject:
        project = await self.get_project(project_id)
        updated = reorder_chapters(project, ordered_ids)
        return await self._repo.save(updated)

    async def add_plot(self, project_id: str, payload: dict[str, Any]) -> StoryProject:
        project = await self.get_project(project_id)
        updated = add_plot(
            project,
            name=payload["name"],
            description=payload.get("description", ""),
            chapter_ids=payload.get("chapter_ids"),
        )
        return await self._repo.save(updated)

    async def update_plot(
        self, project_id: str, plot_id: str, payload: dict[str, Any]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = update_plot(
            project,
            plot_id,
            name=payload.get("name"),
            description=payload.get("description"),
            inciting_incident=payload.get("inciting_incident"),
            macguffin=payload.get("macguffin"),
            plot_twist=payload.get("plot_twist"),
            deus_ex_machina=payload.get("deus_ex_machina"),
        )
        return await self._repo.save(updated)

    async def add_subplot(self, project_id: str, payload: dict[str, Any]) -> StoryProject:
        project = await self.get_project(project_id)
        updated = add_subplot(
            project,
            name=payload["name"],
            description=payload.get("description", ""),
            chapter_ids=payload.get("chapter_ids"),
            related_subplot_ids=payload.get("related_subplot_ids"),
        )
        return await self._repo.save(updated)

    async def associate_subplot(
        self, project_id: str, subplot_id: str, chapter_ids: list[str]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = associate_subplot_chapters(project, subplot_id, chapter_ids)
        return await self._repo.save(updated)

    async def update_subplot(
        self, project_id: str, subplot_id: str, payload: dict[str, Any]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = update_subplot(
            project,
            subplot_id,
            name=payload.get("name"),
            description=payload.get("description"),
            phases=payload.get("phases"),
            inciting_incident=payload.get("inciting_incident"),
            macguffin=payload.get("macguffin"),
            plot_twist=payload.get("plot_twist"),
            deus_ex_machina=payload.get("deus_ex_machina"),
        )
        return await self._repo.save(updated)

    async def add_subplot_phase(self, project_id: str, subplot_id: str) -> StoryProject:
        project = await self.get_project(project_id)
        updated = add_subplot_phase(project, subplot_id)
        return await self._repo.save(updated)

    async def add_block(
        self, project_id: str, chapter_id: str, payload: dict[str, Any]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = add_block_from_template(
            project,
            chapter_id=chapter_id,
            template_id=payload.get("template_id"),
            block_type=payload.get("block_type"),
        )
        return await self._repo.save(updated)

    async def patch_block(
        self, project_id: str, block_id: str, payload: dict[str, Any]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = update_block(project, block_id, payload)
        return await self._repo.save(updated)

    async def save_block_as_template(
        self, project_id: str, block_id: str, name: str | None = None
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = save_block_as_template(project, block_id, name=name)
        return await self._repo.save(updated)

    async def review_warnings(self, project_id: str) -> list[dict[str, Any]]:
        project = await self.get_project(project_id)
        return [
            {
                "code": warning.code,
                "message": warning.message,
                "chapter_id": warning.chapter_id,
                "block_id": warning.block_id,
            }
            for warning in collect_review_warnings(project)
        ]

    async def delete_block(self, project_id: str, block_id: str) -> StoryProject:
        project = await self.get_project(project_id)
        updated = delete_block(project, block_id)
        return await self._repo.save(updated)

    async def move_block(self, project_id: str, payload: dict[str, Any]) -> StoryProject:
        project = await self.get_project(project_id)
        updated = move_block(
            project,
            block_id=payload["block_id"],
            target_chapter_id=payload["target_chapter_id"],
            target_index=payload.get("target_index"),
        )
        return await self._repo.save(updated)

    async def clone_block(self, project_id: str, payload: dict[str, Any]) -> StoryProject:
        project = await self.get_project(project_id)
        updated = clone_block(
            project,
            block_id=payload["block_id"],
            target_chapter_id=payload["target_chapter_id"],
        )
        return await self._repo.save(updated)

    async def add_timeline_slots(self, project_id: str, count: int = 1) -> StoryProject:
        project = await self.get_project(project_id)
        updated = add_timeline_slots(project, count)
        return await self._repo.save(updated)

    async def update_timeline_slot(
        self, project_id: str, slot_id: str, payload: dict[str, Any]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = update_timeline_slot(project, slot_id, name=payload.get("name"))
        return await self._repo.save(updated)

    async def paint_timeline_slot(
        self, project_id: str, slot_id: str, chapter_ids: list[str]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = paint_timeline_slot_coverage(project, slot_id, chapter_ids)
        return await self._repo.save(updated)

    async def reorder_blocks(
        self, project_id: str, chapter_id: str, ordered_block_ids: list[str]
    ) -> StoryProject:
        project = await self.get_project(project_id)
        updated = reorder_blocks_in_chapter(project, chapter_id, ordered_block_ids)
        return await self._repo.save(updated)

    async def create_link(self, project_id: str, payload: dict[str, Any]) -> StoryProject:
        project = await self.get_project(project_id)
        updated = create_block_link(
            project,
            source_block_id=payload["source_block_id"],
            target_block_id=payload["target_block_id"],
            description=payload.get("description", ""),
        )
        return await self._repo.save(updated)

    async def delete_link(self, project_id: str, link_id: str) -> StoryProject:
        project = await self.get_project(project_id)
        updated = delete_block_link(project, link_id)
        return await self._repo.save(updated)

    async def export_json(self, project_id: str) -> str:
        project = await self.get_project(project_id)
        return export_story_json(project)

    async def export_markdown(self, project_id: str) -> str:
        project = await self.get_project(project_id)
        return export_story_markdown(project)

    async def export_writing_style(self, project_id: str) -> str:
        project = await self.get_project(project_id)
        return export_writing_style(project)

    async def export_agent_pack(self, project_id: str) -> str:
        project = await self.get_project(project_id)
        return export_agent_writing_pack(project)


__all__ = [
    "DomainError",
    "DuplicateLinkError",
    "NotFoundError",
    "ProjectService",
    "ValidationConflictError",
]
