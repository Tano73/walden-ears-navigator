---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-11-06T15:43:08Z
last_modified: 2026-11-06T15:43:08Z
approved_fingerprint: sha256:5baedeb4706f13b96152a6fddb8108917339ddb1d489a5efe001ac67bc03800d
---

# Requirements Document

## Introduction

Questa feature rende piu' robusto l'avvio di EARS Navigator quando la porta HTTP predefinita e' gia' occupata da un altro processo. Oggi il server tenta di ascoltare su una sola porta e fallisce se questa non e' libera; la feature introduce una ricerca sequenziale della prima porta disponibile a partire dalla porta base, cosi' che l'applicazione possa essere avviata piu' volte o in parallelo senza intervento manuale.

La feature aggiunge inoltre l'apertura automatica del browser sull'URL effettivo dell'applicazione, con sola segnalazione di warning se l'apertura non riesce.

La feature considera anche il launcher `bin/ears-navigator` usato per avviare l'applicativo: oggi stampa un URL costruito sulla porta base prima che il server scelga quella effettiva, quindi con una porta occupata mostrerebbe un indirizzo errato; inoltre richiede di essere eseguito dalla root del progetto o con un percorso esplicito e contiene un percorso assoluto hardcoded.

La feature migliora quindi anche la risoluzione della directory specs: senza argomento il launcher risale le directory superiori fino a trovare `.walden/specs`, e la directory dell'applicazione viene derivata dal percorso reale dello script.

Il perimetro riguarda il processo Node.js, il launcher, il messaggio di avvio e l'apertura del browser; frontend, API e parser restano invariati.

## Requirements

### R1 Avvio sulla prima porta disponibile

**User Story:** As a sviluppatore, I want che il server cerchi automaticamente la prima porta libera a partire da quella base, so that possa avviare piu' istanze dell'applicazione senza configurare manualmente una porta diversa.

#### Acceptance Criteria

1. `R1.AC1` WHEN il processo viene avviato e la porta base e' libera, the system SHALL avviare il server in ascolto sulla porta base
   - Acceptance check: il server risponde su `http://localhost:<porta base>` e il messaggio di avvio riporta la porta base
2. `R1.AC2` IF la porta base e' occupata, THEN the system SHALL cercare la prima porta libera incrementando il numero di porta di 1 alla volta e avviare il server su quella porta
   - Acceptance check: con la porta base e la porta base+1 occupate, il server risponde sulla porta base+2
3. `R1.AC3` WHEN il server completa l'avvio, the system SHALL riportare nella console la porta effettivamente in ascolto
   - Acceptance check: il messaggio di avvio contiene il numero della porta su cui il server risponde, anche quando e' diversa dalla porta base
4. `R1.AC4` IF nessuna porta libera e' disponibile da quella base fino alla porta massima 65535, THEN the system SHALL terminare il processo con codice di uscita diverso da zero e un messaggio di errore esplicito
   - Acceptance check: il processo non resta in ascolto, esce con codice non zero e la console riporta l'impossibilita' di trovare una porta libera
5. `R1.AC5` WHEN il server e' in ascolto su una porta di fallback, the system SHALL servire frontend e API REST sulla stessa porta scelta
   - Acceptance check: una richiesta `GET /api/projects` sulla porta di fallback restituisce una risposta JSON valida
6. `R1.AC6` WHEN il server viene avviato tramite lo script `bin/ears-navigator`, the system SHALL non riportare alcun URL con una porta diversa da quella effettivamente in ascolto
   - Acceptance check: con la porta base occupata, l'output del launcher non contiene `localhost:<porta base>` e contiene `localhost:<porta effettiva>`

### R2 Apertura automatica del browser

**User Story:** As a sviluppatore, I want che il browser si apra automaticamente sull'applicazione all'avvio del server, so that possa iniziare a usarla senza copiare manualmente l'URL dalla console.

#### Acceptance Criteria

1. `R2.AC1` WHEN il server completa l'avvio, the system SHALL aprire il browser predefinito sull'URL `http://localhost:<porta effettiva>`
   - Acceptance check: all'avvio viene richiesta l'apertura del browser con l'URL che contiene la porta effettivamente in ascolto, inclusa una porta di fallback
2. `R2.AC2` IF l'apertura automatica del browser fallisce, THEN the system SHALL stampare nella console un warning che riporta l'URL da aprire manualmente
   - Acceptance check: in caso di errore del comando di apertura, la console mostra un warning con l'URL effettivo e nessun errore bloccante
3. `R2.AC3` IF l'apertura automatica del browser fallisce, THEN the system SHALL mantenere il server in ascolto e raggiungibile
   - Acceptance check: dopo l'errore di apertura il server risponde ancora sull'URL effettivo

### R3 Risoluzione della directory specs da qualsiasi sottodirectory

**User Story:** As a sviluppatore, I want avviare il launcher da qualunque sottodirectory del progetto senza passare un percorso, so that non debba ricordare o digitare ogni volta la posizione di `.walden/specs`.

#### Acceptance Criteria

1. `R3.AC1` WHEN lo script viene eseguito senza argomento da una directory che non contiene `.walden/specs`, the system SHALL risalire le directory superiori fino alla prima che contiene `.walden/specs` e usarla come specs dir
   - Acceptance check: eseguito da `<progetto>/sottodirectory`, il launcher riporta `<progetto>/.walden/specs` e avvia il server su quella directory
2. `R3.AC2` IF lo script viene eseguito senza argomento e nessuna directory superiore fino alla radice contiene `.walden/specs`, THEN the system SHALL terminare con codice diverso da zero e un messaggio esplicito, senza avviare il server
   - Acceptance check: eseguito da una directory temporanea fuori da qualsiasi progetto, il processo esce con codice non zero e spiega che non ha trovato una specs dir
3. `R3.AC3` WHEN lo script viene eseguito con un argomento esplicito valido, the system SHALL mantenere la risoluzione attuale, accettando `<argomento>/.walden/specs` oppure una directory specs passata direttamente, senza applicare la risalita ai parent
   - Acceptance check: eseguito da una directory esterna con il percorso di un progetto esistente, il launcher usa la specs dir di quel progetto
4. `R3.AC4` The system SHALL determinare la directory dell'applicazione dal percorso reale dello script, risolvendo eventuali symlink, senza percorsi assoluti hardcoded
   - Acceptance check: lo script avviato tramite symlink da una directory esterna trova comunque `server.js` e avvia l'applicazione
5. `R3.AC5` WHEN piu' directory superiori contengono `.walden/specs`, the system SHALL usare la prima incontrata risalendo dalla directory di partenza
   - Acceptance check: con due livelli annidati entrambi provvisti di `.walden/specs`, viene usata quella piu' vicina alla directory di avvio
6. `R3.AC6` IF un argomento esplicito non esiste o non e' una directory leggibile, THEN the system SHALL terminare con un messaggio di errore esplicito, senza avviare il server
   - Acceptance check: con un percorso inesistente il processo esce con codice non zero e un messaggio comprensibile, senza traccia di errore bash non gestito

## Non-Functional Requirements

- `NFR1` Il rilevamento della porta disponibile non deve introdurre attese artificiali: il server deve tentare le porte in sequenza e fermarsi alla prima disponibile, senza sleep o retry temporizzati

## Constraints And Dependencies

- `C1` La porta base e' `3000` quando la variabile d'ambiente `PORT` non e' impostata; se `PORT` e' impostata, la ricerca parte da quel valore
- `C2` La funzionalita' deve usare solo moduli nativi di Node.js ed `express`; non sono ammesse nuove dipendenze npm
- `C3` Il comportamento esistente di `WALDEN_SPECS_DIR`, delle API REST e del serving statico deve restare invariato
- `C4` L'apertura del browser deve funzionare su Windows, macOS e Linux usando i comandi di sistema disponibili, senza nuove dipendenze npm
- `C5` Lo script `bin/ears-navigator` resta il launcher supportato: deve propagare `WALDEN_SPECS_DIR` e `PORT` a `server.js` e delegare al server la comunicazione dell'URL effettivo, senza stampare una porta fissa
- `C6` La risalita delle directory deve fermarsi alla radice del filesystem e non deve cercare fuori dalla gerarchia dei parent della directory di avvio
- `C7` Il launcher resta uno script bash eseguibile e non deve introdurre dipendenze esterne oltre ai comandi POSIX disponibili

## Out Of Scope

- Scelta del browser da aprire diversa dal browser predefinito di sistema
- Ricerca di directory `.walden/specs` fuori dalla gerarchia dei parent della directory corrente
- Selezione interattiva quando sono presenti piu' progetti Walden candidati
- Riscrittura del launcher in un linguaggio diverso da bash
- Configurazione tramite variabile d'ambiente per disabilitare l'apertura automatica
- Scrittura della porta effettiva su file o endpoint dedicato
- Scansione di porte non sequenziali o selezione casuale della porta
- Configurazione di un limite massimo di tentativi diverso dal limite di porta 65535
- Modifiche al frontend per mostrare la porta effettiva
