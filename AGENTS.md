# AGENTS — Guide for AI Agents

This file describes the structure, conventions, and constraints of the **EARS Navigator** codebase to assist AI agents (GitHub Copilot, Claude, etc.) working on this repository.

---

## Project Context

**EARS Navigator** is a local web application for graphically browsing EARS (Easy Approach to Requirements Syntax) requirements from [Walden](https://github.com/rgehrsitz/walden) spec files located in `.walden/specs/` directories.

- **Backend:** Node.js + Express — serves a REST API and static files
- **Frontend:** Vanilla JS SPA — accordion, cards, modals, sidebar stats
- **Parser:** pure JS Markdown → JSON (zero external dependencies beyond Express)
- **No build step** — files are served as-is

---

## Repository Structure

```
ears-navigator/
├── server.js          # Express server: API + static file serving
├── src/
│   └── parser.js      # parseRequirements(filePath) + classifyEARS(text)
├── public/
│   ├── index.html     # SPA shell — no framework
│   ├── app.js         # All frontend logic
│   └── style.css      # Layout + EARS color palette (CSS custom properties)
├── package.json       # Single dependency: express ^4
├── README.md
├── LICENSE
└── AGENTS.md          # This file
```

---

## Key Architectural Decisions

### 1. Specs directory via environment variable

```js
// server.js
const SPECS_DIR = process.env.WALDEN_SPECS_DIR || path.join(process.cwd(), '.walden', 'specs');
```

The app never assumes where specs live. Always pass `WALDEN_SPECS_DIR` when running from a different directory.

### 2. Parser (`src/parser.js`)

Two exported functions:

- `parseRequirements(filePath)` — reads a Walden `requirements.md`, extracts groups (H3 sections), user stories, and EARS acceptance criteria. Returns `{ groups, stats }`.
- `classifyEARS(text)` — classifies a single AC text into one of four types:
  - `'event-driven'` — starts with `WHEN`
  - `'state-driven'` — starts with `WHILE` or `DURING`
  - `'unwanted'` — starts with `IF`
  - `'ubiquitous'` — anything else (including `WHERE`, `The system SHALL`)

**Do not change the classification logic without updating the CSS palette** — types map directly to CSS classes.

### 3. Frontend (`public/app.js`)

Key objects and functions:

| Symbol | Purpose |
|--------|---------|
| `EARS_META` | Maps type → CSS class + label. Update when adding new EARS types. |
| `EARS_HELP` | Static doc data (template, fields, example) for each type. Used by the help popup. |
| `EARS_KW_RE` | Regex for bold-highlighting EARS keywords in AC text. |
| `escapeHtml(s)` | XSS-safe escape — always called before injecting text into `innerHTML`. |
| `highlightEARS(text)` | escape → regex → `<strong>` tags. Used in cards and detail modal. |
| `renderCard(ac, group)` | Renders a single AC card. Uses `innerHTML` + `highlightEARS`. |
| `openModal(ac, group)` | Populates and shows the AC detail modal. |
| `initHelpOverlay()` | Creates `#help-overlay` DOM element at `DOMContentLoaded`. |
| `openHelpPopup(type)` | Shows the EARS help popup for a given type. |
| `renderStats(stats)` | Populates the sidebar stats. Badges get `data-help` for click→help popup. |

### 4. Two overlays, one Escape handler

- `#modal-overlay` (z-index 1000) — AC detail popup
- `#help-overlay` (z-index 1100) — EARS type help popup

The Escape handler uses `{ capture: true }` and checks `#help-overlay` first, calling `e.stopPropagation()` so it does not cascade to the AC detail modal.

### 5. CSS custom properties

All EARS type colors are defined as CSS variables in `:root`:

```css
--color-event: #3B82F6;   /* event-driven — blue  */
--color-unwanted: #F97316; /* unwanted — orange    */
--color-state: #22C55E;   /* state-driven — green  */
--color-ubiquitous: #6B7280; /* ubiquitous — gray  */
```

---

## What NOT to Do

- **Do not add a build step** — the project intentionally has no bundler/transpiler
- **Do not add frontend dependencies** — Vanilla JS only; no React, Vue, jQuery
- **Do not modify `server.js` or `src/parser.js`** for UI-only features — frontend changes belong in `public/`
- **Do not use `innerHTML` with unsanitized user/file content** — always call `escapeHtml()` first
- **Do not hardcode spec paths** — always use `WALDEN_SPECS_DIR` env var or the `SPECS_DIR` constant in `server.js`

---

## Running the App

```bash
npm install  # first time only

# Point to your Walden specs directory
WALDEN_SPECS_DIR=/path/to/.walden/specs node server.js

# Or run from the project root (auto-detects .walden/specs)
cd /path/to/project && node /path/to/ears-navigator/server.js
```

Then open [http://localhost:3000](http://localhost:3000).

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List available project names (subdirs of `SPECS_DIR`) |
| `GET` | `/api/projects/:name/requirements` | Parsed requirements as JSON `{ groups, stats }` |

Path traversal is blocked in the server — `:name` may not contain `..` or `/`.
