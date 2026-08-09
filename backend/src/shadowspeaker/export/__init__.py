"""Export protocols and implementations for story context and writing style."""

from __future__ import annotations

from typing import Protocol

from shadowspeaker.domain.blocks import BLOCK_TYPE_LABELS, Block
from shadowspeaker.domain.models import Chapter, Plot, StoryProject, Subplot
from shadowspeaker.domain.review import collect_review_warnings


class StoryContextExporter(Protocol):
    def export(self, project: StoryProject) -> str: ...


class WritingStyleExporter(Protocol):
    def export(self, project: StoryProject) -> str: ...


class RetrievalIndexer(Protocol):
    async def index_story_context(self, project_id: str, content: str) -> None: ...

    async def index_writing_style(self, project_id: str, content: str) -> None: ...


def export_story_json(project: StoryProject) -> str:
    """Deterministic JSON story-development context (no UI state)."""
    return project.model_dump_json(indent=2)


def export_story_markdown(project: StoryProject) -> str:
    lines: list[str] = []
    lines.append(f"# {project.name}")
    lines.append("")
    lines.append("## Narrative Defaults")
    pov = project.narrative_defaults.point_of_view.value
    lines.append(f"- Point of view: `{pov}`")
    structural = list(project.narrative_defaults.structural_devices)
    structural_custom = project.narrative_defaults.structural_devices_custom
    if structural or structural_custom:
        devices = [d.value for d in structural]
        devices.extend(structural_custom)
        lines.append(f"- Structural devices: `{', '.join(devices)}`")
    lines.append("")

    warnings = collect_review_warnings(project)
    if warnings:
        lines.append("## Review Warnings")
        for warning in warnings:
            lines.append(f"- [{warning.code}] {warning.message}")
        lines.append("")

    if project.plots:
        lines.append("## Plots")
        for plot in sorted(project.plots, key=lambda p: p.name.lower()):
            lines.append(f"### {plot.name}")
            if plot.description:
                lines.append(plot.description)
            _append_plot_craft(lines, plot)
            if plot.chapter_ids:
                titles = _chapter_titles(project, plot.chapter_ids)
                lines.append(f"- Chapters: {', '.join(titles)}")
            lines.append("")

    if project.subplots:
        lines.append("## Subplots")
        for subplot in sorted(project.subplots, key=lambda s: s.name.lower()):
            lines.append(f"### {subplot.name}")
            if subplot.description:
                lines.append(subplot.description)
            _append_plot_craft(lines, subplot)
            if subplot.phases:
                for index, phase in enumerate(subplot.phases, start=1):
                    if phase.description.strip():
                        lines.append(f"- Phase {index}: {phase.description.strip()}")
            if subplot.chapter_ids:
                titles = _chapter_titles(project, subplot.chapter_ids)
                lines.append(f"- Chapters: {', '.join(titles)}")
            if subplot.related_subplot_ids:
                names = _subplot_names(project, subplot.related_subplot_ids)
                lines.append(f"- Related subplots: {', '.join(names)}")
            lines.append("")

    lines.append("## Chapters")
    ordered = sorted(project.chapters, key=lambda c: c.order)
    for chapter in ordered:
        heading = chapter.title
        if chapter.subtitle:
            heading = f"{chapter.title}: {chapter.subtitle}"
        lines.append(f"### {heading}")
        if chapter.description:
            lines.append(chapter.description)
        lines.append(f"- Timescale: `{chapter.timescale.value}`")
        if chapter.point_of_view_override is not None:
            lines.append(f"- POV override: `{chapter.point_of_view_override.value}`")
        if chapter.pacing_devices or chapter.pacing_devices_custom:
            devices = [d.value for d in chapter.pacing_devices]
            devices.extend(chapter.pacing_devices_custom)
            lines.append(f"- Pacing devices: `{', '.join(devices)}`")
        if chapter.syntactic_pacing_notes.strip():
            lines.append(f"- Syntactic pacing notes: {chapter.syntactic_pacing_notes.strip()}")
        if chapter.suspense_mechanisms or chapter.suspense_custom:
            parts = [m.value for m in chapter.suspense_mechanisms] + list(chapter.suspense_custom)
            lines.append(f"- Suspense mechanisms: {', '.join(parts)}")
        _append_writing_texture(lines, chapter)
        if chapter.subplot_ids:
            names = _subplot_names(project, chapter.subplot_ids)
            lines.append(f"- Associated subplots: {', '.join(names)}")
        lines.append("")
        if chapter.block_ids:
            lines.append("#### Blocks")
            for block_id in chapter.block_ids:
                block = project.blocks.get(block_id)
                if block is None:
                    continue
                label = BLOCK_TYPE_LABELS.get(block.block_type, block.block_type)
                title = block.title or label
                lines.append(f"##### {label}: {title}")
                _append_block_fields(lines, block, project)
                related = [
                    link
                    for link in project.block_links
                    if link.source_block_id == block_id or link.target_block_id == block_id
                ]
                for link in related:
                    other = (
                        link.target_block_id
                        if link.source_block_id == block_id
                        else link.source_block_id
                    )
                    other_block = project.blocks.get(other)
                    other_title = other_block.title if other_block else other
                    desc = f" — {link.description}" if link.description else ""
                    lines.append(f"- Linked to: {other_title}{desc}")
                lines.append("")
        else:
            lines.append("_No blocks yet._")
            lines.append("")

    if project.block_links:
        lines.append("## Cross-Chapter Block Relationships")
        for link in sorted(project.block_links, key=lambda item: item.id):
            source = project.blocks.get(link.source_block_id)
            target = project.blocks.get(link.target_block_id)
            source_title = source.title if source else link.source_block_id
            target_title = target.title if target else link.target_block_id
            desc = f" ({link.description})" if link.description else ""
            lines.append(f"- {source_title} → {target_title}{desc}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def export_writing_style(project: StoryProject) -> str:
    material = project.writing_style_material or project.narrative_defaults.writing_style_material
    lines = [
        f"# Writing Style — {project.name}",
        "",
        material.strip() if material.strip() else "_No writing-style material defined._",
        "",
    ]
    return "\n".join(lines)


def export_agent_writing_pack(project: StoryProject) -> str:
    """Single Markdown reference for chapter-by-chapter agent writing."""
    lines: list[str] = []
    style = (
        project.writing_style_material or project.narrative_defaults.writing_style_material
    ).strip()
    ordered = sorted(project.chapters, key=lambda c: c.order)

    lines.append(f"# Agent Writing Pack — {project.name}")
    lines.append("")
    lines.append("## Usage")
    lines.append("- Write exactly one chapter pack at a time, in order.")
    lines.append(
        "- Treat Global Continuity and prior continuity summaries as hard constraints."
    )
    lines.append(
        "- After writing chapter N, update that chapter's Draft Prose and Continuity "
        "Summary in the project; do not invent contradicting canon."
    )
    lines.append("")

    lines.append("## Global Continuity")
    lines.append("")
    lines.append("### Writing Style")
    lines.append(style if style else "_No writing-style material defined._")
    lines.append("")
    lines.append("### Narrative Defaults")
    pov = project.narrative_defaults.point_of_view.value
    lines.append(f"- Point of view: `{pov}`")
    structural = list(project.narrative_defaults.structural_devices)
    structural_custom = project.narrative_defaults.structural_devices_custom
    if structural or structural_custom:
        devices = [d.value for d in structural]
        devices.extend(structural_custom)
        lines.append(f"- Structural devices: `{', '.join(devices)}`")
    lines.append("")

    warnings = collect_review_warnings(project)
    if warnings:
        lines.append("### Review Warnings")
        for warning in warnings:
            lines.append(f"- [{warning.code}] {warning.message}")
        lines.append("")

    lines.append("### Plots and Subplots")
    if not project.plots and not project.subplots:
        lines.append("_No plots or subplots defined._")
        lines.append("")
    else:
        for plot in sorted(project.plots, key=lambda p: p.name.lower()):
            lines.append(f"#### Plot: {plot.name}")
            if plot.description:
                lines.append(plot.description)
            _append_plot_craft(lines, plot)
            if plot.chapter_ids:
                titles = _chapter_titles(project, plot.chapter_ids)
                lines.append(f"- Chapters: {', '.join(titles)}")
            if plot.related_plot_ids:
                names = _plot_names(project, plot.related_plot_ids)
                lines.append(f"- Related plots: {', '.join(names)}")
            lines.append("")
        for subplot in sorted(project.subplots, key=lambda s: s.name.lower()):
            lines.append(f"#### Subplot: {subplot.name}")
            if subplot.description:
                lines.append(subplot.description)
            _append_plot_craft(lines, subplot)
            if subplot.phases:
                for index, phase in enumerate(subplot.phases, start=1):
                    if phase.description.strip():
                        lines.append(f"- Phase {index}: {phase.description.strip()}")
            if subplot.chapter_ids:
                titles = _chapter_titles(project, subplot.chapter_ids)
                lines.append(f"- Chapters: {', '.join(titles)}")
            if subplot.related_subplot_ids:
                names = _subplot_names(project, subplot.related_subplot_ids)
                lines.append(f"- Related subplots: {', '.join(names)}")
            lines.append("")

    lines.append("### Story Canon")
    canon_blocks = [
        project.blocks[block_id]
        for block_id in sorted(project.blocks.keys())
        if _block_has_content(project.blocks[block_id])
    ]
    if not canon_blocks:
        lines.append("_No story-canon blocks with content yet._")
        lines.append("")
    else:
        by_type: dict[str, list[Block]] = {}
        for block in canon_blocks:
            by_type.setdefault(block.block_type, []).append(block)
        for block_type in sorted(by_type.keys()):
            label = BLOCK_TYPE_LABELS.get(block_type, block_type)
            lines.append(f"#### {label}")
            typed_blocks = sorted(by_type[block_type], key=lambda b: (b.title or "").lower())
            for block in typed_blocks:
                title = block.title or label
                lines.append(f"##### {title}")
                _append_block_fields(lines, block, project)
                lines.append("")

    lines.append("### Cross-Chapter Block Links")
    if not project.block_links:
        lines.append("_No block links._")
        lines.append("")
    else:
        for link in sorted(project.block_links, key=lambda item: item.id):
            source = project.blocks.get(link.source_block_id)
            target = project.blocks.get(link.target_block_id)
            source_title = source.title if source else link.source_block_id
            target_title = target.title if target else link.target_block_id
            desc = f" — {link.description}" if link.description else ""
            lines.append(f"- {source_title} → {target_title}{desc}")
        lines.append("")

    lines.append("## Chapter Packs")
    lines.append("")
    if not ordered:
        lines.append("_No chapters yet._")
        lines.append("")
    else:
        for index, chapter in enumerate(ordered, start=1):
            heading = chapter.title
            if chapter.subtitle:
                heading = f"{chapter.title}: {chapter.subtitle}"
            lines.append(f"### Chapter {index}: {heading}  `{chapter.id}`")
            lines.append("")
            lines.append("#### Brief")
            if chapter.description:
                lines.append(chapter.description)
            else:
                lines.append("_No chapter brief._")
            lines.append(f"- Timescale: `{chapter.timescale.value}`")
            pov = (
                chapter.point_of_view_override.value
                if chapter.point_of_view_override is not None
                else project.narrative_defaults.point_of_view.value
            )
            lines.append(f"- Effective POV: `{pov}`")
            if chapter.subplot_ids:
                names = _subplot_names(project, chapter.subplot_ids)
                lines.append(f"- Associated subplots: {', '.join(names)}")
            lines.append("")

            lines.append("#### Writing Texture")
            texture = chapter.writing_texture
            if texture.total() == 0:
                lines.append(
                    "_No writing-texture points assigned — keep literary flourishes restrained._"
                )
            else:
                lines.append(
                    f"Density budget for a ~3000–4000 word chapter "
                    f"(`{texture.total()} / 160` points assigned). Constrain prose flourishes "
                    "to these weighted techniques:"
                )
                _append_writing_texture(lines, chapter, compact=False)
            lines.append("")

            lines.append("#### Local Blocks")
            if not chapter.block_ids:
                lines.append("_No blocks in this chapter._")
                lines.append("")
            else:
                for block_id in chapter.block_ids:
                    local_block = project.blocks.get(block_id)
                    if local_block is None:
                        continue
                    label = BLOCK_TYPE_LABELS.get(
                        local_block.block_type, local_block.block_type
                    )
                    title = local_block.title or label
                    lines.append(f"##### {label}: {title}")
                    _append_block_fields(lines, local_block, project)
                    lines.append("")

            lines.append("#### Prior Continuity")
            priors = ordered[: index - 1]
            if not priors:
                lines.append("_None yet — this is the first chapter._")
            else:
                for prior in priors:
                    summary = prior.continuity_summary.strip()
                    prior_heading = prior.title
                    if prior.subtitle:
                        prior_heading = f"{prior.title}: {prior.subtitle}"
                    if summary:
                        lines.append(f"- **{prior_heading}**: {summary}")
                    else:
                        lines.append(
                            f"- **{prior_heading}**: _No continuity summary recorded._"
                        )
            lines.append("")

            lines.append("#### Current Continuity Summary")
            current_summary = chapter.continuity_summary.strip()
            lines.append(
                current_summary if current_summary else "_Not recorded yet._"
            )
            lines.append("")

            lines.append("#### Current Draft")
            draft = chapter.draft_prose.strip()
            lines.append(draft if draft else "_Not written yet._")
            lines.append("")

            lines.append("#### Agent Task")
            lines.append(
                "Produce or revise draft prose for this chapter only, consistent with "
                "Global Continuity and Prior Continuity. Then write or update the "
                "continuity summary with irreversible facts later chapters must honor."
            )
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"


class MarkdownStoryContextExporter:
    def export(self, project: StoryProject) -> str:
        return export_story_markdown(project)


class PlainWritingStyleExporter:
    def export(self, project: StoryProject) -> str:
        return export_writing_style(project)


def _append_plot_craft(lines: list[str], item: Plot | Subplot) -> None:
    if item.inciting_incident.strip():
        lines.append(f"- Inciting incident: {item.inciting_incident.strip()}")
    if item.macguffin.strip():
        lines.append(f"- MacGuffin: {item.macguffin.strip()}")
    if item.plot_twist.strip():
        lines.append(f"- Plot twist: {item.plot_twist.strip()}")
    if item.deus_ex_machina.strip():
        lines.append(f"- Deus ex machina: {item.deus_ex_machina.strip()}")


_WRITING_TEXTURE_LABELS = {
    "rule_of_three": "Rule of Three",
    "emotional_flatlining": "Emotional Flatlining",
    "metaphor_stacking": "Metaphor Stacking",
    "list_rhythm_stacking": "List Rhythm Stacking",
    "subject_x_vs_subject_y": "Subject X vs Subject Y contrast",
    "metaphor_with_personification": "Metaphor with Personification",
    "clean_pivot_sentences": "Clean Pivot Sentences",
    "over_dramatic_metaphor": "Over Dramatic Metaphor",
    "emotional_shorthand_stacking": "Emotional Short-hand stacking",
}


def _append_writing_texture(
    lines: list[str],
    chapter: Chapter,
    *,
    compact: bool = True,
) -> None:
    texture = chapter.writing_texture
    assigned = [
        (field, int(getattr(texture, field)))
        for field in _WRITING_TEXTURE_LABELS
        if int(getattr(texture, field)) > 0
    ]
    if not assigned:
        return
    if compact:
        parts = [
            f"{_WRITING_TEXTURE_LABELS[field]} `{value}`" for field, value in assigned
        ]
        lines.append(
            f"- Writing texture ({texture.total()} / 160): {', '.join(parts)}"
        )
        return
    for field, value in assigned:
        lines.append(f"- {_WRITING_TEXTURE_LABELS[field]}: `{value}`")


def _append_block_fields(
    lines: list[str],
    block: Block,
    project: StoryProject | None = None,
) -> None:
    if block.block_type == "dialogue":
        _append_dialogue_script(lines, block, project)
        return
    for key, value in block.model_dump().items():
        if key in {"id", "block_type", "title"}:
            continue
        if value in ("", [], None):
            continue
        field_label = key.replace("_", " ").title()
        if isinstance(value, list):
            lines.append(f"- {field_label}: {', '.join(map(str, value))}")
        else:
            lines.append(f"- {field_label}: {value}")


def _append_dialogue_script(
    lines: list[str],
    block: Block,
    project: StoryProject | None = None,
) -> None:
    script_lines = getattr(block, "lines", []) or []
    if not script_lines:
        return
    lines.append("- Script:")
    for index, line in enumerate(script_lines, start=1):
        speaker = (getattr(line, "character_label", "") or "").strip()
        character_id = getattr(line, "character_id", None)
        if character_id and project is not None:
            character = project.blocks.get(character_id)
            if character is not None and (character.title or "").strip():
                speaker = character.title.strip()
        if not speaker and character_id:
            speaker = character_id
        if not speaker:
            speaker = "—"
        mode = "internal monologue" if getattr(line, "internal_monologue", False) else "dialogue"
        flags: list[str] = [mode]
        if getattr(line, "overheard", False):
            flags.append("overheard")
        if getattr(line, "fourth_wall", False):
            flags.append("fourth wall")
        conversation = (getattr(line, "conversation", "") or "").strip() or "…"
        entry = f"  {index}. {speaker} ({', '.join(flags)}): {conversation}"
        lines.append(entry)
        action = (getattr(line, "action", "") or "").strip()
        if action:
            lines.append(f"     Action: {action}")
        emotion = (getattr(line, "emotional_state", "") or "").strip()
        if emotion:
            lines.append(f"     Emotion: {emotion}")
        volume = (getattr(line, "volume", "") or "").strip()
        if volume:
            lines.append(f"     Volume: {volume}")
        subtext = (getattr(line, "subtext", "") or "").strip()
        if subtext:
            lines.append(f"     Subtext: {subtext}")


def _block_has_content(block: Block) -> bool:
    if block.block_type == "dialogue":
        for line in getattr(block, "lines", []) or []:
            if any(
                [
                    (getattr(line, "conversation", "") or "").strip(),
                    (getattr(line, "action", "") or "").strip(),
                    (getattr(line, "subtext", "") or "").strip(),
                    (getattr(line, "emotional_state", "") or "").strip(),
                    (getattr(line, "volume", "") or "").strip(),
                    getattr(line, "character_id", None),
                    (getattr(line, "character_label", "") or "").strip(),
                ]
            ):
                return True
        return bool(block.title.strip())
    for key, value in block.model_dump().items():
        if key in {"id", "block_type", "title"}:
            continue
        if value not in ("", [], None):
            return True
    return bool(block.title.strip())

def _chapter_titles(project: StoryProject, chapter_ids: list[str]) -> list[str]:
    by_id = {c.id: c for c in project.chapters}
    titles: list[str] = []
    for cid in chapter_ids:
        chapter = by_id.get(cid)
        titles.append(chapter.title if chapter else cid)
    return titles


def _subplot_names(project: StoryProject, subplot_ids: list[str]) -> list[str]:
    by_id = {s.id: s for s in project.subplots}
    names: list[str] = []
    for sid in subplot_ids:
        subplot = by_id.get(sid)
        names.append(subplot.name if subplot else sid)
    return names


def _plot_names(project: StoryProject, plot_ids: list[str]) -> list[str]:
    by_id = {p.id: p for p in project.plots}
    names: list[str] = []
    for pid in plot_ids:
        plot = by_id.get(pid)
        names.append(plot.name if plot else pid)
    return names
