"""Discriminated block types for story content."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FigurativeDevice(StrEnum):
    METAPHOR = "metaphor"
    SIMILE = "simile"
    PERSONIFICATION = "personification"
    ANTHROPOMORPHISM = "anthropomorphism"
    HYPERBOLE = "hyperbole"
    LITOTES = "litotes"
    METONYMY = "metonymy"
    SYNECDOCHE = "synecdoche"
    OXYMORON = "oxymoron"
    PARADOX = "paradox"
    SENSORY_IMAGERY = "sensory_imagery"
    SYNESTHESIA = "synesthesia"


class BlockBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str = ""


class SettingBlock(BlockBase):
    block_type: Literal["setting"] = "setting"
    time_of_day: str = ""
    environment_state: str = ""
    description: str = ""
    micro_settings: list[str] = Field(default_factory=list)
    juxtaposition: str = ""
    # Stable shade for timeline chips; clones copy this so scene returns match.
    color_variant: int = Field(default=0, ge=0)
    # Characters present in this setting/scene (refs to character block ids).
    character_ids: list[str] = Field(default_factory=list)


class CharacterBlock(BlockBase):
    block_type: Literal["character"] = "character"
    attire: str = ""
    appearance: str = ""
    smell: str = ""
    personality: str = ""
    # Catalog id from character_archetypes; empty means unset.
    # Legacy free-text values may still appear until the user picks a catalog entry.
    archetype: str = ""
    # How this character diverges from the chosen archetype template.
    archetype_delta: str = ""
    aura: str = ""
    special_skillsets: list[str] = Field(default_factory=list)
    personalized_items: list[str] = Field(default_factory=list)
    character_foil_id: str | None = None


class DialogueLine(BaseModel):
    """One beat in a dialogue script table."""

    model_config = ConfigDict(extra="forbid")

    character_id: str | None = None
    # Legacy free-text speaker name when no character_id is linked.
    character_label: str = ""
    conversation: str = ""
    emotional_state: str = ""
    volume: str = ""
    subtext: str = ""
    # Stage business: ticks, micro-expressions, gestures, etc.
    action: str = ""
    # False = spoken / true dialogue; True = internal monologue.
    internal_monologue: bool = False
    overheard: bool = False
    fourth_wall: bool = False


_LEGACY_DIALOGUE_FIELDS = (
    "character",
    "conversation",
    "emotional_state",
    "volume",
    "subtext",
    "fourth_wall",
    "internal_monologue",
    "overheard",
)


class DialogueBlock(BlockBase):
    block_type: Literal["dialogue"] = "dialogue"
    lines: list[DialogueLine] = Field(default_factory=list)
    template_source_id: str | None = None

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_flat_fields(cls, data: Any) -> Any:
        """Fold pre-script flat dialogue fields into a single line."""
        if not isinstance(data, dict):
            return data
        payload = dict(data)
        lines = payload.get("lines")
        has_lines = isinstance(lines, list) and len(lines) > 0
        if not has_lines and any(key in payload for key in _LEGACY_DIALOGUE_FIELDS):
            payload["lines"] = [
                {
                    "character_label": str(payload.get("character") or ""),
                    "conversation": str(payload.get("conversation") or ""),
                    "emotional_state": str(payload.get("emotional_state") or ""),
                    "volume": str(payload.get("volume") or ""),
                    "subtext": str(payload.get("subtext") or ""),
                    "action": "",
                    "internal_monologue": bool(payload.get("internal_monologue") or False),
                    "overheard": bool(payload.get("overheard") or False),
                    "fourth_wall": bool(payload.get("fourth_wall") or False),
                }
            ]
        for key in _LEGACY_DIALOGUE_FIELDS:
            payload.pop(key, None)
        return payload


class SpecialItemBlock(BlockBase):
    block_type: Literal["special_item"] = "special_item"
    reaction: str = ""
    significance: str = ""
    what_it_does: str = ""
    how_it_works: str = ""
    environmental_effects: str = ""


class VehicleBlock(BlockBase):
    block_type: Literal["vehicle"] = "vehicle"
    behaviors: list[str] = Field(default_factory=list)
    movement: str = ""
    scale: str = ""
    scope: str = ""


class ToolBlock(BlockBase):
    block_type: Literal["tool"] = "tool"
    behaviors: list[str] = Field(default_factory=list)
    description: str = ""
    properties: list[str] = Field(default_factory=list)


class GroupBlock(BlockBase):
    block_type: Literal["group"] = "group"
    # Who/what this group is (faction, crew, unit, etc.).
    description: str = ""
    # Optional opposing forces / rival factions (free text).
    adversaries: str = ""
    # Chapter-local roster for this group instance.
    character_ids: list[str] = Field(default_factory=list)


class ProseBuilderBlock(BlockBase):
    block_type: Literal["prose_builder"] = "prose_builder"
    subject: str = ""
    figurative_devices: list[FigurativeDevice] = Field(default_factory=list)
    figurative_devices_custom: list[str] = Field(default_factory=list)


Block = Annotated[
    SettingBlock
    | CharacterBlock
    | DialogueBlock
    | SpecialItemBlock
    | VehicleBlock
    | ToolBlock
    | GroupBlock
    | ProseBuilderBlock,
    Field(discriminator="block_type"),
]

BLOCK_TYPE_LABELS: dict[str, str] = {
    "setting": "Setting",
    "character": "Character",
    "dialogue": "Dialogue",
    "special_item": "Special Item",
    "vehicle": "Vehicle",
    "tool": "Tool",
    "group": "Group",
    "prose_builder": "Prose Builder",
}

DEFAULT_BLOCK_TITLES: dict[str, str] = {
    "setting": "New Setting",
    "character": "New Character",
    "dialogue": "New Dialogue",
    "special_item": "New Special Item",
    "vehicle": "New Vehicle",
    "tool": "New Tool",
    "group": "New Group",
    "prose_builder": "New Prose Builder",
}


def empty_block_payload(
    block_type: str,
    block_id: str,
    title: str | None = None,
) -> dict[str, object]:
    """Build a minimal valid block dict for a known block_type."""
    resolved_title = (
        title if title is not None else DEFAULT_BLOCK_TITLES.get(block_type, "New Block")
    )
    payload: dict[str, object] = {
        "id": block_id,
        "block_type": block_type,
        "title": resolved_title,
    }
    if block_type == "dialogue":
        payload["lines"] = [{}]
    return payload
