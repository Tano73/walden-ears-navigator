---
status: approved
approved_at: 2026-04-27T19:20:20Z
last_modified: 2026-04-27T19:20:20Z
source_design_approved_at: 2026-04-27T19:19:01Z
---

# Implementation Plan — ears-type-help-popup

- [ ] 1. Aggiungere dati statici EARS_HELP e CSS per il popup di aiuto
  - [ ] 1.1 Aggiungere oggetto `EARS_HELP` in `public/app.js`
    - Requirements: `R2.AC1`, `R2.AC2`, `R2.AC3`, `R2.AC4`, `R2.AC5`, `NFR1`
    - Design: Components And Interfaces — EARS_HELP (data object)
    - Verification:
      - command: ["node", "-e", "const {EARS_HELP} = require('./public/app.js'); ['event-driven','unwanted','state-driven','ubiquitous'].forEach(t => { if(!EARS_HELP[t]) throw new Error('missing '+t); })"]
        covers: ["R2.AC1", "R2.AC2", "R2.AC3", "R2.AC4", "R2.AC5"]

  - [ ] 1.2 Aggiungere CSS per `#help-overlay`, `.help-popup` e badge hover in `public/style.css`
    - Requirements: `R3.AC1`, `R3.AC2`, `C2`
    - Design: Architecture — style.css sezione
    - Verification:
      - command: ["grep", "-q", "help-overlay", "public/style.css"]
        covers: ["R3.AC1", "R3.AC2"]

- [ ] 2. Implementare le funzioni del popup di aiuto in `public/app.js`
  - [ ] 2.1 Implementare `initHelpOverlay()` — creazione DOM dell'overlay
    - Requirements: `R1.AC2`, `R2.AC5`, `C1`
    - Design: Components And Interfaces — initHelpOverlay()
    - Verification:
      - command: ["grep", "-q", "initHelpOverlay", "public/app.js"]
        covers: ["R1.AC2"]

  - [ ] 2.2 Implementare `openHelpPopup(type)` e `closeHelpPopup()`
    - Requirements: `R1.AC1`, `R1.AC3`, `R1.AC5`, `R1.AC6`
    - Design: Components And Interfaces — openHelpPopup, closeHelpPopup
    - Verification:
      - command: ["grep", "-q", "openHelpPopup", "public/app.js"]
        covers: ["R1.AC1", "R1.AC3", "R1.AC5", "R1.AC6"]

  - [ ] 2.3 Aggiornare il listener Escape per gestire la priorità del popup di aiuto
    - Requirements: `R1.AC4`, `R1.AC7`
    - Design: Components And Interfaces — Escape handler — modifica
    - Verification:
      - command: ["grep", "-q", "capture.*true\|true.*capture", "public/app.js"]
        covers: ["R1.AC4", "R1.AC7"]

- [ ] 3. Aggiornare `renderStats()` per abilitare i badge interattivi
  - [ ] 3.1 Aggiungere `data-help`, `tabindex`, `role`, `aria-label` e click/keydown handler ai badge EARS
    - Requirements: `R1.AC1`, `R3.AC1`, `R3.AC2`
    - Design: Components And Interfaces — renderStats() — modifica
    - Verification:
      - command: ["grep", "-q", "data-help", "public/app.js"]
        covers: ["R1.AC1", "R3.AC1", "R3.AC2"]

- [ ] 4. Integrare `initHelpOverlay()` nel `DOMContentLoaded` e verifica end-to-end
  - [ ] 4.1 Chiamare `initHelpOverlay()` all'interno del handler `DOMContentLoaded` in `app.js`
    - Requirements: `R2.AC5`, `C1`
    - Design: Architecture — app.js entry point
    - Verification:
      - command: ["sh", "-c", "grep -A 30 'DOMContentLoaded' public/app.js | grep -q 'initHelpOverlay'"]
        covers: ["R2.AC5"]

  - [ ] 4.2 Verifica finale: nessuna modifica a `index.html`, `server.js`, `src/parser.js`
    - Requirements: `C1`
    - Design: Architecture — nessuna modifica a index.html / server.js / src/parser.js
    - Verification:
      - command: ["sh", "-c", "git diff --name-only HEAD 2>/dev/null | grep -vE 'app\\.js|style\\.css|tasks\\.md' | grep -q 'ears-navigator/' && exit 1 || exit 0"]
        covers: ["C1"]
