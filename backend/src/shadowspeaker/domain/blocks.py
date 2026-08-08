"""Discriminated block types for story content."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


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


class CharacterBlock(BlockBase):
    block_type: Literal["character"] = "character"
    attire: str = ""
    appearance: str = ""
    smell: str = ""
    personality: str = ""
    archetype: str = ""
    aura: str = ""
    special_skillsets: list[str] = Field(default_factory=list)
    personalized_items: list[str] = Field(default_factory=list)
    character_foil_id: str | None = None


class DialogueBlock(BlockBase):
    block_type: Literal["dialogue"] = "dialogue"
    emotional_state: str = ""
    volume: str = ""
    conversation: str = ""
    # String reference for MVP — avoids a second character-management subsystem.
    character: str = ""
    subtext: str = ""
    fourth_wall: bool = False
    # False = spoken / true dialogue; True = internal monologue.
    internal_monologue: bool = False
    overheard: bool = False
    template_source_id: str | None = None


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
    return {
        "id": block_id,
        "block_type": block_type,
        "title": resolved_title,
    }
