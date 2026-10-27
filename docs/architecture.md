# Forge Architecture Foundation (Task A)

## Current Structure

- `src/app`: frontend entry composition and top-level shell orchestration.
- `src/components/layout`: reusable layout primitives (header, navigation, workspace).
- `src/features/project`: project-facing UI state for the current empty workspace.
- `src/core/project-model`: foundation TypeScript domain model types for project and graph concepts.
- `src/services/api`: frontend API client for backend communication.
- `src/hooks`: frontend hooks for UI-facing behavior (`useBackendHealth`).
- `src/styles`: shared application shell styling.
- `backend/app`: FastAPI application and route modules.
- `backend/tests`: backend automated tests.

## Frontend / Backend Boundary

### Frontend responsibilities

- Render the Forge UI and handle user interactions.
- Provide the future shell for graph editor, code editor, project management, and AI proposal UX.
- Display backend connection status to support local development visibility.
- Call backend endpoints through a reusable API client.
- Never contain provider API keys or backend secrets.

### Backend responsibilities

- Provide HTTP API endpoints for Forge.
- Own future Python code analysis and controlled project operations.
- Own future provider integrations for AI model access.
- Own future validation/check execution for proposed modifications.
- Avoid becoming a dumping ground for unrelated UI logic.

## Task A backend scope

Implemented now:

- FastAPI app entry (`backend/app/main.py`).
- CORS for local Vite development origins (`http://127.0.0.1:5173`, `http://localhost:5173`).
- `GET /api/health` endpoint returning service health metadata.
- Backend health endpoint test using `pytest` and FastAPI `TestClient`.

Not implemented in Task A:

- Graph engine and graph editing APIs.
- Code-editor integration APIs.
- AI orchestration/provider calls.
- Automatic project modification flows.
