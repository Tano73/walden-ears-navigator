---
status: approved
approved_at: 2026-04-30T14:17:32Z
last_modified: 2026-04-30T14:17:32Z
source_requirements_approved_at: 2026-04-30T14:15:52Z
---

# Feature Design

## Overview

Il fix consiste in una singola riga aggiunta in `parseRequirements()` in `src/parser.js`: dopo la lettura del file con `fs.readFileSync`, il contenuto viene normalizzato rimuovendo tutti i `\r` con `.replace(/\r\n/g, '\n')` prima di qualsiasi processing. Nessun'altra parte del codice (server, frontend, API) richiede modifiche.

## Architecture

```
fs.readFileSync(filePath, 'utf8')
  → .replace(/\r\n/g, '\n')   ← NUOVO: normalizzazione CRLF→LF
  → .split('\n')
  → loop riga per riga (regex match invariate)
  → { groups, stats }
```

Il cambiamento è contenuto interamente dentro `parseRequirements()`. L'interfaccia pubblica del modulo (`parseRequirements`, `classifyEARS`) e il contratto JSON verso il server restano identici.

## Options Considered

### Option A — `.replace(/\r\n/g, '\n')` dopo la lettura (approccio scelto)

- Summary: Sostituire `\r\n` con `\n` sull'intera stringa prima dello split.
- Why chosen: Una riga sola, zero dipendenze, O(n) sul testo, si applica prima di qualsiasi regex, copre CRLF puri e misti. Compatibile con il parsing esistente senza toccare nessuna regex.

### Option B — `.replace(/\r/g, '')` (rimozione di tutti i CR)

- Summary: Rimuovere ogni `\r` dalla stringa, non solo quelli seguiti da `\n`.
- Why rejected: Copre anche il caso CR-only (vecchio Mac OS 9), che è fuori scope per C1 dei requirements. La soluzione A è più precisa e intenzionale.

### Option C — Modifica ai pattern regex per tollerare `\r` in coda

- Summary: Aggiungere `\r?` alla fine di ogni regex (`RE_GROUP`, `RE_USER_STORY`, `RE_AC`, ecc.).
- Why rejected: Richiede modifiche a cinque pattern distinti, aumenta il rischio di regressioni e rende il codice più difficile da leggere. Centralizzare la normalizzazione in un punto solo è più manutenibile.

## Simplicity And Elegance Review

- Simplest viable shape: Una riga di trasformazione a monte, zero pattern modificati, zero nuove dipendenze.
- Coupling check: La normalizzazione è locale a `parseRequirements()`; `classifyEARS()` e tutto il resto non cambiano.
- Future-proofing: Se in futuro si volessero supportare altri encoding o line ending (CR legacy), il punto di normalizzazione è già identificato e isolato.

## Components And Interfaces

### `parseRequirements(filePath)` — `src/parser.js`

- Purpose: Leggere un file `requirements.md` Walden ed estrarne gruppi, criteri EARS e statistiche.
- Inputs/Outputs: `filePath: string` → `{ groups: Group[], stats: Stats }` (invariato)
- Dependencies: `fs.readFileSync` (Node.js built-in)
- Change: aggiunta di `.replace(/\r\n/g, '\n')` sulla riga immediatamente successiva a `readFileSync`
- Requirements: `R1`, `R2`

## Data Models

Nessuna variazione. L'output `{ groups, stats }` è strutturalmente identico.

## Error Handling

- File vuoto o solo whitespace: `split('\n')` produce un array di stringhe vuote, nessuna regex fa match, il loop termina restituendo `groups: []` e stats a zero. Questo soddisfa R1.AC4 già prima del fix; il fix non altera questo comportamento.
- File non trovato: `fs.readFileSync` lancia `ENOENT`, gestito a livello di route in `server.js` come 404. Invariato.

## Failure Modes And Tradeoffs

- Failure mode: Un file con soli `\r` (CR legacy) non viene normalizzato correttamente con Option A.
- Mitigation: Questo caso è esplicitamente fuori scope (Out Of Scope nei requirements). Se necessario in futuro, basta cambiare il pattern in `/\r\n|\r/g`.
- Tradeoff: Precisione vs. portabilità — si sceglie la precisione (solo CRLF) perché il caso CR legacy non esiste nell'ecosistema Walden/Git moderno.

## Testing Strategy

- **Unit test** in `test/parser.test.js` (nuovo file): testare `parseRequirements()` con fixture in memoria usando CRLF, LF puro, misto, e file vuoto.
- Non è necessario un test di integrazione separato perché il fix è a livello di trasformazione stringa, non di I/O di rete.
- Le fixture saranno stringhe costruite inline con `\r\n` e scritte su file temporanei con `fs.writeFileSync` per simulare file reali.

## Verification Plan

- Requirement proof: Test unitari eseguiti con `node --test` (Node.js built-in test runner, versione ≥18).
- Test evidence: Test pass per R1.AC1 (CRLF), R1.AC2 (LF), R1.AC3 (misto), R1.AC4 (vuoto), R2.AC1 (classificazione), R2.AC2 (no `\r` in coda).
- Operational evidence: nessun cambio di log/metriche richiesto; il fix è trasparente a runtime.

## Requirement Coverage

| Requirement | Covered By |
| --- | --- |
| `R1` | `parseRequirements()` — normalizzazione CRLF→LF prima dello split |
| `R2` | `parseRequirements()` — normalizzazione elimina `\r` prima di classifyEARS e del trim |
| `NFR1` | `.replace()` è O(n) sulla stringa, nessun parsing aggiuntivo |
| `NFR2` | Modifica circoscritta a `src/parser.js`, interfaccia pubblica invariata |
