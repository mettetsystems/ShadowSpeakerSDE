"""Pure project mutation helpers. No I/O."""

from __future__ import annotations

import copy
import uuid
from typing import Any

from shadowspeaker.domain.blocks import (
    BLOCK_TYPE_LABELS,
    DEFAULT_BLOCK_TITLES,
    empty_block_payload,
)
from shadowspeaker.domain.models import (
    BlockLink,
    BlockTemplate,
    Chapter,
    NarrativePointOfView,
    Plot,
    StoryProject,
    Subplot,
    Timescale,
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


def create_project(name: str, project_id: str | None = None) -> StoryProject:
    return StoryProject(
        id=project_id or _new_id("proj"),
        name=name.strip() or "Untitled Story",
        block_templates=default_block_templates(),
    )


def update_narrative_defaults(
    project: StoryProject,
    *,
    point_of_view: NarrativePointOfView | None = None,
    writing_style_material: str | None = None,
) -> StoryProject:
    updated = project.model_copy(deep=True)
    defaults = updated.narrative_defaults.model_copy()
    if point_of_view is not None:
        defaults.point_of_view = point_of_view
    if writing_style_material is not None:
        defaults.writing_style_material = writing_style_material
        updated.writing_style_material = writing_style_material
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
    )
    updated.subplots.append(subplot)
    for chapter in updated.chapters:
        if chapter.id in subplot.chapter_ids and subplot.id not in chapter.subplot_ids:
            chapter.subplot_ids.append(subplot.id)
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
        data[key] = value
    updated.blocks[block_id] = parse_block(data)
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


def _require_subplot(project: StoryProject, subplot_id: str) -> Subplot:
    for subplot in project.subplots:
        if subplot.id == subplot_id:
            return subplot
    raise NotFoundError(f"Subplot not found: {subplot_id}")


def _assert_chapters_exist(project: StoryProject, chapter_ids: list[str]) -> None:
    known = {c.id for c in project.chapters}
    for chapter_id in chapter_ids:
        if chapter_id not in known:
            raise NotFoundError(f"Chapter not found: {chapter_id}")


def _renumber_chapters(project: StoryProject) -> None:
    for index, chapter in enumerate(project.chapters):
        chapter.order = index
