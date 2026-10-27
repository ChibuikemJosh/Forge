# Forge

Forge is an early-stage developer environment that combines source-code editing with a visual, node-based architecture model.

Task A establishes a full-stack foundation with:

- Existing React + TypeScript + Vite frontend preserved.
- Minimal FastAPI backend with health endpoint.
- Frontend API client and backend connection status indicator.
- Documentation for architecture boundaries and project model direction.

## Repository Layout (Task A)

- `src/`: frontend application.
- `backend/`: FastAPI backend and tests.
- `docs/`: architecture and project-model documentation.

## Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+ (tested with Python 3.12)

## Frontend Setup and Run

```bash
npm install
npm run dev
```

Frontend build/lint commands:

```bash
npm run lint
npm run build
```

## Backend Setup and Run

### PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Bash / zsh

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run backend tests:

```bash
cd backend
pytest
```

## Frontend ↔ Backend Configuration

Set the frontend backend URL with:

- `.env` (or `.env.local`) at repository root
- `VITE_API_BASE_URL=http://127.0.0.1:8000`

An example file is provided at `.env.example`.

## Implemented in Task A

- App shell with header, sidebar, workspace, and empty-state UI.
- Backend connection status in header (`loading`, `connected`, `error`) using real health endpoint fetch.
- `GET /api/health` endpoint returning:
  - `{"status":"ok","service":"forge-api"}`
- Automated backend endpoint test.

## Not Implemented Yet

- Visual graph editor and graph editing interactions.
- Monaco/code-editor integration.
- AI provider integration and proposal workflows.
- Controlled source-modification workflows.
