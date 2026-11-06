---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-11-06T16:14:13Z
last_modified: 2026-11-06T16:14:13Z
approved_fingerprint: sha256:3efa1cd870b4a7a46d77d3a4957259cee27074e339249f0441d71f269eb425f1
source_design_approved_at: 2026-11-06T16:13:40Z
source_design_fingerprint: sha256:92d1cfa6ac1161aec65887c0423556a29769245ea56654f8cad96bcea65b98b4
---

# Implementation Plan — ears-type-help-popup

- [x] 1. Aggiungere dati statici EARS_HELP e CSS per il popup di aiuto
  - [x] 1.1 Aggiungere oggetto `EARS_HELP` in `public/app.js`
    - Requirements: `R2.AC1`, `R2.AC2`, `R2.AC3`, `R2.AC4`, `R2.AC5`, `NFR1`
    - Design: Components And Interfaces — EARS_HELP (data object)
    - Verification:
      - command: ["node", "-e", "const s=require('fs').readFileSync('public/app.js','utf8'); if(!s.includes('const EARS_HELP')) throw new Error('missing EARS_HELP'); ['event-driven','unwanted','state-driven','ubiquitous'].forEach(t => { if(!s.includes(t)) throw new Error('missing '+t); }); console.log('EARS_HELP ok')"]
        covers: ["R2.AC1", "R2.AC2", "R2.AC3", "R2.AC4", "R2.AC5"]

  - [x] 1.2 Aggiungere CSS per `#help-overlay`, `.help-popup` e badge hover in `public/style.css`
    - Requirements: `R3.AC1`, `R3.AC2`, `C2`
    - Design: Architecture — style.css sezione
    - Verification:
      - command: ["grep", "-q", "help-overlay", "public/style.css"]
        covers: ["R3.AC1", "R3.AC2"]

- [x] 2. Implementare le funzioni del popup di aiuto in `public/app.js`
  - [x] 2.1 Implementare `initHelpOverlay()` — creazione DOM dell'overlay
    - Requirements: `R1.AC2`, `R2.AC5`, `C1`
    - Design: Components And Interfaces — initHelpOverlay()
    - Verification:
      - command: ["grep", "-q", "initHelpOverlay", "public/app.js"]
        covers: ["R1.AC2"]

  - [x] 2.2 Implementare `openHelpPopup(type)` e `closeHelpPopup()`
    - Requirements: `R1.AC1`, `R1.AC3`, `R1.AC5`, `R1.AC6`
    - Design: Components And Interfaces — openHelpPopup, closeHelpPopup
    - Verification:
      - command: ["grep", "-q", "openHelpPopup", "public/app.js"]
        covers: ["R1.AC1", "R1.AC3", "R1.AC5", "R1.AC6"]

  - [x] 2.3 Aggiornare il listener Escape per gestire la priorità del popup di aiuto
    - Requirements: `R1.AC4`, `R1.AC7`
    - Design: Components And Interfaces — Escape handler — modifica
    - Verification:
      - command: ["grep", "-q", "capture: true", "public/app.js"]
        covers: ["R1.AC4", "R1.AC7"]

- [x] 3. Aggiornare `renderStats()` per abilitare i badge interattivi
  - [x] 3.1 Aggiungere `data-help`, `tabindex`, `role`, `aria-label` e click/keydown handler ai badge EARS
    - Requirements: `R1.AC1`, `R3.AC1`, `R3.AC2`
    - Design: Components And Interfaces — renderStats() — modifica
    - Verification:
      - command: ["grep", "-q", "data-help", "public/app.js"]
        covers: ["R1.AC1", "R3.AC1", "R3.AC2"]

- [x] 4. Integrare `initHelpOverlay()` nel `DOMContentLoaded` e verifica end-to-end
  - [x] 4.1 Chiamare `initHelpOverlay()` all'interno del handler `DOMContentLoaded` in `app.js`
    - Requirements: `R2.AC5`, `C1`
    - Design: Architecture — app.js entry point
    - Verification:
      - command: ["sh", "-c", "grep -A 30 'DOMContentLoaded' public/app.js | grep -q 'initHelpOverlay'"]
        covers: ["R2.AC5"]

  - [x] 4.2 Verifica finale: nessuna modifica a `index.html`, `server.js`, `src/parser.js`
    - Requirements: `C1`
    - Design: Architecture — nessuna modifica a index.html / server.js / src/parser.js
    - Verification:
      - command: ["node", "-e", "const cp=require('child_process'); const out=cp.execSync('git diff --name-only HEAD',{encoding:'utf8'}).split(String.fromCharCode(10)).filter(Boolean); const bad=out.filter(f=>f==='public/index.html'||f==='server.js'||f==='src/parser.js'); if(bad.length){console.error(bad);process.exit(1);} console.log('scope ok')"]
        covers: ["C1"]
