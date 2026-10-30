# AGENTS.md — Forge frontend

Guidance for AI agents and contributors working in `frontend/`. Read this
before editing. For product/architecture context see `../README.md`,
`../docs/architecture.md` and `../docs/project-model.md` (repo root).

## What Forge is

A developer environment combining source-code editing with a visual,
node-based representation of software architecture. Goal: structured,
understandable, reusable, controllable development — especially with AI
coding assistance. This frontend is currently the Task-A foundation plus a
one-page landing page: app shell routing, a real backend health indicator,
and (on the landing page) a React Flow graph preview. Not yet built: graph
editor interactions beyond the preview, Monaco, AI proposals backend,
source analysis, auth, persistence.

## Commands (run from `frontend/`)

```bash
npm install          # Node 20.19+ / 22.12+, npm 10+
npm run dev          # Vite dev server — http://localhost:5173
npm run build        # tsc -b && vite build  (type-check is part of build)
npm run lint         # oxlint (config: .oxlintrc.json)
npm run preview      # preview production build
```

Backend (separate process, from `../backend/`): `uvicorn app.main:app
--reload --host 127.0.0.1 --port 8000` — API at `http://127.0.0.1:8000`,
docs at `/docs`. The frontend alone shows "Backend unreachable"; that is
honest, not a bug.

## Stack

React 19 · TypeScript (strict, bundler resolution) · Vite 8 · Tailwind
CSS 4 (via `@tailwindcss/vite`, CSS-first config in `src/index.css`) ·
React Router 7 (`react-router-dom`) · **React Flow `@xyflow/react` 12**
for node graphs · **Motion (`motion`)** for animation · oxlint for linting. No other UI/animation/icon
libraries are installed — do not add one without a concrete need.

## Project structure

```
src/
├── main.tsx                  # Entry: StrictMode + BrowserRouter
├── App.tsx                   # Route table only ( / → Home )
├── index.css                 # Tailwind v4 @theme tokens + base + React Flow chrome
├── pages/
│   └── Home.tsx              # Landing route — composition only, no sections inline
├── components/
│   ├── landing/              # Everything the Home page renders (see below)
│   └── layout/               # (reserved) app-shell primitives
├── hooks/
│   └── useBackendHealth.ts   # Real GET /api/health state: loading|connected|error
└── services/
    └── api/client.ts         # Typed fetch client; base URL from VITE_API_BASE_URL
```

### `components/landing/` map

| File | Owns |
| --- | --- |
| `data.ts` | All landing copy + graph node metadata (`FORGE_NODES`, `CAPABILITIES`, `CONNECTIONS`, `STACK`, `NAV_LINKS`). No JSX. |
| `LandingNav.tsx` | Sticky header + anchor nav |
| `Hero.tsx` | Headline, CTAs, stat strip, embeds `ForgeGraph` |
| `ForgeGraph.tsx` | React Flow canvas: node/edge state, selection, inspector footer, `BackendPill` |
| `ForgeNode.tsx` | Custom React Flow node type (`memo`, typed `NodeProps`) |
| `BackendPill.tsx` | Live health pill (uses `useBackendHealth`) |
| `BootScreen.tsx` / `Ticker.tsx` / `Reveal.tsx` / `motion.ts` | Boot splash, mono ticker, scroll-reveal wrapper, shared Motion variants |
| `Capabilities.tsx` | Numbered capability index rows |
| `WorkflowTabs.tsx` | `WorkflowSection` + code/graph/AI-proposal tabs |
| `ModelSection.tsx` | Typed-edge table + design principles |
| `StackSection.tsx` | Stack list + live-backend explainer card |
| `SiteFooter.tsx` | `ClosingSection` (CTA) + footer |

## React conventions (follow these)

- **Pages compose, components render, hooks fetch.** `pages/Home.tsx`
  only imports and orders sections. Put new landing sections in
  `components/landing/`, never inline in `Home.tsx`.
- **One component per file**, named export for components
  (`export function Hero()`), default export only for page components
  consumed by the router. Keep files under ~200 lines; split before they
  grow past that.
- **Static copy/data lives in `data.ts`** (or a colocated `*.ts`), not
  inside JSX files. Type shared shapes and export them (`ForgeNodeMeta`).
- **State stays local** (`useState`/`useCallback`/`useMemo`) unless two
  distant components need it. There is no global store — don't add Redux/
  Zustand for landing-page state.
- **Custom hooks for data**: components must not call `fetch` directly.
  Go through `services/api/client.ts` and expose state via a hook like
  `useBackendHealth` (AbortController, no retries, no fake success).
- **React Flow**: import `@xyflow/react/dist/style.css` in the component
  that renders `<ReactFlow>`; use `useNodesState`/`useEdgesState`;
  register custom node types in a module-level `nodeTypes` object (never
  inline in JSX — it remounts nodes); wrap custom nodes in `memo` with
  typed `NodeProps`; memoize handlers with `useCallback`. The landing
  graph is a preview (`nodesConnectable={false}`, `zoomOnScroll={false}`
  so it never hijacks page scroll) — the future editor belongs in a new
  feature folder, not here.
- **Motion**: import from `motion/react` (not `framer-motion`). Shared variants/easing live in `landing/motion.ts`; use `Reveal` for one-shot section entrances — vary effects (masked lines, HUD sweeps, `layoutId` tab pill), never the same fade-up on every element. `Home.tsx` wraps the page in `MotionConfig reducedMotion="user"` and skips the boot splash for reduced motion; loops (ticker, scan, pulse) must check `useReducedMotion`.
- Lists need stable keys from data ids — never array indexes for
  interactive items. Interactive elements are real `<button>`/`<a>` with
  `focus-visible:` styles; tabs use `role="tablist"/"tab"` +
  `aria-selected`; live regions use `aria-live="polite"`.
- TypeScript is strict: `verbatimModuleSyntax` is on, so type-only
  imports must use `import type`. `noUnusedLocals`/`noUnusedParameters`
  are on — the build fails on dead code.

## Styling conventions

- **Tailwind CSS 4, CSS-first.** Design tokens are `@theme` variables in
  `src/index.css` (`--color-ember`, `--color-coal`, `--color-panel`,
  `--color-line`, fonts). Use utilities (`bg-coal`, `border-line`,
  `text-ember`); do not hardcode hex values in JSX except inside React
  Flow edge/node style objects where the library needs raw values.
- **Typography: Petrona** (`--font-sans`, loaded in `index.html`) for all
  landing headings and body. **JetBrains Mono** (`--font-mono`) only for
  code, file paths, edge labels and micro-labels. Never reintroduce
  Manrope/Inter as the identity font.
- Palette: near-black `coal` background, `panel` surfaces, `line`
  borders, single **deep ember orange** accent (`--color-ember: #c2410c` for fills/buttons, `--color-ember-bright` only for tiny mono labels/live edges on near-black). No purple/blue gradients, no
  gradient headline text, no glassmorphism-everywhere, no identical
  icon-card grids — varied layouts (index rows, tables, split sections).
- Radii are small and deliberate (`rounded-sm`/`rounded-md`); don't put
  `rounded-2xl` on everything. Respect `prefers-reduced-motion` (already
  handled globally in `index.css`).
- React Flow chrome overrides live at the bottom of `src/index.css`
  (`.react-flow__controls*`, attribution). Extend those, don't restyle
  per-component.

## Backend contract

- `GET /api/health` → `200 {"status": "ok", "service": "forge-api"}`.
- Base URL: `VITE_API_BASE_URL` (see `.env.example`), default
  `http://127.0.0.1:8000`. Never hardcode a different origin in
  components, and never put secrets/API keys in frontend code.
- Connection UI must reflect the real request result (checking /
  connected / unreachable + reason). No mock success states.

## Domain language (from `../docs/project-model.md`)

- Nodes are **real components** (function, schema, API, test) with stable
  id, typed input/output ports, properties, source location, dependencies,
  version + validation state — not decorative diagram shapes.
- Edges have exactly three kinds, never interchangeable: **data**
  (values port→port), **execution** (control-flow order), **dependency**
  (depends on another's definition). Each validates independently.
- Grow the schema only when a feature consumes it; keep frontend and
  backend models aligned with the backend as source of truth.

## Workspace page (`/workspace`) — graphical interface specs

VS Code-style IDE around the project graph. Mock data only for now — no
backend calls from this page (the landing `BackendPill` remains the only
live health UI). Do not touch `../backend/` for workspace work.

```
src/pages/Workspace.tsx            # Composition + all panel/drill state. Default export.
src/components/workspace/          # Every workspace widget lives here (one per file)
├── data.ts                        # ALL mock data + types: PROJECT, LAYERS, LAYER_EDGES,
│                                  #   FILES (+FILE_BY_ID/LAYER_BY_ID/filesInLayer), FINDINGS,
│                                  #   TEST_RESULTS, TERMINAL_LINES, FILE_TREE. No JSX.
├── TitleBar.tsx                   # No macOS traffic lights. FORGE→/, menu, centred search,
│                                  #   layout toggles (left ▥ / bottom ▤ / right ▦, aria-pressed)
├── ResizeHandle.tsx               # VS Code sash: role=separator, pointer-drag (window
│                                  #   listeners + body cursor) and Arrow-key resize (±8/24px)
├── ActivityBar.tsx                # 48px rail: Explorer/Search toggle the left sidebar;
│                                  #   Git badge, Run, Extensions, avatar/Settings footer
├── FileExplorer.tsx               # Explorer: findings filter, FILE_TREE (folders collapsed
│                                  #   per-row), coloured kinds (folder=--color-folder,
│                                  #   py=--color-py-blue, md/config tokens), critical-finding
│                                  #   badge, Outline/Timeline footer. File click → drill+select.
├── GraphCanvas.tsx                # React Flow centre. Two levels only (see below).
├── GraphNode.tsx                  # memo custom node `graph`: variant layer|file, Handle
│                                  #   top(target)/bottom(source), complexity colour, dimmed prop
├── InspectorPanel.tsx             # Right sidebar tabs: FINDINGS (severity cards, click →
│                                  #   select file) + REMEDIATION diff (−/+ lines, Apply fix
│                                  #   is mock state only, never writes) | INSPECTOR (file meta,
│                                  #   imports list, Clear selection)
├── BottomPanel.tsx                # Panel tabs Problems|Tests & Verification|Terminal|Output;
│                                  #   ✕ closes. Tests = mock pytest table.
└── StatusBar.tsx                  # branch, error/warning counts, layer›file breadcrumb,
                                   #   test summary, Python/framework, on ember-deep
```

Layout contract (mirrors the VS Code reference, rounded widget sections):

- Shell is `h-screen flex-col gap-1.5 p-1.5 bg-ide-bg`; every widget
  (title bar, activity rail, sidebars, graph, bottom panel, status bar) is
  its own `rounded-lg border border-line` panel separated by the gap — not
  one flush window.
- Left sidebar and right sidebar toggle independently from the title-bar
  layout buttons (and Explorer/Search on the activity rail opens the left).
- Bottom panel is hidden by default; toggled by title-bar ▤ or its own ✕.
- **Resizable (VS Code sashes):** panel sizes are `useState` in
  `Workspace.tsx` — left `240px [180–420]`, right `320px [240–560]`,
  bottom `224px [120–520]` — clamped via `clamp()`. Sidebars/bottom render
  `h-full w-full` inside a sized wrapper `<div style={{width|height}}>`;
  the `ResizeHandle` between panels reports incremental deltas (right and
  bottom invert the sign). Dragging must keep working outside the handle
  (window `pointermove`/`pointerup`, `userSelect:none` while dragging).
- Explorer scroll area uses `.workspace-scroll` (`index.css`): thumb-only
  scrollbar, `::-webkit-scrollbar-track/corner` fully transparent — never
  re-add a white/grey track background.
- Dark theme only for now. IDE chrome uses `--font-ui` (Instrument Sans);
  Petrona stays landing-only. Code/paths/counts use `--font-mono`.
  Workspace-only colours are `--color-ide-*`, `--color-folder`,
  `--color-py-*`, `--color-sev-*`, `--color-test-pass` tokens in
  `index.css` — no hardcoded hex in JSX (React Flow edge styles excepted).

Graph contract (React Flow, refs: overview + drilled screenshots):

- **Edges are curved, never linear/angular:** every edge uses
  `type: "default"` (React Flow bezier) — no `smoothstep`/`step`/`straight`
  in the workspace graph. Overview edges are solid ember-brown (`#8a6d4b`
  in edge style objects only); drilled edges stay dashed.
- **Level 0 — Project Overview:** one `LAYER` node per `LAYERS` entry
  (name, desc, `simple|moderate|complex`, file count), `LAYER_EDGES` with
  numeric count labels. Clicking a layer node drills in.
- **Level 1 — Layer (container):** files sit inside one transparent
  container — a `type:"group"` parent node (`layer-container`,
  `rgba(255,255,255,0.02)` fill, `1px #343438` border, radius 12,
  non-draggable/selectable) with a muted mono title child
  (`layer-container-title`). File nodes use `parentId:"layer-container"`
  + `extent:"parent"` and positions relative to the container.
  Dashed curved `imports` edges for intra-layer imports only; cross-layer
  import count is summarised in the floating footer pill. Clicking a file
  selects it (selected file + direct neighbours stay full opacity, rest
  `dimmed`) and opens the right sidebar Inspector. Node clicks ignore
  non-`graph` nodes (container/title).
- **Returning:** a drilled view always shows an ember `← Back` button
  (top-left, `aria-label="Back to Project Overview (previous layer)"`)
  next to the breadcrumb pill `Project › LAYER NAME (Esc to go back)`.
  Back button, `Escape`, breadcrumb Project, or re-drill all reset
  selection. `key` on `<ReactFlow>` is the layer id so each level gets a
  fresh `fitView`.
- Zoom/pan enabled (landing preview rules do NOT apply here): `Controls`
  bottom-left, `MiniMap` bottom-right, dotted `Background`, `minZoom
  0.25 / maxZoom 2.2`, `nodesConnectable={false}`.
- State lives in `Workspace.tsx` (`useState`): `layerId`, `selectedFileId`,
  `selectedFindingId`, `applied:Set<string>`, panel booleans. Explorer,
  findings, problems and graph all sync through `selectFile`/`selectFinding`.

Mock Python project: **`orders-api`** (FastAPI, Python 3.12, pytest) —
`app/{api,schemas,services,db,core}` + `tests/`, see `FILE_TREE`/`FILES`.
When a real analyser lands, it must produce the same `data.ts` shapes
(`LayerMeta`/`FileMeta.imports: string[]`/`Finding`/`TestResult`) from the
backend (source of truth) — components keep taking props, never `fetch`.

## Before you finish

1. `npm run build` passes (includes `tsc -b` type-check).
2. `npm run lint` passes (oxlint; hooks rules are errors).
3. New landing UI goes through `components/landing/` + `data.ts`;
   `Home.tsx` stays a short composition.
4. Check `git status` from the repo root — `npm install` can rewrite
   lockfiles; revert collateral changes you didn't intend.
