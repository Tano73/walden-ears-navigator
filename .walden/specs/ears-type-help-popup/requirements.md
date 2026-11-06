---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-11-06T16:13:40Z
last_modified: 2026-11-06T16:13:40Z
approved_fingerprint: sha256:ed5d8c95b672e7a3f8958dbc96bbd48f273952a2072a05fe676b8f092929c1ee
---

# Requirements Document

## Introduction

Questa feature aggiunge un popup informativo nell'applicazione EARS Navigator: cliccando sul badge di un tipo EARS nella sezione "Per tipo EARS" della sidebar, si apre un overlay che mostra il template sintattico EARS, i campi obbligatori e un esempio per quel tipo. L'obiettivo e' permettere all'utente di consultare la guida EARS direttamente durante la navigazione dei requisiti.

## Requirements

### R1 Apertura e chiusura del popup di aiuto EARS

**User Story:** As a sviluppatore, I want aprire un popup di aiuto cliccando sul badge di un tipo EARS nella sidebar, so that possa consultare la sintassi e i campi obbligatori senza lasciare la pagina.

#### Acceptance Criteria

1. `R1.AC1` WHEN l'utente clicca sul badge di un tipo EARS nella sezione statistiche della sidebar, the system SHALL aprire un popup overlay che mostra la documentazione per quel tipo EARS
2. `R1.AC2` WHEN il popup di aiuto e' aperto, the system SHALL mostrare un pulsante di chiusura chiaramente identificabile
3. `R1.AC3` WHEN l'utente clicca sul pulsante di chiusura del popup di aiuto, the system SHALL chiudere il popup
4. `R1.AC4` WHEN l'utente preme il tasto Escape con il popup di aiuto aperto, the system SHALL chiudere il popup
5. `R1.AC5` WHEN il popup di aiuto e' aperto e l'utente clicca sull'overlay al di fuori del contenuto, the system SHALL chiudere il popup
6. `R1.AC6` WHEN il popup di aiuto viene aperto mentre un altro popup di aiuto e' gia' visibile, the system SHALL chiudere quello precedente prima di mostrare il nuovo
7. `R1.AC7` IF il popup di aiuto EARS e' aperto e il modale di dettaglio AC e' simultaneamente visibile, THEN the system SHALL gestire il tasto Escape chiudendo il popup EARS e interrompendo la propagazione dell'evento, per non chiudere accidentalmente il modale di dettaglio sottostante

### R2 Contenuto documentale per tipo EARS

**User Story:** As a sviluppatore, I want vedere per ogni tipo EARS il template sintattico, i campi obbligatori e un esempio concreto, so that possa capire come usarlo correttamente senza cercare documentazione esterna.

#### Acceptance Criteria

1. `R2.AC1` WHEN il popup di aiuto per il tipo event-driven e' aperto, the system SHALL mostrare il template sintattico, la lista dei campi obbligatori con descrizione e un esempio concreto per il tipo event-driven
2. `R2.AC2` WHEN il popup di aiuto per il tipo unwanted e' aperto, the system SHALL mostrare il template sintattico, la lista dei campi obbligatori con evidenza del campo THEN come obbligatorio, e un esempio concreto
3. `R2.AC3` WHEN il popup di aiuto per il tipo state-driven e' aperto, the system SHALL mostrare il template sintattico, la lista dei campi obbligatori con descrizione e un esempio concreto per il tipo state-driven
4. `R2.AC4` WHEN il popup di aiuto per il tipo ubiquitous e' aperto, the system SHALL mostrare il template sintattico, la descrizione dell'uso per invarianti e un esempio concreto
5. `R2.AC5` The system SHALL includere il contenuto documentale dei quattro tipi EARS come dati statici embedded nel frontend, senza richieste aggiuntive al server

### R3 Indicatori visivi di interattivita'

**User Story:** As a sviluppatore, I want capire visivamente che i badge EARS nella sidebar sono cliccabili, so that possa scoprire il popup di aiuto senza istruzioni esplicite.

#### Acceptance Criteria

1. `R3.AC1` The system SHALL rendere i badge dei tipi EARS nella sidebar con cursore pointer e un'icona `?` affiancata che segnala la disponibilita' del popup di aiuto
2. `R3.AC2` WHEN l'utente porta il puntatore su un badge EARS nella sidebar, the system SHALL applicare un effetto visivo di hover che evidenzia l'interattivita' del badge

## Non-Functional Requirements

- `NFR1` Il contenuto documentale EARS e' definito come oggetto JS statico in `app.js`, senza file aggiuntivi e senza fetch al server

## Constraints And Dependencies

- `C1` Il popup di aiuto EARS deve essere implementato modificando esclusivamente `public/app.js` e `public/style.css` dell'applicazione `ears-navigator`; non sono ammesse modifiche a `server.js` o `src/parser.js`
- `C2` Il popup di aiuto EARS deve coesistere con il modale di dettaglio AC gia' esistente senza conflitti di z-index o di gestione del tasto Escape

## Out Of Scope

- Popup di aiuto per NFR, vincoli o user story
- Tooltip inline sulle card dei requisiti
- Localizzazione in lingue diverse dall'italiano
- Modifica del contenuto documentale EARS tramite interfaccia
