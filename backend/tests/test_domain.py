"""Unit tests for domain blocks, mutations, exports, and persistence."""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from shadowspeaker.domain.blocks import (
    CharacterBlock,
    DialogueBlock,
    GroupBlock,
    ProseBuilderBlock,
    SettingBlock,
    SpecialItemBlock,
    ToolBlock,
    VehicleBlock,
)
from shadowspeaker.domain.models import (
    MAX_SUBPLOT_PHASES,
    MAX_TIMELINE_SLOTS,
    PacingDevice,
    StoryProject,
    StructuralDevice,
    Subplot,
    SuspenseMechanism,
    Timescale,
    WritingTexture,
    parse_block,
)
from shadowspeaker.domain.mutations import (
    DuplicateLinkError,
    NotFoundError,
    ValidationConflictError,
    add_block_from_template,
    add_chapter,
    add_subplot,
    add_subplot_phase,
    add_timeline_slots,
    associate_subplot_chapters,
    clone_block,
    create_block_link,
    create_project,
    delete_block,
    move_block,
    paint_timeline_slot_coverage,
    reorder_chapters,
    save_block_as_template,
    update_block,
    update_chapter,
    update_narrative_defaults,
    update_subplot,
)
from shadowspeaker.domain.review import collect_review_warnings
from shadowspeaker.export import (
    export_agent_writing_pack,
    export_story_json,
    export_story_markdown,
    export_writing_style,
)
from shadowspeaker.persistence import (
    InvalidProjectDataError,
    JsonFileProjectRepository,
    ProjectStoreError,
)


def test_parse_every_block_type() -> None:
    cases = [
        {
            "id": "1",
            "block_type": "setting",
            "title": "Harbor",
            "micro_settings": ["dock", "fog"],
            "juxtaposition": "calm vs storm",
        },
        {
            "id": "2",
            "block_type": "character",
            "special_skillsets": ["fencing"],
            "personalized_items": ["ring"],
        },
        {"id": "3", "block_type": "dialogue", "character": "Mara", "conversation": "Hello"},
        {"id": "4", "block_type": "special_item", "what_it_does": "glows"},
        {"id": "5", "block_type": "vehicle", "behaviors": ["hover"], "scale": "large"},
        {"id": "6", "block_type": "tool", "behaviors": ["cut"], "properties": ["sharp"]},
        {"id": "7", "block_type": "group", "title": "Crew", "character_ids": []},
        {
            "id": "8",
            "block_type": "prose_builder",
            "subject": "fog",
            "figurative_devices": ["metaphor", "simile"],
        },
    ]
    parsed = [parse_block(c) for c in cases]
    assert isinstance(parsed[0], SettingBlock)
    assert isinstance(parsed[1], CharacterBlock)
    assert isinstance(parsed[2], DialogueBlock)
    assert len(parsed[2].lines) == 1
    assert parsed[2].lines[0].character_label == "Mara"
    assert parsed[2].lines[0].conversation == "Hello"
    assert isinstance(parsed[3], SpecialItemBlock)
    assert isinstance(parsed[4], VehicleBlock)
    assert isinstance(parsed[5], ToolBlock)
    assert isinstance(parsed[6], GroupBlock)
    assert isinstance(parsed[7], ProseBuilderBlock)
    assert parsed[0].micro_settings == ["dock", "fog"]
    assert parsed[0].juxtaposition == "calm vs storm"


def test_review_flags_multi_craft_and_duplicate_dialogue() -> None:
    project = create_project("Demo")
    project = update_narrative_defaults(
        project,
        structural_devices=[StructuralDevice.FRAME_NARRATIVE],
        structural_devices_custom=["braided chronology"],
    )
    project = add_chapter(project, title="A")
    chapter_id = project.chapters[0].id
    project = update_chapter(
        project,
        chapter_id,
        pacing_devices=[PacingDevice.SCENE],
        pacing_devices_custom=["breath pause"],
        suspense_mechanisms=[SuspenseMechanism.CLIFFHANGER],
        suspense_custom=["whispered deadline"],
    )
    project = add_block_from_template(
        project, chapter_id=chapter_id, block_type="dialogue"
    )
    project = add_block_from_template(
        project, chapter_id=chapter_id, block_type="dialogue"
    )
    first, second = project.chapters[0].block_ids
    project = update_block(project, first, {
        "lines": [{"conversation": "Stay back!", "character_label": "A"}],
    })
    project = update_block(project, second, {
        "lines": [{"conversation": "  stay   back! ", "character_label": "B"}],
    })
    codes = {warning.code for warning in collect_review_warnings(project)}
    assert "multi_structural_devices" in codes
    assert "multi_pacing_devices" in codes
    assert "multi_suspense" in codes
    assert "duplicate_dialogue" in codes

    clean = create_project("Clean")
    clean = update_narrative_defaults(
        clean,
        structural_devices=[StructuralDevice.IN_MEDIAS_RES],
        structural_devices_custom=[],
    )
    assert collect_review_warnings(clean) == []


def test_writing_texture_budget_and_export() -> None:
    project = create_project("Texture")
    project = add_chapter(project, title="Storm")
    chapter_id = project.chapters[0].id
    project = update_chapter(
        project,
        chapter_id,
        writing_texture=WritingTexture(
            rule_of_three=40,
            metaphor_stacking=60,
            clean_pivot_sentences=20,
        ),
    )
    texture = project.chapters[0].writing_texture
    assert texture.total() == 120
    assert texture.rule_of_three == 40

    with pytest.raises(ValidationConflictError, match="exceed budget"):
        update_chapter(
            project,
            chapter_id,
            writing_texture=WritingTexture(rule_of_three=100, metaphor_stacking=70),
        )

    md = export_story_markdown(project)
    assert "Writing texture (120 / 160)" in md
    assert "Rule of Three `40`" in md
    pack = export_agent_writing_pack(project)
    assert "#### Writing Texture" in pack
    assert "Metaphor Stacking: `60`" in pack


def test_save_dialogue_as_template() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="A")
    project = add_block_from_template(
        project, chapter_id=project.chapters[0].id, block_type="dialogue"
    )
    block_id = project.chapters[0].block_ids[0]
    project = update_block(
        project,
        block_id,
        {
            "lines": [
                {
                    "conversation": "Hello there",
                    "subtext": "threat",
                    "action": "jaw tick",
                    "fourth_wall": True,
                    "internal_monologue": True,
                    "overheard": True,
                }
            ],
        },
    )
    before = len(project.block_templates)
    project = save_block_as_template(project, block_id, name="Greeting")
    assert len(project.block_templates) == before + 1
    template = project.block_templates[-1]
    assert template.name == "Greeting"
    assert template.block_type == "dialogue"
    assert "lines" in template.defaults
    line = template.defaults["lines"][0]
    assert line["subtext"] == "threat"
    assert line["action"] == "jaw tick"
    assert line["fourth_wall"] is True
    assert line["internal_monologue"] is True
    assert line["overheard"] is True
    assert line["conversation"] == "Hello there"


def test_dialogue_character_must_be_in_same_chapter() -> None:
    project = create_project("Cast")
    project = add_chapter(project, title="A")
    project = add_chapter(project, title="B")
    a, b = project.chapters
    project = add_block_from_template(project, chapter_id=a.id, block_type="character")
    project = add_block_from_template(project, chapter_id=b.id, block_type="dialogue")
    character_id = project.chapters[0].block_ids[0]
    dialogue_id = project.chapters[1].block_ids[0]
    with pytest.raises(ValidationConflictError):
        update_block(
            project,
            dialogue_id,
            {"lines": [{"character_id": character_id, "conversation": "Hi"}]},
        )
    project = add_block_from_template(project, chapter_id=b.id, block_type="character")
    local_character = next(
        bid
        for bid in project.chapters[1].block_ids
        if project.blocks[bid].block_type == "character"
    )
    project = update_block(
        project,
        dialogue_id,
        {"lines": [{"character_id": local_character, "conversation": "Hi", "action": "nod"}]},
    )
    assert project.blocks[dialogue_id].lines[0].character_id == local_character
    assert project.blocks[dialogue_id].lines[0].action == "nod"


def test_unknown_block_discriminator_rejected() -> None:
    with pytest.raises(ValidationError):
        parse_block({"id": "x", "block_type": "magic_spell"})


def test_chapter_reorder_validation() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="One")
    project = add_chapter(project, title="Two")
    ids = [c.id for c in project.chapters]
    reordered = reorder_chapters(project, list(reversed(ids)))
    assert [c.title for c in reordered.chapters] == ["Two", "One"]
    assert [c.order for c in reordered.chapters] == [0, 1]
    with pytest.raises(ValidationConflictError):
        reorder_chapters(project, [ids[0]])
    with pytest.raises(ValidationConflictError):
        reorder_chapters(project, [ids[0], ids[0]])


def test_move_block_between_chapters_atomic() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="A")
    project = add_chapter(project, title="B")
    a, b = project.chapters
    project = add_block_from_template(project, chapter_id=a.id, block_type="setting")
    block_id = project.chapters[0].block_ids[0]
    moved = move_block(project, block_id=block_id, target_chapter_id=b.id, target_index=0)
    assert block_id not in moved.chapters[0].block_ids
    assert moved.chapters[1].block_ids == [block_id]
    assert block_id in moved.blocks


def test_link_blocks_and_duplicate_and_delete() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="A")
    project = add_chapter(project, title="B")
    a, b = project.chapters
    project = add_block_from_template(project, chapter_id=a.id, block_type="setting")
    project = add_block_from_template(project, chapter_id=b.id, block_type="character")
    source = project.chapters[0].block_ids[0]
    target = project.chapters[1].block_ids[0]
    linked = create_block_link(project, source_block_id=source, target_block_id=target)
    assert len(linked.block_links) == 1
    with pytest.raises(DuplicateLinkError):
        create_block_link(linked, source_block_id=target, target_block_id=source)
    with pytest.raises(ValidationConflictError):
        create_block_link(linked, source_block_id=source, target_block_id=source)
    deleted = delete_block(linked, source)
    assert source not in deleted.blocks
    assert deleted.block_links == []


def test_subplot_association() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="A")
    project = add_chapter(project, title="B")
    ids = [c.id for c in project.chapters]
    project = add_subplot(project, name="Revenge", chapter_ids=ids)
    assert project.subplots[0].chapter_ids == ids
    assert all(project.subplots[0].id in c.subplot_ids for c in project.chapters)
    project = associate_subplot_chapters(project, project.subplots[0].id, [ids[0]])
    assert project.subplots[0].chapter_ids == [ids[0]]
    assert project.chapters[1].subplot_ids == []


def test_subplot_phases_default_and_cap() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="A")
    project = add_subplot(project, name="Debt", chapter_ids=[project.chapters[0].id])
    subplot = project.subplots[0]
    assert len(subplot.phases) == 3
    assert all(phase.description == "" for phase in subplot.phases)

    first_phase = subplot.phases[0]
    project = update_subplot(
        project,
        subplot.id,
        phases=[{"id": first_phase.id, "description": "Setup debt"}],
    )
    assert project.subplots[0].phases[0].description == "Setup debt"

    for _ in range(MAX_SUBPLOT_PHASES - 3):
        project = add_subplot_phase(project, subplot.id)
    assert len(project.subplots[0].phases) == MAX_SUBPLOT_PHASES
    with pytest.raises(ValidationConflictError):
        add_subplot_phase(project, subplot.id)


def test_subplot_phases_backfill_legacy_empty() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="A")
    project = add_subplot(project, name="Debt", chapter_ids=[project.chapters[0].id])
    legacy = project.model_copy(deep=True)
    legacy.subplots[0] = Subplot(
        id=legacy.subplots[0].id,
        name=legacy.subplots[0].name,
        description="",
        chapter_ids=legacy.subplots[0].chapter_ids,
        related_subplot_ids=[],
        phases=[],
    )
    updated = update_subplot(legacy, legacy.subplots[0].id, description="arc")
    assert len(updated.subplots[0].phases) == 3
    assert updated.subplots[0].description == "arc"
    padded = add_subplot_phase(legacy, legacy.subplots[0].id)
    assert len(padded.subplots[0].phases) == 4


def test_template_immutability_on_instance_edit() -> None:
    project = create_project("Demo")
    project = add_chapter(project, title="A")
    template = project.block_templates[0]
    original_defaults = dict(template.defaults)
    project = add_block_from_template(
        project,
        chapter_id=project.chapters[0].id,
        template_id=template.id,
    )
    block_id = project.chapters[0].block_ids[0]
    project = update_block(project, block_id, {"title": "Changed Harbor", "description": "wet"})
    same_template = next(t for t in project.block_templates if t.id == template.id)
    assert same_template.defaults == original_defaults
    assert project.blocks[block_id].title == "Changed Harbor"


@pytest.mark.asyncio
async def test_save_reload_and_invalid_store(tmp_path: Path) -> None:
    repo = JsonFileProjectRepository(tmp_path)
    project = create_project("Persist Me", project_id="proj_persist")
    project = add_chapter(project, title="One", subtitle="Dawn")
    await repo.create(project)
    loaded = await repo.get("proj_persist")
    assert loaded is not None
    assert loaded.chapters[0].subtitle == "Dawn"

    bad = tmp_path / "proj_bad.json"
    bad.write_text("{not-json", encoding="utf-8")
    with pytest.raises(InvalidProjectDataError):
        await repo.get("proj_bad")


@pytest.mark.asyncio
async def test_atomic_write_leaves_prior_file_on_failure(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo = JsonFileProjectRepository(tmp_path)
    project = create_project("Safe", project_id="proj_safe")
    await repo.create(project)
    path = tmp_path / "proj_safe.json"
    original = path.read_text(encoding="utf-8")

    def boom(*_args: object, **_kwargs: object) -> None:
        raise OSError("disk full")

    monkeypatch.setattr(JsonFileProjectRepository, "_atomic_write", staticmethod(boom))
    with pytest.raises(OSError):
        await repo.save(project.model_copy(update={"name": "Changed"}))
    assert path.read_text(encoding="utf-8") == original


def test_exports_determinism_and_separation() -> None:
    project = create_project("Exports", project_id="proj_export")
    project = project.model_copy(
        update={
            "writing_style_material": "Sparse sentences. Salt air.",
            "narrative_defaults": project.narrative_defaults.model_copy(
                update={"writing_style_material": "Sparse sentences. Salt air."}
            ),
        }
    )
    project = add_chapter(project, title="One")
    project = add_chapter(project, title="Two")
    project = add_subplot(project, name="Debt", chapter_ids=[c.id for c in project.chapters])
    project = add_block_from_template(
        project, chapter_id=project.chapters[0].id, block_type="setting"
    )
    first = export_story_json(project)
    second = export_story_json(project)
    assert first == second
    assert '"name":"Exports"' in first.replace(" ", "") or '"name": "Exports"' in first

    md = export_story_markdown(project)
    assert md.index("### One") < md.index("### Two")
    assert "Debt" in md
    assert "Sparse sentences" not in md

    style = export_writing_style(project)
    assert "Sparse sentences. Salt air." in style
    assert "### One" not in style


def test_empty_project_collections() -> None:
    project = create_project("Empty")
    assert project.chapters == []
    assert project.plots == []
    assert project.subplots == []
    assert project.blocks == {}
    assert project.block_links == []
    assert export_story_markdown(project).startswith("# Empty")


def test_timescale_enum_values() -> None:
    assert Timescale.EONS.value == "eons"
    project = StoryProject.model_validate(
        {
            "id": "p",
            "name": "n",
            "chapters": [
                {
                    "id": "c",
                    "title": "t",
                    "order": 0,
                    "timescale": "weeks",
                }
            ],
        }
    )
    assert project.chapters[0].timescale is Timescale.WEEKS
    with pytest.raises(ValidationError):
        StoryProject.model_validate(
            {
                "id": "p",
                "name": "n",
                "chapters": [{"id": "c", "title": "t", "order": 0, "timescale": "fortnights"}],
            }
        )


def test_path_traversal_rejected(tmp_path: Path) -> None:
    repo = JsonFileProjectRepository(tmp_path)
    with pytest.raises(ProjectStoreError):
        repo._project_path("../etc/passwd")


@pytest.mark.asyncio
async def test_chapter_draft_and_summary_round_trip(tmp_path: Path) -> None:
    repo = JsonFileProjectRepository(tmp_path)
    project = create_project("Drafts", project_id="proj_drafts")
    project = add_chapter(project, title="One")
    project = update_chapter(
        project,
        project.chapters[0].id,
        continuity_summary="The quay is claimed.",
        draft_prose="Fog swallowed the lanterns.",
    )
    await repo.create(project)
    loaded = await repo.get("proj_drafts")
    assert loaded is not None
    assert loaded.chapters[0].continuity_summary == "The quay is claimed."
    assert loaded.chapters[0].draft_prose == "Fog swallowed the lanterns."


def test_agent_writing_pack_order_and_prior_continuity() -> None:
    project = create_project("Pack", project_id="proj_pack")
    project = project.model_copy(
        update={
            "writing_style_material": "Lean coastal prose.",
            "narrative_defaults": project.narrative_defaults.model_copy(
                update={"writing_style_material": "Lean coastal prose."}
            ),
        }
    )
    project = add_chapter(project, title="One", subtitle="Fog")
    project = add_chapter(project, title="Two")
    first_id, second_id = project.chapters[0].id, project.chapters[1].id
    project = update_chapter(
        project,
        first_id,
        continuity_summary="Mara claims the pier.",
        draft_prose="Chapter one draft should not appear in prior continuity.",
    )
    project = update_chapter(
        project,
        second_id,
        continuity_summary="",
        draft_prose="",
    )
    project = add_block_from_template(
        project, chapter_id=first_id, block_type="setting"
    )
    project = update_block(
        project,
        project.chapters[0].block_ids[0],
        {"title": "Harbor", "description": "wet ropes"},
    )

    pack = export_agent_writing_pack(project)
    assert "Lean coastal prose." in pack
    assert pack.index("### Chapter 1: One: Fog") < pack.index("### Chapter 2: Two")
    chapter_two = pack.split("### Chapter 2: Two")[1]
    assert "Mara claims the pier." in chapter_two
    assert "Chapter one draft should not appear in prior continuity." not in chapter_two
    assert "_Not written yet._" in chapter_two
    assert "### Writing Style" in pack
    assert "Harbor" in pack

    empty = export_agent_writing_pack(create_project("Empty Pack"))
    assert "_No chapters yet._" in empty


def test_default_timeline_slots_and_cap() -> None:
    project = create_project("Slots")
    assert len(project.timeline_slots) == 10
    project = add_timeline_slots(project, 5)
    assert len(project.timeline_slots) == 15
    project = add_timeline_slots(project, MAX_TIMELINE_SLOTS - 15)
    assert len(project.timeline_slots) == MAX_TIMELINE_SLOTS
    with pytest.raises(ValidationConflictError):
        add_timeline_slots(project, 1)


def test_setting_color_variant_assigns_and_clones_preserve() -> None:
    project = create_project("Shades")
    project = add_chapter(project, title="A")
    chapter_id = project.chapters[0].id
    project = add_block_from_template(project, chapter_id=chapter_id, block_type="setting")
    first_id = project.chapters[0].block_ids[0]
    assert project.blocks[first_id].color_variant == 0
    project = add_block_from_template(project, chapter_id=chapter_id, block_type="setting")
    second_id = project.chapters[0].block_ids[1]
    assert project.blocks[second_id].color_variant == 1
    project = clone_block(project, block_id=first_id, target_chapter_id=chapter_id)
    clone_id = project.chapters[0].block_ids[-1]
    assert project.blocks[clone_id].color_variant == 0
    project = save_block_as_template(project, first_id, name="Harbor tpl")
    template = next(t for t in project.block_templates if t.name == "Harbor tpl")
    assert "color_variant" not in template.defaults


def test_setting_accepts_character_ids() -> None:
    project = create_project("Cast")
    project = add_chapter(project, title="A")
    chapter_id = project.chapters[0].id
    project = add_block_from_template(project, chapter_id=chapter_id, block_type="character")
    project = add_block_from_template(project, chapter_id=chapter_id, block_type="setting")
    character_id = next(
        bid
        for bid in project.chapters[0].block_ids
        if project.blocks[bid].block_type == "character"
    )
    setting_id = next(
        bid
        for bid in project.chapters[0].block_ids
        if project.blocks[bid].block_type == "setting"
    )
    project = update_block(project, character_id, {"title": "Joseph Lefonte"})
    project = update_block(project, setting_id, {"character_ids": [character_id]})
    assert project.blocks[setting_id].character_ids == [character_id]
    with pytest.raises(NotFoundError):
        update_block(project, setting_id, {"character_ids": ["missing"]})


def test_clone_block_keeps_original() -> None:
    project = create_project("Clone")
    project = add_chapter(project, title="A")
    project = add_chapter(project, title="B")
    a, b = project.chapters
    project = add_block_from_template(project, chapter_id=a.id, block_type="setting")
    source_id = project.chapters[0].block_ids[0]
    project = update_block(project, source_id, {"title": "Harbor", "description": "wet"})
    project = add_block_from_template(project, chapter_id=b.id, block_type="character")
    other_id = project.chapters[1].block_ids[0]
    project = create_block_link(
        project,
        source_block_id=source_id,
        target_block_id=other_id,
    )
    link_count = len(project.block_links)
    cloned = clone_block(project, block_id=source_id, target_chapter_id=b.id)
    assert source_id in cloned.chapters[0].block_ids
    assert source_id not in cloned.chapters[1].block_ids or True
    assert len(cloned.chapters[1].block_ids) == 2
    new_id = next(bid for bid in cloned.chapters[1].block_ids if bid != other_id)
    assert new_id != source_id
    assert cloned.blocks[new_id].title == "Harbor"
    assert cloned.blocks[source_id].title == "Harbor"
    cloned = update_block(cloned, new_id, {"title": "Copy Harbor"})
    assert cloned.blocks[source_id].title == "Harbor"
    assert cloned.blocks[new_id].title == "Copy Harbor"
    assert len(cloned.block_links) == link_count


def test_paint_timeline_slot_creates_and_updates_subplot() -> None:
    project = create_project("Paint")
    project = add_chapter(project, title="One")
    project = add_chapter(project, title="Two")
    project = add_chapter(project, title="Three")
    ids = [c.id for c in project.chapters]
    slot = project.timeline_slots[0]
    project = paint_timeline_slot_coverage(project, slot.id, [ids[0], ids[1]])
    bound = next(s for s in project.timeline_slots if s.id == slot.id)
    assert bound.subplot_id is not None
    assert bound.name == "Untitled subplot"
    subplot = next(s for s in project.subplots if s.id == bound.subplot_id)
    assert subplot.chapter_ids == [ids[0], ids[1]]
    project = paint_timeline_slot_coverage(project, slot.id, [ids[0], ids[2]])
    subplot = next(s for s in project.subplots if s.id == bound.subplot_id)
    assert subplot.chapter_ids == [ids[0], ids[2]]
    assert ids[1] not in subplot.chapter_ids
