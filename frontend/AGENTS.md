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
for node graphs · **Motion (`motion`)** for animation · **Shiki** (lazy, Python only)
for code highlighting · **sonner** for toasts · **canvas-confetti** (single 403 moment,
reduced-motion gated) · **@dagrejs/dagre** for security-graph layout · oxlint for linting.
No other UI/animation/icon libraries — do not add one without a concrete need.

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

VS Code-style IDE around the project graph. The workspace has two modes,
toggled in `TitleBar` (**Security flow** default, Overview secondary):

- **Security flow** — backed by the real `/api/security/*` and `/api/demo/*`
  endpoints via `services/api/client.ts` → `hooks/useSecurityWorkflow.ts` →
  props. No component calls `fetch` directly.
- **Overview** — the existing layer/file overview with its mock `data.ts`
  (`GraphCanvas`, `FileExplorer`, `InspectorPanel`, `BottomPanel`). Mock
  data only in this mode.

### Security flow files

```
src/features/security/
├── types.ts              # Mirrors backend/app/schemas/security.py exactly
├── layout.ts             # @dagrejs/dagre TB auto-layout (backend sends no positions)
├── applyUnifiedDiff.ts   # Tiny unified-diff hunk applier for the After view
├── sourceOutline.ts      # Symbol outline derived by scanning the snapshot
└── demoSource.ts         # `?raw` build-time import of backend/app/security_demo.py + SHA-256
src/hooks/useSecurityWorkflow.ts  # useReducer machine: idle → exploited → analyzing →
                                  # confirmed → reviewing → approved → applying → applied →
                                  # reanalyzing → fixed_in_source | resolved (+ error).
                                  # `resolved` only when backend outcome === "satisfied".
src/components/workspace/security/
├── SecurityStepper.tsx   # Exploit·Scan·Understand·Review·Apply·Prove, layoutId pill
├── SecurityExplorer.tsx  # Real scanned file + symbol outline (no backend call)
├── SecurityFlowCanvas.tsx# React Flow canvas (Controls/MiniMap/dotted Background)
├── SecurityNode.tsx      # memo node, typed NodeProps, finding pulse (reduced-motion off)
├── AttackEdge.tsx        # Bezier edge + SVG animateMotion attack particle
├── CodeViewer.tsx        # Read-only viewer: hash check, highlight, Before/After
├── ShikiLines.tsx        # Lazy Shiki (shiki/core + JS engine + Python + github-dark)
├── DiffViewer.tsx        # Unified diff with −/+ gutters
├── DiffCompare.tsx       # Modal: side-by-side original vs proposed fix + unified diff
├── SecurityInspector.tsx # Right panel = current step (rule card pinned, outcome badge)
└── SecurityBottomPanel.tsx # Exploit | Verification | Output (API call log)
```

Truthfulness rules: outcome badge shows the backend value verbatim
(`inconclusive` after apply gets helper text, never relabelled `satisfied`);
apply verification is labelled "Reference verification"; proposal state is
resumed via `GET /api/security/proposals/{id}` on analyze (keep the last
`proposal_id` — post-fix analyses return `fix_proposal: null`); 404 on
apply/rollback shows the backend-restarted message; replay animation outcome
is driven by the real HTTP status, never the step number. Exactly one ember
primary button is visible at a time.

The scanned file is loaded at build time
(`import demoSource from '../../../../backend/app/security_demo.py?raw'`);
`vite.config.ts` sets `server.fs.allow: ['..']`. SHA-256 of the snapshot is
compared with `fix_proposal.expected_source_hash` in the code viewer.

Overview-mode layout/graph contracts (panels, sashes, layer drill-down,
curved `default` edges only) are unchanged from the original spec — see
`data.ts`, `GraphCanvas.tsx` and git history for the full contract.

## Before you finish

1. `npm run build` passes (includes `tsc -b` type-check).
2. `npm run lint` passes (oxlint; hooks rules are errors).
3. New landing UI goes through `components/landing/` + `data.ts`;
   `Home.tsx` stays a short composition.
4. Check `git status` from the repo root — `npm install` can rewrite
   lockfiles; revert collateral changes you didn't intend.
