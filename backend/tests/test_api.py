"""API integration tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from shadowspeaker.api import create_app


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    app = create_app(tmp_path)
    with TestClient(app) as test_client:
        yield test_client


def test_create_project_and_get(client: TestClient) -> None:
    created = client.post("/projects", json={"name": "Harbor Tale"})
    assert created.status_code == 200
    project = created.json()["project"]
    project_id = project["id"]
    fetched = client.get(f"/projects/{project_id}")
    assert fetched.status_code == 200
    assert fetched.json()["project"]["name"] == "Harbor Tale"


def test_list_projects(client: TestClient) -> None:
    empty = client.get("/projects")
    assert empty.status_code == 200
    assert empty.json()["projects"] == []
    first = client.post("/projects", json={"name": "Alpha"}).json()["project"]
    second = client.post("/projects", json={"name": "Beta"}).json()["project"]
    listed = client.get("/projects")
    assert listed.status_code == 200
    projects = listed.json()["projects"]
    assert {item["id"] for item in projects} == {first["id"], second["id"]}
    assert {item["name"] for item in projects} == {"Alpha", "Beta"}


def test_delete_project(client: TestClient) -> None:
    created = client.post("/projects", json={"name": "Disposable"}).json()["project"]
    project_id = created["id"]
    assert client.get(f"/projects/{project_id}").status_code == 200
    deleted = client.delete(f"/projects/{project_id}")
    assert deleted.status_code == 204
    assert client.get(f"/projects/{project_id}").status_code == 404
    listed = client.get("/projects").json()["projects"]
    assert project_id not in {item["id"] for item in listed}
    assert client.delete(f"/projects/{project_id}").status_code == 404


def test_invalid_block_returns_422(client: TestClient) -> None:
    project_id = client.post("/projects", json={"name": "X"}).json()["project"]["id"]
    chapter_id = client.post(
        f"/projects/{project_id}/chapters", json={"title": "One"}
    ).json()["project"]["chapters"][0]["id"]
    response = client.post(
        f"/projects/{project_id}/chapters/{chapter_id}/blocks",
        json={"block_type": "not_a_block"},
    )
    assert response.status_code == 422


def test_missing_resource_404(client: TestClient) -> None:
    response = client.get("/projects/does_not_exist")
    assert response.status_code == 404


def test_duplicate_link_409(client: TestClient) -> None:
    project_id = client.post("/projects", json={"name": "X"}).json()["project"]["id"]
    project = client.post(
        f"/projects/{project_id}/chapters", json={"title": "One"}
    ).json()["project"]
    chapter_id = project["chapters"][0]["id"]
    project = client.post(
        f"/projects/{project_id}/chapters", json={"title": "Two"}
    ).json()["project"]
    second = project["chapters"][1]["id"]
    project = client.post(
        f"/projects/{project_id}/chapters/{chapter_id}/blocks",
        json={"block_type": "setting"},
    ).json()["project"]
    source = project["chapters"][0]["block_ids"][0]
    project = client.post(
        f"/projects/{project_id}/chapters/{second}/blocks",
        json={"block_type": "character"},
    ).json()["project"]
    target = project["chapters"][1]["block_ids"][0]
    first = client.post(
        f"/projects/{project_id}/block-links",
        json={"source_block_id": source, "target_block_id": target},
    )
    assert first.status_code == 200
    duplicate = client.post(
        f"/projects/{project_id}/block-links",
        json={"source_block_id": source, "target_block_id": target},
    )
    assert duplicate.status_code == 409


def test_reorder_move_and_exports(client: TestClient) -> None:
    project_id = client.post("/projects", json={"name": "Flow"}).json()["project"]["id"]
    client.patch(
        f"/projects/{project_id}/defaults",
        json={"writing_style_material": "Lean prose."},
    )
    project = client.post(
        f"/projects/{project_id}/chapters", json={"title": "One", "subtitle": "Night"}
    ).json()["project"]
    first = project["chapters"][0]["id"]
    project = client.post(
        f"/projects/{project_id}/chapters", json={"title": "Two"}
    ).json()["project"]
    second = project["chapters"][1]["id"]
    project = client.post(
        f"/projects/{project_id}/subplots",
        json={"name": "Pursuit", "chapter_ids": [first, second]},
    ).json()["project"]
    assert len(project["subplots"]) == 1
    assert len(project["subplots"][0]["phases"]) == 3
    subplot_id = project["subplots"][0]["id"]
    phase_id = project["subplots"][0]["phases"][0]["id"]
    project = client.patch(
        f"/projects/{project_id}/subplots/{subplot_id}",
        json={
            "description": "Chase through fog",
            "phases": [{"id": phase_id, "description": "Notice the debt"}],
            "plot_archetype": "quest",
            "delta": "The prize is a name, not an object.",
        },
    ).json()["project"]
    assert project["subplots"][0]["description"] == "Chase through fog"
    assert project["subplots"][0]["phases"][0]["description"] == "Notice the debt"
    assert project["subplots"][0]["plot_archetype"] == "quest"
    assert project["subplots"][0]["delta"] == "The prize is a name, not an object."
    project = client.post(f"/projects/{project_id}/subplots/{subplot_id}/phases").json()[
        "project"
    ]
    assert len(project["subplots"][0]["phases"]) == 4

    review = client.get(f"/projects/{project_id}/review")
    assert review.status_code == 200
    assert "warnings" in review.json()

    prose = client.post(
        f"/projects/{project_id}/chapters/{first}/blocks",
        json={"block_type": "prose_builder"},
    )
    assert prose.status_code == 200
    assert any(
        block["block_type"] == "prose_builder"
        for block in prose.json()["project"]["blocks"].values()
    )

    project = client.post(
        f"/projects/{project_id}/chapters/{first}/blocks",
        json={"block_type": "setting"},
    ).json()["project"]
    block_id = next(
        bid
        for bid in project["chapters"][0]["block_ids"]
        if project["blocks"][bid]["block_type"] == "setting"
    )
    project = client.post(
        f"/projects/{project_id}/blocks/move",
        json={"block_id": block_id, "target_chapter_id": second},
    ).json()["project"]
    assert block_id not in project["chapters"][0]["block_ids"]
    assert block_id in project["chapters"][1]["block_ids"]

    project = client.post(
        f"/projects/{project_id}/chapters/reorder",
        json={"chapter_ids": [second, first]},
    ).json()["project"]
    assert [c["title"] for c in project["chapters"]] == ["Two", "One"]

    json_export = client.get(f"/projects/{project_id}/export/json")
    assert json_export.status_code == 200
    assert "attachment" in json_export.headers["content-disposition"]
    assert "Pursuit" in json_export.text

    md = client.get(f"/projects/{project_id}/export/markdown")
    assert md.status_code == 200
    assert md.text.index("### Two") < md.text.index("### One")
    assert "Phase 1: Notice the debt" in md.text

    style = client.get(f"/projects/{project_id}/export/writing-style")
    assert style.status_code == 200
    assert "Lean prose." in style.text
    assert "Pursuit" not in style.text

    first_after = project["chapters"][1]["id"]
    client.patch(
        f"/projects/{project_id}/chapters/{first_after}",
        json={
            "continuity_summary": "Two ends in flight.",
            "draft_prose": "She ran.",
        },
    )
    pack = client.get(f"/projects/{project_id}/export/agent-pack")
    assert pack.status_code == 200
    assert "agent-writing-pack.md" in pack.headers["content-disposition"]
    assert "Lean prose." in pack.text
    assert "### Chapter 1: Two" in pack.text
    assert "Agent Writing Pack" in pack.text


def test_writing_texture_chapter_api(client: TestClient) -> None:
    project_id = client.post("/projects", json={"name": "Texture"}).json()["project"]["id"]
    chapter_id = client.post(
        f"/projects/{project_id}/chapters", json={"title": "Storm"}
    ).json()["project"]["chapters"][0]["id"]
    patched = client.patch(
        f"/projects/{project_id}/chapters/{chapter_id}",
        json={
            "writing_texture": {
                "rule_of_three": 50,
                "emotional_flatlining": 30,
                "metaphor_stacking": 0,
                "list_rhythm_stacking": 0,
                "subject_x_vs_subject_y": 20,
                "metaphor_with_personification": 0,
                "clean_pivot_sentences": 10,
                "over_dramatic_metaphor": 0,
                "emotional_shorthand_stacking": 0,
            }
        },
    )
    assert patched.status_code == 200
    texture = patched.json()["project"]["chapters"][0]["writing_texture"]
    assert texture["rule_of_three"] == 50
    assert texture["subject_x_vs_subject_y"] == 20

    over = client.patch(
        f"/projects/{project_id}/chapters/{chapter_id}",
        json={
            "writing_texture": {
                "rule_of_three": 100,
                "emotional_flatlining": 70,
                "metaphor_stacking": 0,
                "list_rhythm_stacking": 0,
                "subject_x_vs_subject_y": 0,
                "metaphor_with_personification": 0,
                "clean_pivot_sentences": 0,
                "over_dramatic_metaphor": 0,
                "emotional_shorthand_stacking": 0,
            }
        },
    )
    assert over.status_code == 409

    md = client.get(f"/projects/{project_id}/export/markdown")
    assert md.status_code == 200
    assert "Writing texture (110 / 160)" in md.text
    pack = client.get(f"/projects/{project_id}/export/agent-pack")
    assert "#### Writing Texture" in pack.text


def test_patch_setting_title_and_characters(client: TestClient) -> None:
    project = client.post("/projects", json={"name": "Names"}).json()["project"]
    project_id = project["id"]
    chapter_id = client.post(
        f"/projects/{project_id}/chapters", json={"title": "One"}
    ).json()["project"]["chapters"][0]["id"]
    project = client.post(
        f"/projects/{project_id}/chapters/{chapter_id}/blocks",
        json={"block_type": "character"},
    ).json()["project"]
    character_id = project["chapters"][0]["block_ids"][0]
    project = client.post(
        f"/projects/{project_id}/chapters/{chapter_id}/blocks",
        json={"block_type": "setting"},
    ).json()["project"]
    setting_id = next(
        bid
        for bid in project["chapters"][0]["block_ids"]
        if project["blocks"][bid]["block_type"] == "setting"
    )
    patched = client.patch(
        f"/projects/{project_id}/blocks/{setting_id}",
        json={
            "title": "Birmingham Alabama",
            "character_ids": [character_id],
            "time_of_day": "dusk",
            "environment_state": "",
            "description": "",
            "micro_settings": [],
            "juxtaposition": "",
        },
    )
    assert patched.status_code == 200, patched.text
    setting = patched.json()["project"]["blocks"][setting_id]
    assert setting["title"] == "Birmingham Alabama"
    assert setting["character_ids"] == [character_id]
    assert setting["color_variant"] == 0


def test_clone_and_timeline_slot_api(client: TestClient) -> None:
    project = client.post("/projects", json={"name": "Slots"}).json()["project"]
    project_id = project["id"]
    assert len(project["timeline_slots"]) == 10

    project = client.post(
        f"/projects/{project_id}/chapters", json={"title": "One"}
    ).json()["project"]
    first = project["chapters"][0]["id"]
    project = client.post(
        f"/projects/{project_id}/chapters", json={"title": "Two"}
    ).json()["project"]
    second = project["chapters"][1]["id"]

    project = client.post(
        f"/projects/{project_id}/chapters/{first}/blocks",
        json={"block_type": "setting"},
    ).json()["project"]
    block_id = project["chapters"][0]["block_ids"][0]
    project = client.post(
        f"/projects/{project_id}/blocks/clone",
        json={"block_id": block_id, "target_chapter_id": second},
    ).json()["project"]
    assert len(project["chapters"][0]["block_ids"]) == 1
    assert len(project["chapters"][1]["block_ids"]) == 1
    assert project["chapters"][1]["block_ids"][0] != block_id

    slot_id = project["timeline_slots"][0]["id"]
    project = client.patch(
        f"/projects/{project_id}/timeline/slots/{slot_id}",
        json={"name": "Revenge"},
    ).json()["project"]
    assert project["timeline_slots"][0]["name"] == "Revenge"
    project = client.post(
        f"/projects/{project_id}/timeline/slots/{slot_id}/coverage",
        json={"chapter_ids": [first, second]},
    ).json()["project"]
    assert project["timeline_slots"][0]["subplot_id"] is not None
    assert project["subplots"][0]["chapter_ids"] == [first, second]

    project = client.post(
        f"/projects/{project_id}/timeline/slots", json={"count": 2}
    ).json()["project"]
    assert len(project["timeline_slots"]) == 12
