"""Core story project domain models."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from shadowspeaker.domain.blocks import Block


class Timescale(StrEnum):
    MINUTES = "minutes"
    HOURS = "hours"
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"
    YEARS = "years"
    EONS = "eons"


class NarrativePointOfView(StrEnum):
    FIRST_PERSON = "first_person"
    SECOND_PERSON = "second_person"
    THIRD_LIMITED = "third_limited"
    THIRD_OMNISCIENT = "third_omniscient"
    MULTIPLE = "multiple"


class NarrativeDefaults(BaseModel):
    model_config = ConfigDict(extra="forbid")

    point_of_view: NarrativePointOfView = NarrativePointOfView.THIRD_LIMITED
    writing_style_material: str = ""


class Chapter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    subtitle: str | None = None
    description: str = ""
    order: int
    timescale: Timescale = Timescale.DAYS
    point_of_view_override: NarrativePointOfView | None = None
    subplot_ids: list[str] = Field(default_factory=list)
    block_ids: list[str] = Field(default_factory=list)
    continuity_summary: str = ""
    draft_prose: str = ""


class Plot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)
    related_plot_ids: list[str] = Field(default_factory=list)


class Subplot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)
    related_subplot_ids: list[str] = Field(default_factory=list)


class BlockLink(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source_block_id: str
    target_block_id: str
    description: str = ""


class BlockTemplate(BaseModel):
    """Reusable starting structure stored with the project."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    block_type: str
    # Template payload without a concrete instance id.
    defaults: dict[str, object] = Field(default_factory=dict)


class StoryProject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    narrative_defaults: NarrativeDefaults = Field(default_factory=NarrativeDefaults)
    chapters: list[Chapter] = Field(default_factory=list)
    plots: list[Plot] = Field(default_factory=list)
    subplots: list[Subplot] = Field(default_factory=list)
    blocks: dict[str, Block] = Field(default_factory=dict)
    block_links: list[BlockLink] = Field(default_factory=list)
    block_templates: list[BlockTemplate] = Field(default_factory=list)
    writing_style_material: str = ""


block_adapter: TypeAdapter[Block] = TypeAdapter(Block)


def parse_block(data: object) -> Block:
    return block_adapter.validate_python(data)
