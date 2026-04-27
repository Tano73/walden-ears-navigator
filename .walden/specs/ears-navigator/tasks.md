---
status: approved
approved_at: 2026-04-27T19:01:36Z
last_modified: 2026-04-27T19:01:36Z
source_design_approved_at: 2026-04-27T18:57:02Z
---

# Implementation Plan

- [ ] 1. Setup progetto Node.js
  - [ ] 1.1 Creare la directory `ears-navigator/` nella root del workspace e inizializzare `package.json` con `express ^4` come unica dipendenza di runtime
    - Requirements: `NFR1`, `NFR2`
    - Design: Struttura File del Progetto
    - Verification:
      - command: ["sh", "-c", "test -f ears-navigator/package.json"]
        covers: ["NFR1", "NFR2"]
  - [ ] 1.2 Creare le directory `ears-navigator/src/` e `ears-navigator/public/` con i file `server.js`, `src/parser.js`, `public/index.html`, `public/app.js`, `public/style.css`
    - Requirements: `NFR1`
    - Design: Struttura File del Progetto
    - Verification:
      - command: ["sh", "-c", "test -d ears-navigator/src && test -d ears-navigator/public && test -f ears-navigator/server.js"]
  - [ ] 1.3 Eseguire `npm install` nella directory `ears-navigator/` per installare express
    - Requirements: `NFR1`, `NFR2`
    - Design: Struttura File del Progetto
    - Verification:
      - command: ["sh", "-c", "test -d ears-navigator/node_modules/express"]
        covers: ["NFR1"]

- [ ] 2. Implementare il parser Markdown EARS (`src/parser.js`)
  - [ ] 2.1 Implementare `parseRequirements(filePath)`: legge il file, estrae gruppi R* con regex, User Story e AC per ogni gruppo
    - Requirements: `R5.AC2`, `NFR3`
    - Design: Algoritmo Parser
    - Verification:
      - command: ["sh", "-c", "cd ears-navigator && node -e "const p=require('./src/parser'); const r=p.parseRequirements('../OBG-Batch-FileGW/.walden/specs/airflow-filegw-modernization/requirements.md'); if(r.groups.length!==7) process.exit(1); console.log('ok',r.groups.length)""]
        covers: ["R5.AC2", "NFR3"]
  - [ ] 2.2 Implementare `classifyEARS(text)`: ritorna `event-driven` per WHEN, `state-driven` per WHILE, `unwanted` per IF, `ubiquitous` altrimenti
    - Requirements: `R3.AC2`, `R3.AC3`, `R3.AC4`, `R3.AC5`
    - Design: Algoritmo Parser — Classificazione tipo EARS
    - Verification:
      - command: ["sh", "-c", "cd ears-navigator && node -e "const {classifyEARS}=require('./src/parser'); if(classifyEARS('WHEN x SHALL y')!=='event-driven') process.exit(1); if(classifyEARS('IF x THEN SHALL y')!=='unwanted') process.exit(1); if(classifyEARS('WHILE x SHALL y')!=='state-driven') process.exit(1); if(classifyEARS('The system SHALL y')!=='ubiquitous') process.exit(1); console.log('classify ok')""]
        covers: ["R3.AC2", "R3.AC3", "R3.AC4", "R3.AC5"]
  - [ ] 2.3 Aggiungere il calcolo dell'oggetto `stats` nel parser: `total`, `byType`, `byGroup`
    - Requirements: `R6.AC1`, `R6.AC2`, `R6.AC3`
    - Design: Schema JSON API
    - Verification:
      - command: ["sh", "-c", "cd ears-navigator && node -e "const p=require('./src/parser'); const r=p.parseRequirements('../OBG-Batch-FileGW/.walden/specs/airflow-filegw-modernization/requirements.md'); if(!r.stats||!r.stats.total||!r.stats.byType||!r.stats.byGroup) process.exit(1); console.log('stats ok')""]
        covers: ["R6.AC1", "R6.AC2", "R6.AC3"]

- [ ] 3. Implementare il server Express (`server.js`)
  - [ ] 3.1 Implementare `GET /api/projects`: scansiona `.walden/specs/` e restituisce i nomi delle sottodirectory con `requirements.md`
    - Requirements: `R5.AC1`, `R1.AC1`
    - Design: Components — server.js, Security Considerations
    - Verification:
      - command: ["sh", "-c", "cd ears-navigator && node -e "const http=require('http'); const s=require('./server'); setTimeout(()=>{ http.get('http://localhost:3000/api/projects', r=>{ let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ const j=JSON.parse(d); if(!j.projects.includes('airflow-filegw-modernization')) process.exit(1); console.log('projects ok'); s.close(); }); }); }, 500)""]
        covers: ["R5.AC1", "R1.AC1"]
  - [ ] 3.2 Implementare `GET /api/projects/:name/requirements`: valida nome con regex `^[a-zA-Z0-9_-]+$`, chiama il parser, gestisce 404 se non esiste e 500 su errore di parsing
    - Requirements: `R5.AC2`, `R5.AC3`, `R5.AC5`
    - Design: Components — server.js, Error Handling
    - Verification:
      - command: ["sh", "-c", "cd ears-navigator && node -e "const http=require('http'); const s=require('./server'); setTimeout(()=>{ http.get('http://localhost:3000/api/projects/nonexistent/requirements', r=>{ if(r.statusCode!==404) process.exit(1); console.log('404 ok'); s.close(); }); }, 500)""]
        covers: ["R5.AC3"]
  - [ ] 3.3 Configurare `express.static('public')` e aggiungere `"start": "node server.js"` nel `package.json`
    - Requirements: `R5.AC4`, `NFR1`
    - Design: Architecture
    - Verification:
      - command: ["sh", "-c", "grep -q 'express.static' ears-navigator/server.js && node -e "const p=require('./ears-navigator/package.json'); if(!p.scripts||!p.scripts.start) process.exit(1); console.log('static+start ok')""]
        covers: ["R5.AC4", "NFR1"]

- [ ] 4. Implementare HTML e CSS (`public/index.html`, `public/style.css`)
  - [ ] 4.1 Scrivere `public/index.html`: header con dropdown progetto, aside sidebar stats, main area accordion, include `style.css` e `app.js`
    - Requirements: `R1.AC1`, `R2.AC1`, `R6.AC1`
    - Design: Layout UI (wireframe testuale)
    - Verification:
      - command: ["sh", "-c", "grep -q 'id="project-select"' ears-navigator/public/index.html && grep -q 'id="accordion"' ears-navigator/public/index.html && grep -q 'id="stats"' ears-navigator/public/index.html && echo 'html ok'"]
        covers: ["R1.AC1"]
  - [ ] 4.2 Scrivere `public/style.css`: custom properties per i 4 tipi EARS, layout due colonne, stili accordion, card colorate con bordo sinistro, overlay modale
    - Requirements: `R3.AC2`, `R3.AC3`, `R3.AC4`, `R3.AC5`, `R4.AC1`
    - Design: Variabili CSS, Layout UI
    - Verification:
      - command: ["sh", "-c", "grep -q -- '--color-event' ears-navigator/public/style.css && grep -q '.card--event' ears-navigator/public/style.css && grep -q '.modal' ears-navigator/public/style.css && echo 'css ok'"]
        covers: ["R3.AC2", "R3.AC3", "R3.AC4", "R3.AC5"]

- [ ] 5. Implementare la logica frontend (`public/app.js`)
  - [ ] 5.1 Implementare init: al DOMContentLoaded, fetch /api/projects, popola dropdown, carica il primo progetto automaticamente; gestisce la lista vuota con messaggio informativo
    - Requirements: `R1.AC1`, `R1.AC2`, `R1.AC3`, `R1.AC4`
    - Design: Components — app.js, Architecture (flusso dati)
    - Verification:
      - command: ["sh", "-c", "grep -q 'DOMContentLoaded' ears-navigator/public/app.js && grep -q '/api/projects' ears-navigator/public/app.js && echo 'init ok'"]
        covers: ["R1.AC1", "R1.AC2", "R1.AC3", "R1.AC4"]
  - [ ] 5.2 Implementare `renderAccordion(groups)`: crea header cliccabile per gruppo con toggle open/close, primo gruppo aperto di default, User Story visibile sopra le card
    - Requirements: `R2.AC1`, `R2.AC2`, `R2.AC3`, `R2.AC4`, `R2.AC5`
    - Design: Components — app.js
    - Verification:
      - command: ["sh", "-c", "grep -q 'renderAccordion' ears-navigator/public/app.js && grep -q 'userStory' ears-navigator/public/app.js && echo 'accordion ok'"]
        covers: ["R2.AC1", "R2.AC2", "R2.AC3", "R2.AC4", "R2.AC5"]
  - [ ] 5.3 Implementare `renderCard(ac, group)`: card con classe `card--<type>`, mostra ID, badge tipo e testo; click apre il modale
    - Requirements: `R3.AC1`, `R3.AC2`, `R3.AC3`, `R3.AC4`, `R3.AC5`
    - Design: Tipo → Stile CSS, Components — app.js
    - Verification:
      - command: ["sh", "-c", "grep -q 'renderCard\|card--' ears-navigator/public/app.js && echo 'card ok'"]
        covers: ["R3.AC1", "R3.AC2", "R3.AC3", "R3.AC4", "R3.AC5"]
  - [ ] 5.4 Implementare `openModal(ac, group)` e `closeModal()`: mostra ID, tipo, testo, User Story e codice padre; chiusura via X, Escape e click overlay
    - Requirements: `R4.AC1`, `R4.AC2`, `R4.AC3`, `R4.AC4`, `R4.AC5`
    - Design: Layout UI (wireframe modale)
    - Verification:
      - command: ["sh", "-c", "grep -q 'openModal' ears-navigator/public/app.js && grep -q 'Escape' ears-navigator/public/app.js && echo 'modal ok'"]
        covers: ["R4.AC1", "R4.AC2", "R4.AC3", "R4.AC4", "R4.AC5"]
  - [ ] 5.5 Implementare `renderStats(stats)`: aggiorna sidebar con total, byType e byGroup; ricalcola al cambio progetto
    - Requirements: `R6.AC1`, `R6.AC2`, `R6.AC3`, `R6.AC4`
    - Design: Components — app.js
    - Verification:
      - command: ["sh", "-c", "grep -q 'renderStats' ears-navigator/public/app.js && grep -q 'byType' ears-navigator/public/app.js && echo 'stats ok'"]
        covers: ["R6.AC1", "R6.AC2", "R6.AC3", "R6.AC4"]

- [ ] 6. Smoke test di integrazione
  - [ ] 6.1 Avviare il server con `node server.js`, verificare che /api/projects/airflow-filegw-modernization/requirements restituisca 7 gruppi con tutti e 4 i tipi EARS presenti
    - Requirements: `R1.AC3`, `R2.AC1`, `R3.AC1`, `R5.AC1`, `R5.AC2`, `NFR3`
    - Design: Verification Plan
    - Verification:
      - command: ["sh", "-c", "cd ears-navigator && node -e "const http=require('http'); const s=require('./server'); setTimeout(()=>{ http.get('http://localhost:3000/api/projects/airflow-filegw-modernization/requirements', r=>{ let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ const j=JSON.parse(d); if(j.groups.length!==7){console.error('groups',j.groups.length);process.exit(1);} const types=new Set(j.groups.flatMap(g=>g.criteria.map(c=>c.type))); if(!types.has('event-driven')||!types.has('unwanted')){console.error('types',[...types]);process.exit(1);} console.log('smoke ok groups='+j.groups.length); s.close(); }); }); }, 500)""]
        covers: ["R1.AC3", "R2.AC1", "R3.AC1", "R5.AC1", "R5.AC2", "NFR3"]
