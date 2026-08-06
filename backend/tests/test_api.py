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

    project = client.post(
        f"/projects/{project_id}/chapters/{first}/blocks",
        json={"block_type": "setting"},
    ).json()["project"]
    block_id = project["chapters"][0]["block_ids"][0]
    project = client.post(
        f"/projects/{project_id}/blocks/move",
        json={"block_id": block_id, "target_chapter_id": second},
    ).json()["project"]
    assert project["chapters"][0]["block_ids"] == []
    assert project["chapters"][1]["block_ids"] == [block_id]

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
