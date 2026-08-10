"""API request/response schemas (separate from domain models)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from shadowspeaker.domain.models import (
    NarrativePointOfView,
    PacingDevice,
    StoryProject,
    StructuralDevice,
    SuspenseMechanism,
    Timescale,
    WritingTexture,
)

BlockTypeLiteral = Literal[
    "setting",
    "character",
    "dialogue",
    "special_item",
    "vehicle",
    "tool",
    "group",
    "prose_builder",
]


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1)


class UpdateDefaultsRequest(BaseModel):
    point_of_view: NarrativePointOfView | None = None
    writing_style_material: str | None = None
    structural_devices: list[StructuralDevice] | None = None
    structural_devices_custom: list[str] | None = None


class CreateChapterRequest(BaseModel):
    title: str = Field(min_length=1)
    subtitle: str | None = None
    description: str = ""
    timescale: Timescale = Timescale.DAYS
    point_of_view_override: NarrativePointOfView | None = None


class PatchChapterRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    subtitle: str | None = None
    description: str | None = None
    timescale: Timescale | None = None
    point_of_view_override: NarrativePointOfView | None = None
    subplot_ids: list[str] | None = None
    continuity_summary: str | None = None
    draft_prose: str | None = None
    pacing_devices: list[PacingDevice] | None = None
    pacing_devices_custom: list[str] | None = None
    syntactic_pacing_notes: str | None = None
    suspense_mechanisms: list[SuspenseMechanism] | None = None
    suspense_custom: list[str] | None = None
    writing_texture: WritingTexture | None = None


class ReorderChaptersRequest(BaseModel):
    chapter_ids: list[str]


class CreatePlotRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)


class PatchPlotRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    inciting_incident: str | None = None
    macguffin: str | None = None
    plot_twist: str | None = None
    deus_ex_machina: str | None = None


class CreateSubplotRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)
    related_subplot_ids: list[str] = Field(default_factory=list)


class PatchSubplotPhaseRequest(BaseModel):
    id: str
    description: str = ""


class PatchSubplotRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    phases: list[PatchSubplotPhaseRequest] | None = None
    plot_archetype: str | None = None
    delta: str | None = None
    inciting_incident: str | None = None
    macguffin: str | None = None
    plot_twist: str | None = None
    deus_ex_machina: str | None = None


class AssociateSubplotRequest(BaseModel):
    chapter_ids: list[str]


class CreateBlockRequest(BaseModel):
    template_id: str | None = None
    block_type: BlockTypeLiteral | None = None


class PatchBlockRequest(BaseModel):
    model_config = {"extra": "allow"}

    title: str | None = None


class SaveBlockTemplateRequest(BaseModel):
    name: str | None = None


class MoveBlockRequest(BaseModel):
    block_id: str
    target_chapter_id: str
    target_index: int | None = None


class CloneBlockRequest(BaseModel):
    block_id: str
    target_chapter_id: str


class ReorderBlocksRequest(BaseModel):
    block_ids: list[str]


class AddTimelineSlotsRequest(BaseModel):
    count: int = 1


class PatchTimelineSlotRequest(BaseModel):
    name: str | None = None


class PaintTimelineSlotRequest(BaseModel):
    chapter_ids: list[str]


class CreateBlockLinkRequest(BaseModel):
    source_block_id: str
    target_block_id: str
    description: str = ""


class ErrorBody(BaseModel):
    detail: str
    code: str


class ProjectResponse(BaseModel):
    project: StoryProject


def dump_project(project: StoryProject) -> dict[str, Any]:
    return {"project": project.model_dump(mode="json")}
