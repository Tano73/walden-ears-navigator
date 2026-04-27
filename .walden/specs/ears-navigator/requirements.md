---
status: approved
approved_at: 2026-04-27T18:50:40Z
last_modified: 2026-04-27T18:50:40Z
---

# Requirements Document

## Introduction

EARS Navigator è un'applicazione web locale (Node.js + Express + Vanilla JS, zero build step) che consente di navigare graficamente i requisiti EARS presenti nella directory `.walden/specs/` del workspace. L'utente seleziona un progetto, esplora i gruppi di requisiti in un accordion gerarchico, legge le Acceptance Criteria come card colorate per tipo EARS, e apre il dettaglio di ogni AC in un modale.

Il perimetro è la sola lettura e visualizzazione: l'app non modifica i file `.walden/`.

## Requirements

### R1 Selezione del Progetto

**User Story:** As a sviluppatore, I want selezionare il progetto da navigare da un menu a discesa, so that possa passare rapidamente da un progetto all'altro senza ricaricare la pagina.

#### Acceptance Criteria

1. `R1.AC1` WHEN l'applicazione viene aperta, the system SHALL interrogare l'API per ottenere l'elenco delle sottodirectory presenti in `.walden/specs/` e popolare il dropdown di selezione progetto
2. `R1.AC2` WHEN l'utente seleziona un progetto dal dropdown, the system SHALL aggiornare la vista principale con i requisiti del progetto selezionato senza ricaricare la pagina
3. `R1.AC3` WHEN l'applicazione viene aperta, the system SHALL selezionare automaticamente il primo progetto disponibile e mostrarne i requisiti
4. `R1.AC4` IF la directory `.walden/specs/` non contiene sottodirectory con un file `requirements.md`, THEN the system SHALL mostrare un messaggio informativo nel pannello principale al posto dell'accordion

### R2 Navigazione Gerarchica ad Accordion

**User Story:** As a sviluppatore, I want vedere i gruppi di requisiti come sezioni espandibili, so that possa navigare la gerarchia dei requisiti senza perdere il contesto.

#### Acceptance Criteria

1. `R2.AC1` WHEN i requisiti di un progetto vengono caricati, the system SHALL renderizzare ogni gruppo di requisiti (R1, R2, ...) come una sezione accordion con header cliccabile che mostra codice gruppo, titolo e contatore delle AC
2. `R2.AC2` WHEN l'utente clicca sull'header di una sezione accordion chiusa, the system SHALL espandere quella sezione e mostrare le card EARS in essa contenute
3. `R2.AC3` WHEN l'utente clicca sull'header di una sezione accordion aperta, the system SHALL chiudere quella sezione
4. `R2.AC4` WHEN i requisiti di un progetto vengono caricati per la prima volta, the system SHALL aprire automaticamente la prima sezione accordion e chiudere le restanti
5. `R2.AC5` WHEN una sezione accordion viene espansa, the system SHALL mostrare la User Story del requisito come testo introduttivo sopra le card delle AC

### R3 Card EARS Colorate per Tipo

**User Story:** As a sviluppatore, I want vedere ogni Acceptance Criterion come una card colorata in base al tipo EARS, so that possa riconoscere a colpo d'occhio la tipologia comportamentale di ogni requisito.

#### Acceptance Criteria

1. `R3.AC1` WHEN una sezione accordion e' espansa, the system SHALL renderizzare ogni Acceptance Criterion come card che mostra ID (es. `R1.AC3`), badge tipo EARS e testo completo dell'AC
2. `R3.AC2` WHEN il parser determina che il tipo EARS di un AC e' event-driven, the system SHALL applicare alla card il colore blu (#3B82F6) e il badge tipo "event-driven"
3. `R3.AC3` WHEN il parser determina che il tipo EARS di un AC e' unwanted-behavior, the system SHALL applicare alla card il colore arancio (#F97316) e il badge tipo "unwanted"
4. `R3.AC4` WHEN il parser determina che il tipo EARS di un AC e' state-driven, the system SHALL applicare alla card il colore verde (#22C55E) e il badge tipo "state-driven"
5. `R3.AC5` WHEN il parser determina che il tipo EARS di un AC e' ubiquitous, the system SHALL applicare alla card il colore grigio (#6B7280) e il badge tipo "ubiquitous"

### R4 Dettaglio EARS su Click

**User Story:** As a sviluppatore, I want aprire il dettaglio di una AC cliccando sulla sua card, so that possa leggere il testo integrale e il contesto del requisito padre senza cambiare pagina.

#### Acceptance Criteria

1. `R4.AC1` WHEN l'utente clicca su una card AC, the system SHALL aprire un modale overlay che mostra ID completo, tipo EARS, testo integrale dell'AC e User Story del requisito padre
2. `R4.AC2` WHEN il modale e' aperto, the system SHALL mostrare un pulsante di chiusura chiaramente identificabile
3. `R4.AC3` WHEN l'utente clicca sul pulsante di chiusura del modale, the system SHALL chiudere il modale
4. `R4.AC4` WHEN l'utente preme il tasto Escape con il modale aperto, the system SHALL chiudere il modale
5. `R4.AC5` WHEN il modale e' aperto e l'utente clicca sull'overlay al di fuori del contenuto, the system SHALL chiudere il modale

### R5 API REST del Server

**User Story:** As a sviluppatore, I want che il server esponga dati strutturati via API REST, so that il frontend possa interrogarli senza dipendere dalla struttura del filesystem lato client.

#### Acceptance Criteria

1. `R5.AC1` WHEN il client esegue GET /api/projects, the system SHALL rispondere con un array JSON dei nomi delle sottodirectory di `.walden/specs/` che contengono un file `requirements.md`
2. `R5.AC2` WHEN il client esegue GET /api/projects/:name/requirements con un nome di progetto esistente, the system SHALL rispondere con un oggetto JSON che include l'array dei gruppi di requisiti con ID, titolo, User Story e AC classificate
3. `R5.AC3` IF il client richiede GET /api/projects/:name/requirements con un nome di progetto inesistente, THEN the system SHALL rispondere con HTTP 404 e un messaggio JSON descrittivo
4. `R5.AC4` WHEN il server viene avviato, the system SHALL servire i file statici della directory `public/` come root del frontend
5. `R5.AC5` IF il parser non riesce a leggere o interpretare il file `requirements.md`, THEN the system SHALL restituire HTTP 500 con un messaggio di errore strutturato

### R6 Statistiche Laterali

**User Story:** As a sviluppatore, I want una sidebar con i contatori del progetto selezionato, so that possa avere una visione aggregata della distribuzione delle AC prima di entrare nel dettaglio.

#### Acceptance Criteria

1. `R6.AC1` WHEN i requisiti di un progetto vengono caricati, the system SHALL aggiornare la sidebar con il contatore totale delle AC del progetto
2. `R6.AC2` WHEN i requisiti di un progetto vengono caricati, the system SHALL aggiornare la sidebar con i contatori distinti per tipo EARS (WHEN, IF, WHILE, ubiquitous)
3. `R6.AC3` WHEN i requisiti di un progetto vengono caricati, the system SHALL aggiornare la sidebar con i contatori per gruppo di requisiti mostrando per ciascuno il numero di AC
4. `R6.AC4` WHEN l'utente seleziona un progetto diverso, the system SHALL azzerare e ricalcolare tutti i contatori della sidebar in base al nuovo progetto

## Non-Functional Requirements

- `NFR1` Avviabilita': the system SHALL avviarsi con `node server.js` senza configurazione aggiuntiva e senza dipendenze da framework frontend o tool di build
- `NFR2` Dipendenze minimali: the system SHALL usare esclusivamente `express` come dipendenza npm di runtime; il frontend non deve dipendere da React, Vue, Angular, Webpack o Vite
- `NFR3` Compatibilita' parser: the system SHALL leggere correttamente i file `requirements.md` del progetto `airflow-filegw-modernization` (7 gruppi, circa 40 AC, tutti e 4 i tipi EARS)

## Constraints And Dependencies

- `C1` Il server Node.js deve risolvere il percorso di `.walden/specs/` relativamente alla directory da cui viene avviato (`process.cwd()`)
- `C2` Il parser Markdown deve funzionare senza dipendenze npm aggiuntive oltre a `fs` e `path` nativi di Node.js
- `C3` Il frontend deve essere una SPA servita come file statici dalla stessa istanza Express che espone le API

## Out Of Scope

- Modifica o scrittura di file `.walden/` dall'interfaccia
- Supporto alla visualizzazione di `design.md` o `tasks.md`
- Autenticazione o controllo degli accessi
- Deployment su server remoto o containerizzazione
