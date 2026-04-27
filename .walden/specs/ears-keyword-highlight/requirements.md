---
status: approved
approved_at: 2026-04-27T19:30:07Z
last_modified: 2026-04-27T19:30:07Z
---

# Requirements Document

## Introduction

Questa feature aggiunge l'evidenziazione visiva in grassetto delle parole chiave EARS nel testo dei requisiti mostrati nell'applicazione EARS Navigator. Le keyword da evidenziare sono raggruppate in due insiemi:

- **Keyword di trigger**: WHEN, WHILE, IF, THEN, WHERE, DURING
- **Keyword di obbligo**: la parola modale che esprime il vincolo (es. la parola che nelle specifiche EARS segue "the system" per indicare l'obbligo — in inglese: la parola modale a 5 lettere "S-H-A-L-L" nella notazione EARS standard)

L'obiettivo e' rendere immediatamente riconoscibile la struttura sintattica di ogni requisito sia nelle card dell'accordion che nel popup di dettaglio AC.

## Requirements

### R1 Evidenziazione keyword EARS nelle card dell'accordion

**User Story:** As a sviluppatore, I want vedere le keyword EARS evidenziate in grassetto nelle card dei requisiti, so that possa riconoscere a colpo d'occhio la struttura sintattica senza leggere l'intero testo.

#### Acceptance Criteria

1. `R1.AC1` The system SHALL applicare il grassetto alle keyword di trigger EARS (WHEN, WHILE, IF, THEN, WHERE, DURING) nel testo visualizzato in ogni card dell'accordion
2. `R1.AC2` The system SHALL applicare il grassetto alla locuzione composta da "the system" seguita dalla keyword di obbligo nel testo visualizzato in ogni card dell'accordion
3. `R1.AC3` The system SHALL limitare l'evidenziazione alle keyword che occorrono come parole intere, non come sottostringa di parole piu' lunghe

### R2 Evidenziazione keyword EARS nel popup di dettaglio AC

**User Story:** As a sviluppatore, I want vedere le keyword EARS evidenziate in grassetto nel popup di dettaglio, so that possa leggere il testo completo con la struttura sintattica chiaramente visibile.

#### Acceptance Criteria

1. `R2.AC1` The system SHALL applicare il grassetto alle keyword di trigger EARS (WHEN, WHILE, IF, THEN, WHERE, DURING) nel testo del requisito mostrato nel popup di dettaglio AC
2. `R2.AC2` The system SHALL applicare il grassetto alla locuzione composta da "the system" seguita dalla keyword di obbligo nel testo del requisito mostrato nel popup di dettaglio AC

### R3 Robustezza e sicurezza XSS

**User Story:** As a sviluppatore, I want che l'evidenziazione non introduca vulnerabilita' XSS, so that il testo dei requisiti sia sempre trattato come contenuto testuale non fidato.

#### Acceptance Criteria

1. `R3.AC1` The system SHALL effettuare l'escaping HTML del testo grezzo prima di applicare i tag di evidenziazione, per impedire l'esecuzione di markup arbitrario proveniente dai file di spec
2. `R3.AC2` The system SHALL costruire l'evidenziazione esclusivamente tramite tag `<strong>` senza attributi HTML dinamici o script inline

## Non-Functional Requirements

- `NFR1` La funzione di highlight e' una pura trasformazione stringa→stringa HTML implementata in `app.js`, senza dipendenze esterne

## Constraints And Dependencies

- `C1` L'implementazione deve modificare esclusivamente `public/app.js` e `public/style.css`; non sono ammesse modifiche a `index.html`, `server.js` o `src/parser.js`
- `C2` L'evidenziazione deve funzionare su tutti i file `.walden/specs/` esistenti senza modificarli

## Out Of Scope

- Colori diversi per keyword diverse (grassetto uniforme)
- Evidenziazione nel template del popup di aiuto EARS
- Supporto a keyword EARS in lingue diverse dall'inglese
