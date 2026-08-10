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
    UNRELIABLE_NARRATOR = "unreliable_narrator"
    STREAM_OF_CONSCIOUSNESS = "stream_of_consciousness"
    FREE_INDIRECT_DISCOURSE = "free_indirect_discourse"


class StructuralDevice(StrEnum):
    FRAME_NARRATIVE = "frame_narrative"
    PARALLEL_DUAL_TIMELINES = "parallel_dual_timelines"
    CIRCULAR_CYCLICAL = "circular_cyclical"
    RING_CHIASMUS = "ring_chiasmus"
    IN_MEDIAS_RES = "in_medias_res"
    AB_OVO = "ab_ovo"


class PacingDevice(StrEnum):
    SCENE = "scene"
    SUMMARY = "summary"
    TEMPORAL_EXPANSION = "temporal_expansion"
    SCENE_SEQUEL_RHYTHM = "scene_sequel_rhythm"
    SYNTACTIC_PACING = "syntactic_pacing"
    DELAY_STRETCHING_GAP = "delay_stretching_gap"


class SuspenseMechanism(StrEnum):
    TICKING_CLOCK = "ticking_clock"
    CLIFFHANGER = "cliffhanger"
    INFORMATION_ASYMMETRY = "information_asymmetry"
    RAISING_THE_STAKES = "raising_the_stakes"
    FALSE_HAVEN = "false_haven"
    OPEN_LOOPS = "open_loops"


WRITING_TEXTURE_BUDGET = 160

WRITING_TEXTURE_FIELDS = (
    "rule_of_three",
    "emotional_flatlining",
    "metaphor_stacking",
    "list_rhythm_stacking",
    "subject_x_vs_subject_y",
    "metaphor_with_personification",
    "clean_pivot_sentences",
    "over_dramatic_metaphor",
    "emotional_shorthand_stacking",
)


class WritingTexture(BaseModel):
    """Per-chapter density budget for advanced emotional-impact techniques.

    Each technique is scored 0–160. Assigned points across all techniques may
    total at most ``WRITING_TEXTURE_BUDGET`` (not required to spend the full budget).
    """

    model_config = ConfigDict(extra="forbid")

    rule_of_three: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    emotional_flatlining: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    metaphor_stacking: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    list_rhythm_stacking: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    subject_x_vs_subject_y: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    metaphor_with_personification: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    clean_pivot_sentences: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    over_dramatic_metaphor: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)
    emotional_shorthand_stacking: int = Field(default=0, ge=0, le=WRITING_TEXTURE_BUDGET)

    def total(self) -> int:
        return sum(int(getattr(self, field)) for field in WRITING_TEXTURE_FIELDS)


class NarrativeDefaults(BaseModel):
    model_config = ConfigDict(extra="forbid")

    point_of_view: NarrativePointOfView = NarrativePointOfView.THIRD_LIMITED
    writing_style_material: str = ""
    structural_devices: list[StructuralDevice] = Field(default_factory=list)
    structural_devices_custom: list[str] = Field(default_factory=list)


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
    pacing_devices: list[PacingDevice] = Field(default_factory=list)
    pacing_devices_custom: list[str] = Field(default_factory=list)
    syntactic_pacing_notes: str = ""
    suspense_mechanisms: list[SuspenseMechanism] = Field(default_factory=list)
    suspense_custom: list[str] = Field(default_factory=list)
    writing_texture: WritingTexture = Field(default_factory=WritingTexture)


class Plot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)
    related_plot_ids: list[str] = Field(default_factory=list)
    inciting_incident: str = ""
    macguffin: str = ""
    plot_twist: str = ""
    deus_ex_machina: str = ""


class SubplotPhase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    description: str = ""


DEFAULT_SUBPLOT_PHASES = 3
MAX_SUBPLOT_PHASES = 10


class Subplot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str = ""
    chapter_ids: list[str] = Field(default_factory=list)
    related_subplot_ids: list[str] = Field(default_factory=list)
    phases: list[SubplotPhase] = Field(default_factory=list)
    # Catalog id from plot_archetypes; empty means unset.
    plot_archetype: str = ""
    # How this subplot diverges from the chosen archetype template.
    delta: str = ""
    inciting_incident: str = ""
    macguffin: str = ""
    plot_twist: str = ""
    deus_ex_machina: str = ""


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


class TimelineSlot(BaseModel):
    """Persistent subplot row on the timeline grid."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str = ""
    subplot_id: str | None = None


MAX_TIMELINE_SLOTS = 100
DEFAULT_TIMELINE_SLOTS = 10


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
    timeline_slots: list[TimelineSlot] = Field(default_factory=list)
    writing_style_material: str = ""


block_adapter: TypeAdapter[Block] = TypeAdapter(Block)


def parse_block(data: object) -> Block:
    return block_adapter.validate_python(data)


# Re-export helpers live in domain.__init__.
