"""Pure project mutation helpers. No I/O."""

from __future__ import annotations

import copy
import uuid
from typing import Any

from pydantic import ValidationError

from shadowspeaker.domain.blocks import (
    BLOCK_TYPE_LABELS,
    DEFAULT_BLOCK_TITLES,
    empty_block_payload,
)
from shadowspeaker.domain.plot_archetypes import PLOT_ARCHETYPE_IDS
from shadowspeaker.domain.models import (
    DEFAULT_SUBPLOT_PHASES,
    DEFAULT_TIMELINE_SLOTS,
    MAX_SUBPLOT_PHASES,
    MAX_TIMELINE_SLOTS,
    WRITING_TEXTURE_BUDGET,
    BlockLink,
    BlockTemplate,
    Chapter,
    NarrativePointOfView,
    PacingDevice,
    Plot,
    StoryProject,
    StructuralDevice,
    Subplot,
    SubplotPhase,
    SuspenseMechanism,
    TimelineSlot,
    Timescale,
    WritingTexture,
    parse_block,
)


class DomainError(Exception):
    """Base domain error with an actionable message."""


class NotFoundError(DomainError):
    pass


class DuplicateLinkError(DomainError):
    pass


class ValidationConflictError(DomainError):
    pass


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def default_block_templates() -> list[BlockTemplate]:
    templates: list[BlockTemplate] = []
    for block_type, label in BLOCK_TYPE_LABELS.items():
        templates.append(
            BlockTemplate(
                id=f"tpl_{block_type}",
                name=label,
                block_type=block_type,
                defaults={"title": DEFAULT_BLOCK_TITLES[block_type]},
            )
        )
    return templates


def ensure_block_templates(project: StoryProject) -> StoryProject:
    """Add any missing default bin templates (e.g. Group on older projects)."""
    known = {template.block_type for template in project.block_templates}
    missing = [
        (block_type, label)
        for block_type, label in BLOCK_TYPE_LABELS.items()
        if block_type not in known
    ]
    if not missing:
        return project
    updated = project.model_copy(deep=True)
    for block_type, label in missing:
        updated.block_templates.append(
            BlockTemplate(
                id=f"tpl_{block_type}",
                name=label,
                block_type=block_type,
                defaults={"title": DEFAULT_BLOCK_TITLES[block_type]},
            )
        )
    return updated


def default_timeline_slots(count: int = DEFAULT_TIMELINE_SLOTS) -> list[TimelineSlot]:
    return [TimelineSlot(id=_new_id("slot")) for _ in range(count)]


def default_subplot_phases(count: int = DEFAULT_SUBPLOT_PHASES) -> list[SubplotPhase]:
    return [SubplotPhase(id=_new_id("ph")) for _ in range(count)]


def _ensure_subplot_phases(subplot: Subplot) -> None:
    """Pad legacy/empty phase lists up to the default of 3 (in place)."""
    while len(subplot.phases) < DEFAULT_SUBPLOT_PHASES:
        subplot.phases.append(SubplotPhase(id=_new_id("ph")))


def create_project(name: str, project_id: str | None = None) -> StoryProject:
    return StoryProject(
        id=project_id or _new_id("proj"),
        name=name.strip() or "Untitled Story",
        block_templates=default_block_templates(),
        timeline_slots=default_timeline_slots(),
    )


def _clean_custom_strings(items: list[str] | None) -> list[str]:
    if not items:
        return []
    cleaned: list[str] = []
    for item in items:
        if not isinstance(item, str):
            continue
        value = item.strip()
        if value and value not in cleaned:
            cleaned.append(value)
    return cleaned


def update_narrative_defaults(
    project: StoryProject,
    *,
    point_of_view: NarrativePointOfView | None = None,
    writing_style_material: str | None = None,
    structural_devices: list[StructuralDevice] | None = None,
    structural_devices_custom: list[str] | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    defaults = updated.narrative_defaults.model_copy()
    if point_of_view is not None:
        defaults.point_of_view = point_of_view
    if writing_style_material is not None:
        defaults.writing_style_material = writing_style_material
        updated.writing_style_material = writing_style_material
    if structural_devices is not None:
        defaults.structural_devices = list(dict.fromkeys(structural_devices))
    if structural_devices_custom is not None:
        defaults.structural_devices_custom = _clean_custom_strings(structural_devices_custom)
    updated.narrative_defaults = defaults
    return updated


def add_chapter(
    project: StoryProject,
    *,
    title: str,
    subtitle: str | None = None,
    description: str = "",
    timescale: Timescale = Timescale.DAYS,
    point_of_view_override: NarrativePointOfView | None = None,
    chapter_id: str | None = None,
) -> StoryProject:
    if not title.strip():
        raise ValidationConflictError("Chapter title is required")
    updated = project.model_copy(deep=True)
    order = len(updated.chapters)
    chapter = Chapter(
        id=chapter_id or _new_id("ch"),
        title=title.strip(),
        subtitle=subtitle.strip() if subtitle else None,
        description=description,
        order=order,
        timescale=timescale,
        point_of_view_override=point_of_view_override,
    )
    updated.chapters.append(chapter)
    return updated


_UNSET = object()


def update_chapter(
    project: StoryProject,
    chapter_id: str,
    *,
    title: str | None = None,
    subtitle: str | None | object = _UNSET,
    description: str | None = None,
    timescale: Timescale | None = None,
    point_of_view_override: NarrativePointOfView | None | object = _UNSET,
    subplot_ids: list[str] | None = None,
    continuity_summary: str | None = None,
    draft_prose: str | None = None,
    pacing_devices: list[PacingDevice] | None = None,
    pacing_devices_custom: list[str] | None = None,
    syntactic_pacing_notes: str | None = None,
    suspense_mechanisms: list[SuspenseMechanism] | None = None,
    suspense_custom: list[str] | None = None,
    writing_texture: WritingTexture | dict[str, Any] | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    chapter = _require_chapter(updated, chapter_id)
    if title is not None:
        if not title.strip():
            raise ValidationConflictError("Chapter title is required")
        chapter.title = title.strip()
    if subtitle is not _UNSET:
        if subtitle is None or (isinstance(subtitle, str) and not subtitle.strip()):
            chapter.subtitle = None
        else:
            chapter.subtitle = str(subtitle).strip()
    if description is not None:
        chapter.description = description
    if timescale is not None:
        chapter.timescale = timescale
    if point_of_view_override is not _UNSET:
        chapter.point_of_view_override = point_of_view_override  # type: ignore[assignment]
    if continuity_summary is not None:
        chapter.continuity_summary = continuity_summary
    if draft_prose is not None:
        chapter.draft_prose = draft_prose
    if pacing_devices is not None:
        chapter.pacing_devices = list(dict.fromkeys(pacing_devices))
    if pacing_devices_custom is not None:
        chapter.pacing_devices_custom = _clean_custom_strings(pacing_devices_custom)
    if syntactic_pacing_notes is not None:
        chapter.syntactic_pacing_notes = syntactic_pacing_notes
    if suspense_mechanisms is not None:
        chapter.suspense_mechanisms = list(dict.fromkeys(suspense_mechanisms))
    if suspense_custom is not None:
        chapter.suspense_custom = _clean_custom_strings(suspense_custom)
    if writing_texture is not None:
        try:
            texture = (
                writing_texture
                if isinstance(writing_texture, WritingTexture)
                else WritingTexture.model_validate(writing_texture)
            )
        except ValidationError as exc:
            detail = "; ".join(error["msg"] for error in exc.errors())
            raise ValidationConflictError(detail) from exc
        if texture.total() > WRITING_TEXTURE_BUDGET:
            raise ValidationConflictError(
                f"Writing texture points ({texture.total()}) exceed "
                f"budget of {WRITING_TEXTURE_BUDGET}"
            )
        chapter.writing_texture = texture
    if subplot_ids is not None:
        known = {s.id for s in updated.subplots}
        missing = [sid for sid in subplot_ids if sid not in known]
        if missing:
            raise NotFoundError(f"Subplot not found: {missing[0]}")
        chapter.subplot_ids = list(dict.fromkeys(subplot_ids))
        # Keep subplot chapter coverage in sync.
        for subplot in updated.subplots:
            if subplot.id in chapter.subplot_ids:
                if chapter_id not in subplot.chapter_ids:
                    subplot.chapter_ids.append(chapter_id)
            elif chapter_id in subplot.chapter_ids:
                subplot.chapter_ids = [c for c in subplot.chapter_ids if c != chapter_id]
    return updated


def delete_chapter(project: StoryProject, chapter_id: str) -> StoryProject:
    updated = project.model_copy(deep=True)
    chapter = _require_chapter(updated, chapter_id)
    block_ids = list(chapter.block_ids)
    for block_id in block_ids:
        updated = delete_block(updated, block_id)
    updated.chapters = [c for c in updated.chapters if c.id != chapter_id]
    for plot in updated.plots:
        plot.chapter_ids = [c for c in plot.chapter_ids if c != chapter_id]
    for subplot in updated.subplots:
        subplot.chapter_ids = [c for c in subplot.chapter_ids if c != chapter_id]
    _renumber_chapters(updated)
    return updated


def reorder_chapters(project: StoryProject, ordered_chapter_ids: list[str]) -> StoryProject:
    updated = project.model_copy(deep=True)
    existing = {c.id for c in updated.chapters}
    incoming = list(ordered_chapter_ids)
    if len(incoming) != len(set(incoming)):
        raise ValidationConflictError("Chapter reorder list contains duplicates")
    if set(incoming) != existing:
        raise ValidationConflictError(
            "Chapter reorder list must contain each project chapter exactly once"
        )
    by_id = {c.id: c for c in updated.chapters}
    updated.chapters = [by_id[cid] for cid in incoming]
    _renumber_chapters(updated)
    return updated


def add_plot(
    project: StoryProject,
    *,
    name: str,
    description: str = "",
    chapter_ids: list[str] | None = None,
    plot_id: str | None = None,
) -> StoryProject:
    if not name.strip():
        raise ValidationConflictError("Plot name is required")
    updated = project.model_copy(deep=True)
    ids = chapter_ids or []
    _assert_chapters_exist(updated, ids)
    updated.plots.append(
        Plot(
            id=plot_id or _new_id("plot"),
            name=name.strip(),
            description=description,
            chapter_ids=list(dict.fromkeys(ids)),
        )
    )
    return updated


def update_plot(
    project: StoryProject,
    plot_id: str,
    *,
    name: str | None = None,
    description: str | None = None,
    inciting_incident: str | None = None,
    macguffin: str | None = None,
    plot_twist: str | None = None,
    deus_ex_machina: str | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    plot = _require_plot(updated, plot_id)
    if name is not None:
        cleaned = name.strip()
        if not cleaned:
            raise ValidationConflictError("Plot name is required")
        plot.name = cleaned
    if description is not None:
        plot.description = description
    if inciting_incident is not None:
        plot.inciting_incident = inciting_incident
    if macguffin is not None:
        plot.macguffin = macguffin
    if plot_twist is not None:
        plot.plot_twist = plot_twist
    if deus_ex_machina is not None:
        plot.deus_ex_machina = deus_ex_machina
    return updated


def add_subplot(
    project: StoryProject,
    *,
    name: str,
    description: str = "",
    chapter_ids: list[str] | None = None,
    related_subplot_ids: list[str] | None = None,
    subplot_id: str | None = None,
) -> StoryProject:
    if not name.strip():
        raise ValidationConflictError("Subplot name is required")
    updated = project.model_copy(deep=True)
    ids = chapter_ids or []
    _assert_chapters_exist(updated, ids)
    related = related_subplot_ids or []
    known = {s.id for s in updated.subplots}
    for rid in related:
        if rid not in known:
            raise NotFoundError(f"Related subplot not found: {rid}")
    subplot = Subplot(
        id=subplot_id or _new_id("sub"),
        name=name.strip(),
        description=description,
        chapter_ids=list(dict.fromkeys(ids)),
        related_subplot_ids=list(dict.fromkeys(related)),
        phases=default_subplot_phases(),
    )
    updated.subplots.append(subplot)
    for chapter in updated.chapters:
        if chapter.id in subplot.chapter_ids and subplot.id not in chapter.subplot_ids:
            chapter.subplot_ids.append(subplot.id)
    return updated


def update_subplot(
    project: StoryProject,
    subplot_id: str,
    *,
    name: str | None = None,
    description: str | None = None,
    phases: list[dict[str, Any]] | None = None,
    plot_archetype: str | None = None,
    delta: str | None = None,
    inciting_incident: str | None = None,
    macguffin: str | None = None,
    plot_twist: str | None = None,
    deus_ex_machina: str | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    subplot = _require_subplot(updated, subplot_id)
    _ensure_subplot_phases(subplot)
    if name is not None:
        cleaned = name.strip()
        if not cleaned:
            raise ValidationConflictError("Subplot name is required")
        subplot.name = cleaned
    if description is not None:
        subplot.description = description
    if phases is not None:
        by_id = {phase.id: phase for phase in subplot.phases}
        for item in phases:
            phase_id = item.get("id")
            if not isinstance(phase_id, str) or phase_id not in by_id:
                raise NotFoundError(f"Subplot phase not found: {phase_id}")
            if "description" in item:
                by_id[phase_id].description = str(item.get("description") or "")
    if plot_archetype is not None:
        archetype = plot_archetype.strip()
        if archetype and archetype not in PLOT_ARCHETYPE_IDS:
            raise ValidationConflictError(f"Unknown plot archetype: {archetype}")
        subplot.plot_archetype = archetype
    if delta is not None:
        subplot.delta = delta
    if inciting_incident is not None:
        subplot.inciting_incident = inciting_incident
    if macguffin is not None:
        subplot.macguffin = macguffin
    if plot_twist is not None:
        subplot.plot_twist = plot_twist
    if deus_ex_machina is not None:
        subplot.deus_ex_machina = deus_ex_machina
    return updated


def add_subplot_phase(project: StoryProject, subplot_id: str) -> StoryProject:
    updated = project.model_copy(deep=True)
    subplot = _require_subplot(updated, subplot_id)
    _ensure_subplot_phases(subplot)
    if len(subplot.phases) >= MAX_SUBPLOT_PHASES:
        raise ValidationConflictError(
            f"Cannot exceed {MAX_SUBPLOT_PHASES} subplot phases"
        )
    subplot.phases.append(SubplotPhase(id=_new_id("ph")))
    return updated


def associate_subplot_chapters(
    project: StoryProject,
    subplot_id: str,
    chapter_ids: list[str],
) -> StoryProject:
    updated = project.model_copy(deep=True)
    subplot = _require_subplot(updated, subplot_id)
    _assert_chapters_exist(updated, chapter_ids)
    unique = list(dict.fromkeys(chapter_ids))
    previous = set(subplot.chapter_ids)
    subplot.chapter_ids = unique
    for chapter in updated.chapters:
        if chapter.id in unique:
            if subplot_id not in chapter.subplot_ids:
                chapter.subplot_ids.append(subplot_id)
        elif subplot_id in chapter.subplot_ids and chapter.id in previous:
            chapter.subplot_ids = [s for s in chapter.subplot_ids if s != subplot_id]
    return updated


def add_block_from_template(
    project: StoryProject,
    *,
    chapter_id: str,
    template_id: str | None = None,
    block_type: str | None = None,
    block_id: str | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    chapter = _require_chapter(updated, chapter_id)
    template: BlockTemplate | None = None
    if template_id:
        template = next((t for t in updated.block_templates if t.id == template_id), None)
        if template is None:
            raise NotFoundError(f"Block template not found: {template_id}")
        block_type = template.block_type
    if not block_type:
        raise ValidationConflictError("block_type or template_id is required")
    if block_type not in BLOCK_TYPE_LABELS:
        raise ValidationConflictError(f"Unknown block_type: {block_type}")

    new_id = block_id or _new_id("blk")
    payload: dict[str, Any] = empty_block_payload(block_type, new_id)
    if template is not None:
        # Copy template defaults; never mutate the template itself.
        defaults = copy.deepcopy(template.defaults)
        defaults.pop("id", None)
        defaults.pop("block_type", None)
        payload.update(defaults)
        payload["id"] = new_id
        payload["block_type"] = block_type

    block = parse_block(payload)
    if template is not None and block_type == "dialogue":
        data = block.model_dump()
        data["template_source_id"] = template.id
        block = parse_block(data)
    if block_type == "setting":
        data = block.model_dump()
        # Fresh instances get the next shade in this chapter; clones keep theirs.
        data["color_variant"] = _next_setting_color_variant(updated, chapter)
        block = parse_block(data)
    _validate_block_refs(updated, block)
    updated.blocks[block.id] = block
    chapter.block_ids.append(block.id)
    return updated


def update_block(project: StoryProject, block_id: str, patch: dict[str, Any]) -> StoryProject:
    updated = project.model_copy(deep=True)
    existing = updated.blocks.get(block_id)
    if existing is None:
        raise NotFoundError(f"Block not found: {block_id}")
    data = existing.model_dump()
    forbidden = {"id", "block_type"}
    for key, value in patch.items():
        if key in forbidden:
            continue
        if key == "figurative_devices_custom" and isinstance(value, list):
            data[key] = _clean_custom_strings([str(item) for item in value])
            continue
        data[key] = value
    block = parse_block(data)
    _validate_block_refs(updated, block)
    updated.blocks[block_id] = block
    return updated


def save_block_as_template(
    project: StoryProject,
    block_id: str,
    *,
    name: str | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    block = updated.blocks.get(block_id)
    if block is None:
        raise NotFoundError(f"Block not found: {block_id}")
    defaults = block.model_dump(mode="json")
    defaults.pop("id", None)
    defaults.pop("block_type", None)
    defaults.pop("template_source_id", None)
    # Chapter-local timeline shade should not bake into reusable templates.
    defaults.pop("color_variant", None)
    template_name = (
        name or block.title or BLOCK_TYPE_LABELS.get(block.block_type, "Template")
    ).strip()
    if not template_name:
        template_name = f"{BLOCK_TYPE_LABELS.get(block.block_type, 'Block')} template"
    updated.block_templates.append(
        BlockTemplate(
            id=_new_id("tpl"),
            name=template_name,
            block_type=block.block_type,
            defaults=defaults,
        )
    )
    return updated


def delete_block(project: StoryProject, block_id: str) -> StoryProject:
    updated = project.model_copy(deep=True)
    if block_id not in updated.blocks:
        raise NotFoundError(f"Block not found: {block_id}")
    del updated.blocks[block_id]
    for chapter in updated.chapters:
        chapter.block_ids = [b for b in chapter.block_ids if b != block_id]
    updated.block_links = [
        link
        for link in updated.block_links
        if link.source_block_id != block_id and link.target_block_id != block_id
    ]
    return updated


def move_block(
    project: StoryProject,
    *,
    block_id: str,
    target_chapter_id: str,
    target_index: int | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    if block_id not in updated.blocks:
        raise NotFoundError(f"Block not found: {block_id}")
    target = _require_chapter(updated, target_chapter_id)
    source = next((c for c in updated.chapters if block_id in c.block_ids), None)
    if source is None:
        raise ValidationConflictError(f"Block is not assigned to any chapter: {block_id}")

    source.block_ids = [b for b in source.block_ids if b != block_id]
    insert_at = len(target.block_ids) if target_index is None else target_index
    insert_at = max(0, min(insert_at, len(target.block_ids)))
    # Avoid duplicate if moving within same chapter after removal.
    target.block_ids = [b for b in target.block_ids if b != block_id]
    target.block_ids.insert(insert_at, block_id)
    return updated


def clone_block(
    project: StoryProject,
    *,
    block_id: str,
    target_chapter_id: str,
    new_block_id: str | None = None,
) -> StoryProject:
    """Duplicate a block into another chapter; original and links stay put."""
    updated = project.model_copy(deep=True)
    existing = updated.blocks.get(block_id)
    if existing is None:
        raise NotFoundError(f"Block not found: {block_id}")
    target = _require_chapter(updated, target_chapter_id)
    payload = existing.model_dump()
    payload["id"] = new_block_id or _new_id("blk")
    # Group rosters are chapter-local; drop members not already in the target chapter.
    if existing.block_type == "group":
        target_ids = set(target.block_ids)
        payload["character_ids"] = [
            character_id
            for character_id in payload.get("character_ids", [])
            if character_id in target_ids
        ]
    cloned = parse_block(payload)
    updated.blocks[cloned.id] = cloned
    target.block_ids.append(cloned.id)
    _validate_block_refs(updated, cloned)
    return updated


def add_timeline_slots(project: StoryProject, count: int = 1) -> StoryProject:
    if count < 1:
        raise ValidationConflictError("count must be at least 1")
    updated = project.model_copy(deep=True)
    remaining = MAX_TIMELINE_SLOTS - len(updated.timeline_slots)
    if remaining <= 0:
        raise ValidationConflictError(
            f"Timeline already has the maximum of {MAX_TIMELINE_SLOTS} rows"
        )
    if count > remaining:
        raise ValidationConflictError(
            f"Cannot add {count} rows; only {remaining} remaining (max {MAX_TIMELINE_SLOTS})"
        )
    updated.timeline_slots.extend(default_timeline_slots(count))
    return updated


def update_timeline_slot(
    project: StoryProject,
    slot_id: str,
    *,
    name: str | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    slot = _require_timeline_slot(updated, slot_id)
    if name is not None:
        slot.name = name.strip()
        if slot.subplot_id:
            subplot = next((s for s in updated.subplots if s.id == slot.subplot_id), None)
            if subplot is not None and slot.name:
                subplot.name = slot.name
    return updated


def paint_timeline_slot_coverage(
    project: StoryProject,
    slot_id: str,
    chapter_ids: list[str],
) -> StoryProject:
    """Set chapter coverage for a slot; create/bind subplot when named coverage appears."""
    updated = project.model_copy(deep=True)
    slot = _require_timeline_slot(updated, slot_id)
    _assert_chapters_exist(updated, chapter_ids)
    unique = list(dict.fromkeys(chapter_ids))

    if slot.subplot_id is None:
        if not unique:
            return updated
        label = slot.name.strip() or "Untitled subplot"
        if not slot.name.strip():
            slot.name = label
        updated = add_subplot(
            updated,
            name=label,
            chapter_ids=unique,
        )
        slot = _require_timeline_slot(updated, slot_id)
        slot.subplot_id = updated.subplots[-1].id
        slot.name = label
        return updated

    return associate_subplot_chapters(updated, slot.subplot_id, unique)


def reorder_blocks_in_chapter(
    project: StoryProject,
    chapter_id: str,
    ordered_block_ids: list[str],
) -> StoryProject:
    updated = project.model_copy(deep=True)
    chapter = _require_chapter(updated, chapter_id)
    existing = list(chapter.block_ids)
    if len(ordered_block_ids) != len(set(ordered_block_ids)):
        raise ValidationConflictError("Block reorder list contains duplicates")
    if set(ordered_block_ids) != set(existing):
        raise ValidationConflictError(
            "Block reorder list must contain each chapter block exactly once"
        )
    chapter.block_ids = list(ordered_block_ids)
    return updated


def create_block_link(
    project: StoryProject,
    *,
    source_block_id: str,
    target_block_id: str,
    description: str = "",
    link_id: str | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    if source_block_id not in updated.blocks:
        raise NotFoundError(f"Source block not found: {source_block_id}")
    if target_block_id not in updated.blocks:
        raise NotFoundError(f"Target block not found: {target_block_id}")
    if source_block_id == target_block_id:
        raise ValidationConflictError("Cannot link a block to itself")

    for link in updated.block_links:
        same = {link.source_block_id, link.target_block_id} == {
            source_block_id,
            target_block_id,
        }
        if same:
            raise DuplicateLinkError("Block link already exists")

    updated.block_links.append(
        BlockLink(
            id=link_id or _new_id("lnk"),
            source_block_id=source_block_id,
            target_block_id=target_block_id,
            description=description,
        )
    )
    return updated


def delete_block_link(project: StoryProject, link_id: str) -> StoryProject:
    updated = project.model_copy(deep=True)
    before = len(updated.block_links)
    updated.block_links = [link for link in updated.block_links if link.id != link_id]
    if len(updated.block_links) == before:
        raise NotFoundError(f"Block link not found: {link_id}")
    return updated


def _require_chapter(project: StoryProject, chapter_id: str) -> Chapter:
    for chapter in project.chapters:
        if chapter.id == chapter_id:
            return chapter
    raise NotFoundError(f"Chapter not found: {chapter_id}")


def _require_plot(project: StoryProject, plot_id: str) -> Plot:
    for plot in project.plots:
        if plot.id == plot_id:
            return plot
    raise NotFoundError(f"Plot not found: {plot_id}")


def _require_subplot(project: StoryProject, subplot_id: str) -> Subplot:
    for subplot in project.subplots:
        if subplot.id == subplot_id:
            return subplot
    raise NotFoundError(f"Subplot not found: {subplot_id}")


def _require_timeline_slot(project: StoryProject, slot_id: str) -> TimelineSlot:
    for slot in project.timeline_slots:
        if slot.id == slot_id:
            return slot
    raise NotFoundError(f"Timeline slot not found: {slot_id}")


def _chapter_holding_block(project: StoryProject, block_id: str) -> Chapter | None:
    for chapter in project.chapters:
        if block_id in chapter.block_ids:
            return chapter
    return None


def _validate_block_refs(project: StoryProject, block: Any) -> None:
    block_type = getattr(block, "block_type", None)
    if block_type == "character":
        foil_id = getattr(block, "character_foil_id", None)
        if foil_id:
            foil = project.blocks.get(foil_id)
            if foil is None or foil.block_type not in {"character", "group"}:
                raise NotFoundError(f"Character foil target not found: {foil_id}")
            if foil_id == block.id:
                raise ValidationConflictError("Character cannot be its own foil")
    if block_type in {"group", "setting"}:
        label = "Group" if block_type == "group" else "Setting"
        chapter = _chapter_holding_block(project, block.id) if block_type == "group" else None
        chapter_block_ids = set(chapter.block_ids) if chapter is not None else set()
        for character_id in getattr(block, "character_ids", []):
            member = project.blocks.get(character_id)
            if member is None or member.block_type != "character":
                raise NotFoundError(f"{label} character not found: {character_id}")
            if (
                block_type == "group"
                and chapter is not None
                and character_id not in chapter_block_ids
            ):
                raise ValidationConflictError(
                    "Group character must belong to the same chapter as the group block"
                )
    if block_type == "dialogue":
        chapter = _chapter_holding_block(project, block.id)
        chapter_block_ids = set(chapter.block_ids) if chapter is not None else set()
        for line in getattr(block, "lines", []) or []:
            character_id = getattr(line, "character_id", None)
            if not character_id:
                continue
            member = project.blocks.get(character_id)
            if member is None or member.block_type != "character":
                raise NotFoundError(f"Dialogue character not found: {character_id}")
            if chapter is not None and character_id not in chapter_block_ids:
                raise ValidationConflictError(
                    "Dialogue character must belong to the same chapter as the dialogue block"
                )


def _next_setting_color_variant(project: StoryProject, chapter: Chapter) -> int:
    """Assign the next light→dark shade index for a new setting in the chapter."""
    variants = [
        int(getattr(project.blocks[block_id], "color_variant", 0))
        for block_id in chapter.block_ids
        if (existing := project.blocks.get(block_id)) is not None
        and existing.block_type == "setting"
    ]
    if not variants:
        return 0
    return max(variants) + 1


def _assert_chapters_exist(project: StoryProject, chapter_ids: list[str]) -> None:
    known = {c.id for c in project.chapters}
    for chapter_id in chapter_ids:
        if chapter_id not in known:
            raise NotFoundError(f"Chapter not found: {chapter_id}")


def _renumber_chapters(project: StoryProject) -> None:
    for index, chapter in enumerate(project.chapters):
        chapter.order = index
