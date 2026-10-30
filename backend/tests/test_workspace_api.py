"""API tests for the workspace endpoints."""

from pathlib import Path

from fastapi.testclient import TestClient

from app.api.routers import workspace as workspace_router
from app.main import app
from app.services.project_workspace import WorkspaceService

client = TestClient(app)


def test_open_and_manifest(tmp_path: Path, monkeypatch) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "demo"
    project.mkdir()
    (project / "main.py").write_text("def foo():\n    pass\n", encoding="utf-8", newline="\n")
    service = WorkspaceService(root)
    monkeypatch.setattr(workspace_router, "workspace_service", service)
    monkeypatch.setattr(workspace_router, "_indexer", workspace_router._indexer)

    response = client.post("/api/workspace/projects", json={"path": "demo"})
    assert response.status_code == 200
    project_id = response.json()["project_id"]

    manifest = client.get(f"/api/workspace/projects/{project_id}/manifest")
    assert manifest.status_code == 200
    assert manifest.json()["python_file_count"] == 1

    files = client.get(f"/api/workspace/projects/{project_id}/files")
    assert files.status_code == 200
    assert files.json()["files"][0]["path"] == "main.py"

    index = client.get(f"/api/workspace/projects/{project_id}/index")
    assert index.status_code == 200
    assert index.json()["functions"][0]["name"] == "foo"


def test_open_outside_root_rejected(tmp_path: Path, monkeypatch) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    service = WorkspaceService(root)
    monkeypatch.setattr(workspace_router, "workspace_service", service)
    response = client.post("/api/workspace/projects", json={"path": "../"})
    assert response.status_code == 400
