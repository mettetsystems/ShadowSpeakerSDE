"""FastAPI routes for ShadowSpeakerSDE."""

from __future__ import annotations

from pathlib import Path
from typing import Any, cast

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from shadowspeaker.api.schemas import (
    AssociateSubplotRequest,
    CreateBlockLinkRequest,
    CreateBlockRequest,
    CreateChapterRequest,
    CreatePlotRequest,
    CreateProjectRequest,
    CreateSubplotRequest,
    MoveBlockRequest,
    PatchBlockRequest,
    PatchChapterRequest,
    ReorderBlocksRequest,
    ReorderChaptersRequest,
    UpdateDefaultsRequest,
    dump_project,
)
from shadowspeaker.domain.models import StoryProject
from shadowspeaker.persistence import InvalidProjectDataError, JsonFileProjectRepository
from shadowspeaker.services import (
    DuplicateLinkError,
    NotFoundError,
    ProjectService,
    ValidationConflictError,
)

router = APIRouter()


def create_app(data_dir: Path | None = None) -> FastAPI:
    root = data_dir or Path(__file__).resolve().parents[3] / "data" / "projects"
    repository = JsonFileProjectRepository(root)
    service = ProjectService(repository)

    app = FastAPI(title="ShadowSpeakerSDE", version="0.1.0")
    app.state.service = service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(NotFoundError)
    async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc), "code": "not_found"})

    @app.exception_handler(DuplicateLinkError)
    async def duplicate_handler(_: Request, exc: DuplicateLinkError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc), "code": "duplicate"})

    @app.exception_handler(ValidationConflictError)
    async def conflict_handler(_: Request, exc: ValidationConflictError) -> JSONResponse:
        return JSONResponse(
            status_code=409, content={"detail": str(exc), "code": "validation_conflict"}
        )

    @app.exception_handler(InvalidProjectDataError)
    async def invalid_store_handler(_: Request, exc: InvalidProjectDataError) -> JSONResponse:
        return JSONResponse(
            status_code=500, content={"detail": str(exc), "code": "invalid_store"}
        )

    app.include_router(router)
    return app


def _service(request: Request) -> ProjectService:
    return cast(ProjectService, request.app.state.service)


@router.post("/projects")
async def create_project(body: CreateProjectRequest, request: Request) -> dict[str, Any]:
    project = await _service(request).create_project(body.name)
    return dump_project(project)


@router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request) -> dict[str, Any]:
    project = await _service(request).get_project(project_id)
    return dump_project(project)


@router.put("/projects/{project_id}")
async def put_project(project_id: str, body: dict[str, Any], request: Request) -> dict[str, Any]:
    if body.get("id") and body["id"] != project_id:
        raise ValidationConflictError("Project id in body must match path")
    payload = dict(body)
    payload["id"] = project_id
    project = StoryProject.model_validate(payload)
    saved = await _service(request).save_project(project)
    return dump_project(saved)


@router.patch("/projects/{project_id}/defaults")
async def patch_defaults(
    project_id: str, body: UpdateDefaultsRequest, request: Request
) -> dict[str, Any]:
    project = await _service(request).update_defaults(
        project_id,
        point_of_view=body.point_of_view,
        writing_style_material=body.writing_style_material,
    )
    return dump_project(project)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request) -> Response:
    await _service(request).delete_project(project_id)
    return Response(status_code=204)


@router.post("/projects/{project_id}/chapters")
async def create_chapter(
    project_id: str, body: CreateChapterRequest, request: Request
) -> dict[str, Any]:
    project = await _service(request).add_chapter(project_id, body.model_dump())
    return dump_project(project)


@router.patch("/projects/{project_id}/chapters/{chapter_id}")
async def patch_chapter(
    project_id: str,
    chapter_id: str,
    body: PatchChapterRequest,
    request: Request,
) -> dict[str, Any]:
    project = await _service(request).patch_chapter(
        project_id, chapter_id, body.model_dump(exclude_unset=True)
    )
    return dump_project(project)


@router.delete("/projects/{project_id}/chapters/{chapter_id}")
async def remove_chapter(project_id: str, chapter_id: str, request: Request) -> dict[str, Any]:
    project = await _service(request).delete_chapter(project_id, chapter_id)
    return dump_project(project)


@router.post("/projects/{project_id}/chapters/reorder")
async def reorder_chapters(
    project_id: str, body: ReorderChaptersRequest, request: Request
) -> dict[str, Any]:
    project = await _service(request).reorder_chapters(project_id, body.chapter_ids)
    return dump_project(project)


@router.post("/projects/{project_id}/plots")
async def create_plot(project_id: str, body: CreatePlotRequest, request: Request) -> dict[str, Any]:
    project = await _service(request).add_plot(project_id, body.model_dump())
    return dump_project(project)


@router.post("/projects/{project_id}/subplots")
async def create_subplot(
    project_id: str, body: CreateSubplotRequest, request: Request
) -> dict[str, Any]:
    project = await _service(request).add_subplot(project_id, body.model_dump())
    return dump_project(project)


@router.post("/projects/{project_id}/subplots/{subplot_id}/chapters")
async def associate_subplot(
    project_id: str,
    subplot_id: str,
    body: AssociateSubplotRequest,
    request: Request,
) -> dict[str, Any]:
    project = await _service(request).associate_subplot(
        project_id, subplot_id, body.chapter_ids
    )
    return dump_project(project)


@router.post("/projects/{project_id}/chapters/{chapter_id}/blocks")
async def create_block(
    project_id: str,
    chapter_id: str,
    body: CreateBlockRequest,
    request: Request,
) -> dict[str, Any]:
    project = await _service(request).add_block(project_id, chapter_id, body.model_dump())
    return dump_project(project)


@router.patch("/projects/{project_id}/blocks/{block_id}")
async def patch_block(
    project_id: str,
    block_id: str,
    body: PatchBlockRequest,
    request: Request,
) -> dict[str, Any]:
    project = await _service(request).patch_block(
        project_id, block_id, body.model_dump(exclude_unset=True)
    )
    return dump_project(project)


@router.delete("/projects/{project_id}/blocks/{block_id}")
async def remove_block(project_id: str, block_id: str, request: Request) -> dict[str, Any]:
    project = await _service(request).delete_block(project_id, block_id)
    return dump_project(project)


@router.post("/projects/{project_id}/blocks/move")
async def move_block(project_id: str, body: MoveBlockRequest, request: Request) -> dict[str, Any]:
    project = await _service(request).move_block(project_id, body.model_dump())
    return dump_project(project)


@router.post("/projects/{project_id}/chapters/{chapter_id}/blocks/reorder")
async def reorder_blocks(
    project_id: str,
    chapter_id: str,
    body: ReorderBlocksRequest,
    request: Request,
) -> dict[str, Any]:
    project = await _service(request).reorder_blocks(project_id, chapter_id, body.block_ids)
    return dump_project(project)


@router.post("/projects/{project_id}/block-links")
async def create_link(
    project_id: str, body: CreateBlockLinkRequest, request: Request
) -> dict[str, Any]:
    project = await _service(request).create_link(project_id, body.model_dump())
    return dump_project(project)


@router.delete("/projects/{project_id}/block-links/{link_id}")
async def remove_link(project_id: str, link_id: str, request: Request) -> dict[str, Any]:
    project = await _service(request).delete_link(project_id, link_id)
    return dump_project(project)


@router.get("/projects/{project_id}/export/json")
async def export_json(project_id: str, request: Request) -> Response:
    content = await _service(request).export_json(project_id)
    return Response(
        content=content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{project_id}-story.json"',
        },
    )


@router.get("/projects/{project_id}/export/markdown")
async def export_markdown(project_id: str, request: Request) -> PlainTextResponse:
    content = await _service(request).export_markdown(project_id)
    return PlainTextResponse(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{project_id}-story.md"',
        },
    )


@router.get("/projects/{project_id}/export/writing-style")
async def export_writing_style(project_id: str, request: Request) -> PlainTextResponse:
    content = await _service(request).export_writing_style(project_id)
    return PlainTextResponse(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{project_id}-writing-style.md"',
        },
    )


@router.get("/projects/{project_id}/export/agent-pack")
async def export_agent_pack(project_id: str, request: Request) -> PlainTextResponse:
    content = await _service(request).export_agent_pack(project_id)
    return PlainTextResponse(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{project_id}-agent-writing-pack.md"'
            ),
        },
    )


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app = create_app()
