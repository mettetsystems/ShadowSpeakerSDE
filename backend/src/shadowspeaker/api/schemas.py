"""API request/response schemas (separate from domain models)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from shadowspeaker.domain.models import (
    NarrativePointOfView,
    StoryProject,
    Timescale,
)


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1)


class UpdateDefaultsRequest(BaseModel):
    point_of_view: NarrativePointOfView | None = None
    writing_style_material: str | None = None


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


class ReorderChaptersRequest(BaseModel):
    chapter_ids: list[str]


class CreatePlotRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)


class CreateSubplotRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)
    related_subplot_ids: list[str] = Field(default_factory=list)


class AssociateSubplotRequest(BaseModel):
    chapter_ids: list[str]


class CreateBlockRequest(BaseModel):
    template_id: str | None = None
    block_type: (
        Literal["setting", "character", "dialogue", "special_item", "vehicle", "tool"] | None
    ) = None


class PatchBlockRequest(BaseModel):
    model_config = {"extra": "allow"}

    title: str | None = None


class MoveBlockRequest(BaseModel):
    block_id: str
    target_chapter_id: str
    target_index: int | None = None


class ReorderBlocksRequest(BaseModel):
    block_ids: list[str]


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
