---
status: approved
approved_at: 2026-04-27T20:10:26Z
last_modified: 2026-04-27T20:10:41Z
source_design_approved_at: 2026-04-27T20:10:18Z
---

# Implementation Plan — ears-keyword-highlight

- [x] 1. Aggiungere le funzioni di highlighting in `public/app.js`
  - [x] 1.1 Implementare `escapeHtml(s)` e la costante `EARS_KW_RE`
    - Requirements: `R3.AC1`, `R3.AC2`, `NFR1`
    - Design: Components And Interfaces — escapeHtml / Regex
    - Verification:
      - command: ["node", "-e", "const s=require('fs').readFileSync('public/app.js','utf8'); if(!s.includes('escapeHtml')||!s.includes('EARS_KW_RE')) throw new Error('missing'); console.log('ok')"]
        covers: ["R3.AC1", "R3.AC2"]

  - [x] 1.2 Implementare `highlightEARS(text)` usando `escapeHtml` e `EARS_KW_RE`
    - Requirements: `R1.AC1`, `R1.AC2`, `R1.AC3`, `R2.AC1`, `R2.AC2`, `R3.AC1`, `R3.AC2`, `NFR1`
    - Design: Components And Interfaces — highlightEARS
    - Verification:
      - command: ["node", "-e", "const s=require('fs').readFileSync('public/app.js','utf8'); if(!s.includes('highlightEARS')) throw new Error('missing'); console.log('ok')"]
        covers: ["R1.AC1", "R1.AC2", "R1.AC3", "R2.AC1", "R2.AC2"]

- [x] 2. Applicare `highlightEARS` nei punti di inserimento DOM
  - [x] 2.1 Modificare `renderCard()`: sostituire `${ac.text}` con `${highlightEARS(ac.text)}`
    - Requirements: `R1.AC1`, `R1.AC2`, `R1.AC3`
    - Design: Components And Interfaces — renderCard() — modifica
    - Verification:
      - command: ["grep", "-q", "highlightEARS(ac.text)", "public/app.js"]
        covers: ["R1.AC1", "R1.AC2", "R1.AC3"]

  - [x] 2.2 Modificare `openModal()`: cambiare `modal-text.textContent` in `modal-text.innerHTML` con `highlightEARS(ac.text)`
    - Requirements: `R2.AC1`, `R2.AC2`
    - Design: Components And Interfaces — openModal() — modifica
    - Verification:
      - command: ["sh", "-c", "grep -q 'innerHTML.*highlightEARS' public/app.js"]
        covers: ["R2.AC1", "R2.AC2"]

- [x] 3. Verifica comportamento corretto tramite unit test inline
  - [x] 3.1 Testare `highlightEARS` su casi rappresentativi: keyword isolata, frase completa, testo con HTML arbitrario, requisito ubiquitous con T maiuscola
    - Requirements: `R1.AC1`, `R1.AC2`, `R1.AC3`, `R3.AC1`, `R3.AC2`
    - Design: Testing Strategy
    - Verification:
      - command: ["sh", "-c", "node -e \"\nconst src = require('fs').readFileSync('public/app.js','utf8');\neval(src.match(/function escapeHtml[\\s\\S]*?^\\}/m)?.[0] + src.match(/const EARS_KW_RE[\\s\\S]*?;/m)?.[0] + src.match(/function highlightEARS[\\s\\S]*?^\\}/m)?.[0]);\nassert = (a,b) => { if(a!==b) throw new Error('FAIL: '+JSON.stringify(a)+' != '+JSON.stringify(b)); };\nassert(highlightEARS('WHEN x'), '<strong>WHEN</strong> x');\nassert(highlightEARS('<script>'), '&lt;script&gt;');\nconst r1 = highlightEARS('IF x THEN the system SHALL y');\nif(!r1.includes('<strong>IF</strong>')) throw new Error('IF not bold');\nif(!r1.includes('<strong>THEN</strong>')) throw new Error('THEN not bold');\nif(!r1.includes('<strong>the system SHALL</strong>')) throw new Error('the system SHALL (lowercase) not bold');\nconst r2 = highlightEARS('The system SHALL garantire l invariante');\nif(!r2.includes('<strong>The system SHALL</strong>')) throw new Error('The system SHALL (capital T) not bold - issue#1');\nconsole.log('ALL PASS');\n\""]
        covers: ["R1.AC1", "R1.AC2", "R1.AC3", "R3.AC1", "R3.AC2"]
