"""Soft review warnings for craft multi-select and duplicate dialogue."""

from __future__ import annotations

import re
from dataclasses import dataclass

from shadowspeaker.domain.models import StoryProject

_WHITESPACE = re.compile(r"\s+")


@dataclass(frozen=True)
class ReviewWarning:
    code: str
    message: str
    chapter_id: str | None = None
    block_id: str | None = None


def normalize_dialogue(text: str) -> str:
    return _WHITESPACE.sub(" ", text.strip().lower())


def collect_review_warnings(project: StoryProject) -> list[ReviewWarning]:
    warnings: list[ReviewWarning] = []

    structural_count = len(project.narrative_defaults.structural_devices) + len(
        project.narrative_defaults.structural_devices_custom
    )
    if structural_count > 1:
        warnings.append(
            ReviewWarning(
                code="multi_structural_devices",
                message=(
                    f"Project has {structural_count} structural devices selected "
                    "(soft lock: prefer one primary structure)."
                ),
            )
        )

    for chapter in project.chapters:
        pacing_count = len(chapter.pacing_devices) + len(chapter.pacing_devices_custom)
        if pacing_count > 1:
            warnings.append(
                ReviewWarning(
                    code="multi_pacing_devices",
                    message=(
                        f"Chapter “{chapter.title}” has {pacing_count} "
                        "pacing devices selected (soft lock)."
                    ),
                    chapter_id=chapter.id,
                )
            )
        suspense_count = len(chapter.suspense_mechanisms) + len(chapter.suspense_custom)
        if suspense_count > 1:
            warnings.append(
                ReviewWarning(
                    code="multi_suspense",
                    message=(
                        f"Chapter “{chapter.title}” has {suspense_count} suspense "
                        "mechanisms selected (soft lock)."
                    ),
                    chapter_id=chapter.id,
                )
            )

    by_text: dict[str, list[str]] = {}
    for block_id, block in project.blocks.items():
        if block.block_type != "dialogue":
            continue
        for line in getattr(block, "lines", []) or []:
            conversation = getattr(line, "conversation", "") or ""
            normalized = normalize_dialogue(conversation)
            if not normalized:
                continue
            by_text.setdefault(normalized, []).append(block_id)

    for block_ids in by_text.values():
        # Same text can appear once per block; flag only when shared across blocks.
        unique_blocks = list(dict.fromkeys(block_ids))
        if len(unique_blocks) < 2:
            continue
        titles = []
        for block_id in unique_blocks:
            block = project.blocks[block_id]
            titles.append(block.title or block_id)
        warnings.append(
            ReviewWarning(
                code="duplicate_dialogue",
                message=(
                    "Duplicate dialogue conversation found across blocks: "
                    + ", ".join(titles)
                ),
                block_id=unique_blocks[0],
            )
        )

    return warnings
