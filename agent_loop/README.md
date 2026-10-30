# ForgeGuard Loop

Agentic loop: **scan → display/select → fix selected**.

1. `tools/meta_model_scan.py` — POSTs the custom rule to the Meta Model API, returns findings.
2. `tools/react_display.py` — POSTs findings to the React app (`/api/vulnerabilities`), polls `/api/selections?run_id=…` for the user's pick; CLI fallback if the app is down.
3. `tools/meta_model_fix.py` — POSTs each selected finding to the Meta Model API (`/v1/fix`), returns patches.

Every step is appended to `runs/transcript.jsonl`.

## Setup (project-local env)

```
uv venv
uv pip install -e ".[dev]"
```

or without uv:

```
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
```

## Run (offline demo)

Fake mode is the default — no network needed:

```
uv run python -m forgeguard_loop --rule-id DEMO-001 --rule-description "demo rule"
```

## Run (real services)

```
$env:FORGEGUARD_FAKE_TOOLS="0"
$env:META_MODEL_API_URL="https://meta-model-api.example.com"
$env:META_MODEL_API_KEY="..."
$env:REACT_APP_URL="http://localhost:3000"
uv run python -m forgeguard_loop --rule-id CUSTOM-001 --rule-description "..."
```

## Test

```
uv run pytest
```

## API contracts

- `POST {META_MODEL_API_URL}/v1/scan` `{rule_id, rule_description, target_repo}` → `{findings: [...]}`
- `POST {META_MODEL_API_URL}/v1/fix` `{vulnerability: {...}}` → `{patched_snippet, explanation, confidence}`
- `POST {REACT_APP_URL}/api/vulnerabilities` `{run_id, findings: [...]}` then `GET {REACT_APP_URL}/api/selections?run_id=…` → `{selected_ids: [...]}`
