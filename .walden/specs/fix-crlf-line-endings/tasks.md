---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-04-30T14:18:34Z
last_modified: 2026-04-30T14:19:47Z
approved_fingerprint: sha256:6d5bcb97f3b03e4c8c424a400186b9920b5dc190ec7002035e814f9e7b819cd4
source_design_approved_at: 2026-04-30T14:17:32Z
source_design_fingerprint: sha256:43163050f65119dcdfe818b8fb354742fa21467e006f7fca363e069a275b1ddc
---

# Implementation Plan

- [x] 1. Normalizzare i terminatori di linea in `src/parser.js`
  - [x] 1.1 Aggiungere `.replace(/\r\n/g, '\n')` dopo `fs.readFileSync` in `parseRequirements()`
    - Requirements: `R1.AC1`, `R1.AC2`, `R1.AC3`, `R2.AC1`, `R2.AC2`, `NFR1`, `NFR2`
    - Design: Components And Interfaces — `parseRequirements()`
    - Verification:
      - command: ["node", "-e", "const p = require('./src/parser'); console.assert(typeof p.parseRequirements === 'function' && typeof p.classifyEARS === 'function', 'interface unchanged')"]
        covers: ["NFR2"]

- [x] 2. Scrivere i test unitari per la normalizzazione CRLF
  - [x] 2.1 Creare `test/parser.test.js` con fixture CRLF, LF, misto e file vuoto
    - Requirements: `R1.AC1`, `R1.AC2`, `R1.AC3`, `R1.AC4`, `R2.AC1`, `R2.AC2`
    - Design: Testing Strategy
    - Verification:
      - command: ["node", "--test", "test/parser.test.js"]
        covers: ["R1.AC1", "R1.AC2", "R1.AC3", "R1.AC4", "R2.AC1", "R2.AC2"]
