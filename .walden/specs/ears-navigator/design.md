---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-11-06T16:13:19Z
last_modified: 2026-11-06T16:13:19Z
approved_fingerprint: sha256:2cdb1e8fa090894e6b088d412c7cba4a37b3b76c4153cb44eb35b089f2b7fa0b
source_requirements_approved_at: 2026-11-06T16:13:19Z
source_requirements_fingerprint: sha256:0bdac115f4bf4fa300e09f7094ee8004c9e49203e636c9010d1a578b33563b82
---

# Feature Design

## Overview

EARS Navigator è un'applicazione Node.js a server unico: Express espone le API REST e serve i file statici del frontend SPA. Il parser Markdown legge i file `requirements.md` con regex pure, senza dipendenze esterne. Il frontend Vanilla JS interroga le API, renderizza l'accordion e le card, gestisce il modale — tutto in un singolo file `app.js` e un `style.css`.

Stack: `node` + `express` (unica dipendenza npm); nessun bundler, nessun transpiler.

## Architecture

```
process.cwd()/.walden/specs/
          │
          ▼
  [ server.js (Express) ]
    ├── GET /api/projects           → legge sottodirectory con requirements.md
    ├── GET /api/projects/:name/requirements → parser.js → JSON
    └── GET /*                      → static serve da public/

  public/
    ├── index.html   (shell SPA)
    ├── app.js       (fetch + render + eventi)
    └── style.css    (layout, accordion, card types, modal)

  src/
    └── parser.js    (Markdown → JSON, puro Node.js fs/path)
```

Flusso dati: `app.js` → `fetch /api/projects` → dropdown → `fetch /api/projects/:name/requirements` → array di gruppi → render accordion + card → click card → modale.

## Options Considered

### Option A — Server Express + SPA Vanilla JS (scelta)

- Summary: un singolo processo Node.js serve API e static files; parser inline senza dipendenze.
- Why chosen: zero build step, zero transpiler, avviabile con `node server.js`, rispetta NFR1 e NFR2. Massima semplicità operativa.

### Option B — File HTML statico puro (`file://`)

- Summary: SPA aperta direttamente dal filesystem, senza server.
- Why rejected: non può leggere il filesystem locale da browser (CORS, `file://` restrictions). Richiederebbe un service worker o l'embed dei dati nel bundle, violando la lettura live dei file `.walden/`.

## Simplicity And Elegance Review

- Simplest viable shape: un file `server.js` + un file `src/parser.js` + tre file statici. Nessun middleware oltre `express.static` e `express.json()`.
- Coupling check: il parser non conosce Express; il frontend non conosce il filesystem. L'unico contratto è lo schema JSON dell'API.
- Future-proofing: il path `.walden/specs/` è parametrizzabile via env var `WALDEN_SPECS_DIR` senza toccare il parser.

## Components And Interfaces

### `server.js`

- Purpose: entry point, registra route API e middleware static, avvia il listener HTTP
- Inputs/Outputs:
  - `GET /api/projects` → `{ projects: string[] }`
  - `GET /api/projects/:name/requirements` → `RequirementsPayload` (vedi Data Models)
  - `GET /*` → serve `public/`
- Dependencies: `express`, `src/parser.js`, `fs`, `path`
- Requirements: `R5.AC1`, `R5.AC2`, `R5.AC3`, `R5.AC4`, `R5.AC5`

### `src/parser.js`

- Purpose: legge `requirements.md` e restituisce struttura JSON normalizzata
- Inputs/Outputs:
  - Input: percorso assoluto del file `requirements.md`
  - Output: `RequirementsPayload`
- Dependencies: `fs`, `path` (Node.js built-in only)
- Requirements: `R3.AC2`, `R3.AC3`, `R3.AC4`, `R3.AC5`, `NFR2`, `NFR3`

### `public/index.html`

- Purpose: shell HTML della SPA; contiene layout, include `style.css` e `app.js`
- Requirements: `R1.AC1`, `R2.AC1`, `R3.AC1`, `R6.AC1`

### `public/app.js`

- Purpose: logica frontend — fetch API, render accordion, render card, gestione modale, aggiornamento stats
- Dependencies: nessuna (DOM API nativo)
- Requirements: `R1.AC2`, `R1.AC3`, `R1.AC4`, `R2.AC2`, `R2.AC3`, `R2.AC4`, `R2.AC5`, `R3.AC1`–`R3.AC5`, `R4.AC1`–`R4.AC5`, `R6.AC1`–`R6.AC4`

### `public/style.css`

- Purpose: layout a due colonne (sidebar + main), stili accordion, palette card per tipo EARS, overlay modale
- Requirements: `R3.AC2`, `R3.AC3`, `R3.AC4`, `R3.AC5`, `R4.AC1`

## Data Models

### Schema JSON API

**`GET /api/projects`**
```json
{ "projects": ["airflow-filegw-modernization", "ears-navigator"] }
```

**`GET /api/projects/airflow-filegw-modernization/requirements`**
```json
{
  "project": "airflow-filegw-modernization",
  "groups": [
    {
      "id": "R1",
      "title": "Gestione dichiarativa delle FlowDefinition",
      "userStory": "As a amministratore di piattaforma, I want definire e attivare nuovi flussi tramite configurazione esterna, so that possa rendere operativo un nuovo flusso senza modifiche applicative.",
      "criteria": [
        {
          "id": "R1.AC1",
          "type": "event-driven",
          "text": "WHEN un amministratore carica una nuova FlowDefinition tramite l'interfaccia di gestione, the system SHALL validare schema, protocollo, relay e parametri di post-processing prima dell'attivazione"
        },
        {
          "id": "R1.AC4",
          "type": "unwanted",
          "text": "IF una FlowDefinition contiene combinazioni non supportate di protocollo o post-processing, THEN the system SHALL rifiutare l'attivazione"
        }
      ]
    }
  ],
  "stats": {
    "total": 40,
    "byType": { "event-driven": 30, "unwanted": 7, "state-driven": 3, "ubiquitous": 0 },
    "byGroup": { "R1": 5, "R2": 3, "R3": 4, "R4": 12, "R5": 5, "R6": 5, "R7": 5 }
  }
}
```

### Algoritmo Parser (`src/parser.js`)

Il parser processa il Markdown riga per riga in tre passi:

**Passo 1 — Estrazione gruppi**
```
regex: /^### (R\d+)\s+(.+)$/
→ group.id, group.title
```

**Passo 2 — Estrazione User Story**
```
regex: /^\*\*User Story:\*\*\s*(.+)$/
→ group.userStory
```

**Passo 3 — Estrazione e classificazione AC**
```
regex: /^\d+\.\s+`(R\d+\.AC\d+)`\s+(.+)$/
→ ac.id, ac.text

Classificazione tipo EARS (su ac.text trimmed, case-sensitive):
  starts-with "WHEN"  → "event-driven"
  starts-with "WHILE" → "state-driven"
  starts-with "IF"    → "unwanted"
  else                → "ubiquitous"
```

**Nota:** il pattern complesso WHILE+WHEN è classificato come "state-driven" (il token iniziale è WHILE).

### Tipo → Stile CSS

| Tipo | Classe CSS | Colore | Badge |
|------|-----------|--------|-------|
| `event-driven` | `card--event` | `#3B82F6` | `⚡ event` |
| `unwanted` | `card--unwanted` | `#F97316` | `⚠ unwanted` |
| `state-driven` | `card--state` | `#22C55E` | `🔄 state` |
| `ubiquitous` | `card--ubiquitous` | `#6B7280` | `✅ ubiquitous` |

## Layout UI (wireframe testuale)

```
┌─────────────────────────────────────────────────────────────────┐
│  EARS Navigator   [dropdown progetto ▼ airflow-filegw-modern…]  │ ← header
├──────────────┬──────────────────────────────────────────────────┤
│  Stats       │  R1  Gestione dichiarativa delle FlowDefinition  │
│              │  ────────────────────────────────────────────    │
│  Totale: 40  │  As a amministratore… [User Story]               │
│              │  ┌──────────────────┐ ┌──────────────────┐      │
│  ⚡ event 30 │  │ R1.AC1 ⚡ event  │ │ R1.AC4 ⚠ unwant │      │
│  ⚠ unwant 7 │  │ WHEN un amm…     │ │ IF una Flow…     │      │
│  🔄 state  3 │  └──────────────────┘ └──────────────────┘      │
│  ✅ ubiq.  0 │                                                   │
│              │  ▶ R2  Orchestrazione e polling  [3 AC]           │ ← chiuso
│  Per gruppo: │  ▶ R3  Trasferimento file        [4 AC]           │
│  R1: 5       │  ▼ R4  Pipeline post-processing  [12 AC]          │ ← aperto
│  R2: 3  …   │     [card grid…]                                  │
└──────────────┴──────────────────────────────────────────────────┘

Modale (overlay):
┌──────────────────────────────────────┐
│  R1.AC4          ⚠ unwanted    [✕]  │
│  ──────────────────────────────────  │
│  IF una FlowDefinition contiene…     │
│  (testo integrale)                   │
│  ──────────────────────────────────  │
│  Requisito padre: R1                 │
│  Gestione dichiarativa…              │
│  User Story: As a amministratore…    │
└──────────────────────────────────────┘
```

## Variabili CSS

```css
:root {
  --color-event:      #3B82F6;
  --color-unwanted:   #F97316;
  --color-state:      #22C55E;
  --color-ubiquitous: #6B7280;
  --bg-sidebar:       #F8FAFC;
  --bg-accordion-hdr: #F1F5F9;
  --radius-card:      8px;
  --shadow-card:      0 1px 3px rgba(0,0,0,0.12);
  --z-modal:          1000;
}
```

## Struttura File del Progetto

```
ears-navigator/
├── server.js          # Express server + route API + static serve
├── src/
│   └── parser.js      # Markdown → JSON (solo fs/path built-in)
├── public/
│   ├── index.html     # shell SPA
│   ├── app.js         # fetch, render accordion, card, modal, stats
│   └── style.css      # layout, palette EARS, modal overlay
└── package.json       # { "dependencies": { "express": "^4" } }
```

Il progetto si crea nella root del workspace (`/home/danlanzi/workspaces/OBG/ears-navigator/`), separato dal codice legacy.

## Error Handling

- **Progetto inesistente (`R5.AC3`)**: `res.status(404).json({ error: "Project not found: <name>" })`
- **File non leggibile (`R5.AC5`)**: try/catch in `server.js` attorno a `parser.parse()` → `res.status(500).json({ error: "Parse error", detail: err.message })`
- **Nessun progetto (`R1.AC4`)**: il frontend mostra `<p class="empty">Nessun progetto disponibile.</p>` al posto dell'accordion
- **Fetch fallita**: `app.js` cattura eccezioni di rete e mostra banner di errore nella main area

## Security Considerations

L'app è locale (localhost). La route `GET /api/projects/:name/requirements` sanitizza il nome del progetto con una regex `^[a-zA-Z0-9_-]+$` prima di costruire il path sul filesystem, prevenendo path traversal.

## Failure Modes And Tradeoffs

- **Failure mode**: file `requirements.md` con formato non standard → il parser restituisce gruppo vuoto senza crash
- **Mitigation**: il parser ignora le sezioni non riconosciute e continua; i gruppi con zero AC sono renderizzati come accordion vuoti
- **Tradeoff**: nessun watch live del filesystem — i dati si aggiornano solo al cambio progetto nel dropdown (fetch on-demand)

## Testing Strategy

- **Unit**: `src/parser.js` testato con snippet Markdown che coprono tutti e 4 i tipi EARS, gruppi multipli, User Story, AC con testo multiriga
- **Integration**: `server.js` testato con `supertest` o `curl` manuale — endpoint `/api/projects` e `/api/projects/airflow-filegw-modernization/requirements`
- **Smoke manual**: apertura browser su `http://localhost:3000`, verifica accordion, card colorate, modale, sidebar stats con il progetto reale `airflow-filegw-modernization`

## Verification Plan

- Requirement proof: avvio `node server.js`, apertura `http://localhost:3000`, selezione `airflow-filegw-modernization`, verifica 7 gruppi nell'accordion, verifica colori card, apertura modale su una card IF e verifica testo
- Test evidence: `node src/parser.js` in modalità script con output JSON verificato su almeno un gruppo con tutti e 4 i tipi EARS
- Operational evidence: log Express su stdout per ogni richiesta API ricevuta

## Requirement Coverage

| Requirement | Covered By |
| --- | --- |
| `R1` | `server.js` GET /api/projects + `app.js` dropdown init |
| `R2` | `app.js` renderAccordion + toggle handler |
| `R3` | `src/parser.js` classifyEARS + `style.css` card palette |
| `R4` | `app.js` openModal / closeModal handlers |
| `R5` | `server.js` route handlers + error middleware |
| `R6` | `app.js` renderStats + `public/index.html` sidebar |
| `NFR1` | `package.json` + `server.js` no-config start |
| `NFR2` | `package.json` single dep + zero frontend framework |
| `NFR3` | smoke test su `airflow-filegw-modernization` reale |
