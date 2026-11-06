---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-11-06T15:53:31Z
last_modified: 2026-11-06T15:53:33Z
approved_fingerprint: sha256:b3321e0047b96f64be60216ddb8314c30d5a510741d520a33b97e2e33680a781
source_design_approved_at: 2026-11-06T15:46:18Z
source_design_fingerprint: sha256:f4625e1b336a9b3c8fb3c4d16ef290ea6fa176456928c0698f99a72d13aed1e6
---

# Implementation Plan

- [x] 1. Implementare la selezione della porta e il ciclo di vita del server in `src/start.js`
  - [x] 1.1 Implementare `resolveBasePort(env)` con default 3000 e validazione di `PORT`, con test dedicati
    - Requirements: `C1`, `C2`
    - Design: Components And Interfaces — `resolveBasePort(env)`
    - Verification:
      - command: ["node", "--test", "test/start.test.js"]
        expect_output: "C1"
        covers: ["C1", "C2"]
  - [x] 1.2 Implementare `start()` con retry su `EADDRINUSE`, incremento di 1 e uscita con errore a esaurimento porte, con test su porta libera, porta occupata e range esaurito
    - Requirements: `R1`, `R1.AC1`, `R1.AC2`, `R1.AC4`, `NFR1`
    - Design: Components And Interfaces — `start(options)`; Failure Modes And Tradeoffs
    - Verification:
      - command: ["node", "--test", "test/start.test.js"]
        expect_output: "R1.AC4"
        covers: ["R1.AC1", "R1.AC2", "R1.AC4", "NFR1"]
  - [x] 1.3 Stampare l'URL con la porta effettiva e verificare che l'app risponda su una porta di fallback, con test HTTP dedicato
    - Requirements: `R1`, `R1.AC3`, `R1.AC5`
    - Design: Components And Interfaces — `start(options)`; Verification Plan — test 1 e 3
    - Verification:
      - command: ["node", "--test", "test/start.test.js"]
        expect_output: "R1.AC5"
        covers: ["R1.AC3", "R1.AC5"]

- [x] 2. Implementare l'apertura automatica del browser con warning non bloccante
  - [x] 2.1 Implementare `openBrowser(url, options)` con comandi per piattaforma, singolo warning su errore o exit code non zero, e test con `spawnFn` stub
    - Requirements: `R2`, `R2.AC1`, `R2.AC2`, `C4`
    - Design: Components And Interfaces — `openBrowser(url, options)`; Verification Plan — test 6
    - Verification:
      - command: ["node", "--test", "test/start.test.js"]
        expect_output: "R2.AC2"
        covers: ["R2.AC1", "R2.AC2", "C4"]
  - [x] 2.2 Collegare l'opener a `start()` nell'evento `listening` e verificare che un fallimento produca solo un warning con il server ancora raggiungibile
    - Requirements: `R2`, `R2.AC2`, `R2.AC3`
    - Design: Components And Interfaces — `start(options)`; Failure Modes And Tradeoffs
    - Verification:
      - command: ["node", "--test", "test/start.test.js"]
        expect_output: "R2.AC3"
        covers: ["R2.AC2", "R2.AC3"]

- [x] 3. Collegare `server.js` e aggiornare il launcher `bin/ears-navigator`
  - [x] 3.1 Modificare `server.js` per calcolare la porta base con `resolveBasePort`, avviare tramite `start()` e mantenere l'export dell'istanza HTTP
    - Requirements: `C1`, `C3`
    - Design: Architecture — `server.js`
    - Verification:
      - command: ["sh", "-c", "node --check server.js && grep -q \"require('./src/start')\" server.js && grep -q \"module.exports = server\" server.js"]
        expect_exit: 0
        covers: ["C1", "C3"]
  - [x] 3.2 Aggiornare `bin/ears-navigator`: risalita ai parent, `SCRIPT_DIR`/`APP_DIR` da `BASH_SOURCE`, argomento esplicito invariato, rimozione dell'URL con porta fissa; aggiungere `test/launcher.test.js` end-to-end con finto opener
    - Requirements: `R1.AC6`, `R3`, `R3.AC1`, `R3.AC2`, `R3.AC3`, `R3.AC4`, `R3.AC5`, `R3.AC6`, `C5`, `C6`, `C7`
    - Design: Components And Interfaces — `bin/ears-navigator`; Verification Plan — test 9-13
    - Verification:
      - command: ["node", "--test", "test/launcher.test.js"]
        expect_output: "R3.AC1"
        covers: ["R1.AC6", "R3.AC1", "R3.AC2", "R3.AC3", "R3.AC4", "R3.AC5", "R3.AC6", "C5", "C6", "C7"]

- [x] 4. Aggiornare la documentazione e chiudere con la regressione
  - [x] 4.1 Aggiornare il README con fallback porta, apertura browser e launcher da qualsiasi sottodirectory, quindi eseguire l'intera suite e la regressione del parser
    - Requirements: `C2`, `C3`, `NFR1`
    - Design: Verification Plan — test 8 e verifica manuale
    - Verification:
      - command: ["sh", "-c", "grep -q 'porta successiva' README.md && node --test test/parser.test.js test/start.test.js test/launcher.test.js"]
        expect_output: "fail 0"
        covers: ["C2", "C3", "NFR1"]
