---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-04-30T14:15:52Z
last_modified: 2026-04-30T14:15:52Z
approved_fingerprint: sha256:904819b7405048f2ac2c3fed29c335f39568caae95b8888cfcc9884ca2e89ef4
---

# Requirements Document

## Introduction

Il parser di EARS Navigator (`src/parser.js`) legge file Markdown da directory `.walden/specs/` e ne estrae requisiti EARS. Quando i file sono stati creati o scaricati su Windows con Git configurato per preservare i terminatori di linea DOS (`\r\n`, CRLF), ogni riga trattiene un `\r` in coda dopo lo split su `\n`. Questo corrompe il matching dei pattern regex (intestazioni di gruppo, user story, acceptance criteria) e la classificazione EARS, rendendo i requisiti invisibili nell'interfaccia.

Lo scopo di questa feature è normalizzare i terminatori di linea in input prima di qualsiasi processing, in modo che il parser produca output corretto indipendentemente dall'origine del file.

## Requirements

### R1 Tolleranza ai terminatori di linea DOS nel parser

**User Story:** As a developer on Windows, I want EARS Navigator to parse requirements files correctly, so that I can use the tool after cloning the repository without manual file conversion.

#### Acceptance Criteria

1. `R1.AC1` WHEN the parser reads a requirements file that contains CRLF line endings, the system SHALL produce the same parsed output as if the file contained LF-only line endings.
2. `R1.AC2` WHEN the parser reads a requirements file that contains LF-only line endings, the system SHALL continue to produce correct parsed output unchanged.
3. `R1.AC3` WHEN the parser reads a requirements file that contains mixed CRLF and LF line endings, the system SHALL normalize all line endings to LF before processing and produce correct parsed output.
4. `R1.AC4` IF a requirements file is empty or contains only whitespace, THEN the system SHALL return an empty groups array and zeroed stats without throwing an error, regardless of line ending style.

### R2 Correttezza della classificazione EARS con file CRLF

**User Story:** As a developer on Windows, I want EARS type badges to display correctly, so that the visual classification of acceptance criteria is accurate.

#### Acceptance Criteria

1. `R2.AC1` WHEN a CRLF-encoded file is parsed, the system SHALL classify each acceptance criterion into the correct EARS type (event-driven, state-driven, unwanted, ubiquitous) as if the file had LF endings.
2. `R2.AC2` WHEN a CRLF-encoded file is parsed, the system SHALL preserve the full text of each acceptance criterion without trailing `\r` characters.

## Non-Functional Requirements

- `NFR1` La normalizzazione dei terminatori di linea non deve introdurre overhead percettibile sulla lettura dei file per le dimensioni tipiche di un file `requirements.md` Walden (< 200 KB).
- `NFR2` La modifica deve essere circoscritta a `src/parser.js` senza alterare l'interfaccia pubblica del modulo (`parseRequirements`, `classifyEARS`).

## Constraints And Dependencies

- `C1` Il parser è scritto in JavaScript puro (Node.js) senza dipendenze aggiuntive oltre a `fs` nativo; la soluzione non deve aggiungere dipendenze npm.
- `C2` L'interfaccia API (`/api/projects/:name/requirements`) e il frontend non devono richiedere modifiche.

## Out Of Scope

- Conversione permanente dei file sorgente (normalizzazione `.gitattributes`): è una buona pratica separata, non parte di questo fix.
- Supporto ai terminatori di linea CR classico (vecchio Mac OS 9, `\r` senza `\n`).
- Modifica al server (`server.js`) o al frontend (`public/`).
