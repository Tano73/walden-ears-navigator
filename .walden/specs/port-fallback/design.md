---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-11-06T15:46:18Z
last_modified: 2026-11-06T15:46:18Z
approved_fingerprint: sha256:f4625e1b336a9b3c8fb3c4d16ef290ea6fa176456928c0698f99a72d13aed1e6
source_requirements_approved_at: 2026-11-06T15:43:08Z
source_requirements_fingerprint: sha256:5baedeb4706f13b96152a6fddb8108917339ddb1d489a5efe001ac67bc03800d
---

# Feature Design

## Architecture

L'avvio viene spostato dal corpo di `server.js` a un nuovo modulo `src/start.js`, mentre `server.js` resta un entry point sottile che calcola la porta base, avvia il server ed esporta l'istanza HTTP come oggi.

```
bin/ears-navigator
 ├── SCRIPT_DIR/APP_DIR da BASH_SOURCE[0] risolto (symlink-safe)
 ├── resolve_specs_dir:
 │    ├── argomento esplicito → logica attuale, senza walk-up
 │    └── nessun argomento → risalita dei parent fino a .walden/specs
 ├── errore esplicito se specs dir assente o argomento non valido
 ├── stampa "Specs dir"
 ├── NON stampa piu' http://localhost:${PORT:-3000}
 └── exec env WALDEN_SPECS_DIR=... node "$APP_DIR/server.js"

server.js
 ├── resolveBasePort(process.env)      → PORT valida oppure 3000
 ├── start({ app, basePort })          → avvia e restituisce http.Server
 └── module.exports = server           → forma di export invariata

src/start.js
 ├── MAX_PORT = 65535
 ├── resolveBasePort(env)              → validazione della porta base
 ├── start({ app, basePort, maxPort, logger, openBrowserFn, exit })
 │    ├── http.createServer(app)
 │    ├── retry su EADDRINUSE: port += 1 fino a maxPort
 │    ├── on listening → log URL + openBrowserFn(url, { onWarning })
 │    └── on exhausted / altro errore → logger.error + exit(1)
 └── openBrowser(url, { platform, spawnFn, onWarning })
      ├── win32  → cmd /c start "" <url>
      ├── darwin → open <url>
      └── altro  → xdg-open <url>
```

Il launcher `bin/ears-navigator` perde l'echo `Server : http://localhost:${PORT:-3000}`: la porta effettiva e' nota solo dopo il bind, quindi l'URL viene stampato esclusivamente da `server.js` nell'evento `listening`. Restano invariati l'echo di `Specs dir` e l'`exec` che propaga `WALDEN_SPECS_DIR` e `PORT`.

La risoluzione della specs dir viene estesa senza cambiare la semantica dell'argomento esplicito:

- **Nessun argomento:** si parte da `pwd` e si risale con `dirname` finche' esiste `<dir>/.walden/specs`; vince la prima directory incontrata. La risalita termina alla radice (`/`) e non guarda fuori dai parent.
- **Argomento esplicito:** si mantiene il comportamento attuale (`<argomento>/.walden/specs` oppure directory specs passata direttamente); la validita' viene controllata prima di `cd`, cosi' un percorso inesistente produce un errore gestito invece dell'uscita grezza dovuta a `set -e`.
- **Direzione dell'applicazione:** `SCRIPT_DIR` e' la directory dello script ottenuta da `${BASH_SOURCE[0]}` risolvendo i symlink; `APP_DIR` e' la sua directory padre e `server.js` viene cercato in `APP_DIR`, eliminando il percorso assoluto hardcoded.

Il server HTTP viene creato una sola volta: a ogni tentativo si richiama `server.listen(port)` sullo stesso oggetto dopo `EADDRINUSE`, evitando il pattern check-then-bind e la relativa race condition. `openBrowserFn`, `spawnFn`, `logger` ed `exit` sono iniettabili solo per i test; il comportamento di default usa `console`, `child_process.spawn` e `process.exit`.

`server.js` mantiene l'export `module.exports = server`, quindi i test esistenti che fanno `require('./server')` e `server.close()` continuano a funzionare.

## Options Considered

### Option A (scelta) — Retry sullo stesso `http.Server` con handler `EADDRINUSE`

- **Sommario:** si crea un solo `http.Server`; al primo errore `EADDRINUSE` si incrementa la porta e si richiama `server.listen(port)`.
- **Perché scelta:** elimina la race tra verifica e bind, non introduce dipendenze, mantiene l'export del server e consente un loop senza timer (NFR1).
- **Verifica preliminare:** Node consente di richiamare `listen` sullo stesso server dopo un errore `EADDRINUSE`; il comportamento è stato provato localmente.

### Option B — Pre-check con `net.createServer()` e poi `app.listen(port)`

- **Sommario:** si verifica la disponibilità di ogni porta con un server TCP temporaneo e, alla prima libera, si avvia Express su quella porta.
- **Perché scartata:** introduce una finestra TOCTOU in cui un altro processo puo' occupare la porta tra il check e il bind; inoltre richiede due socket per tentativo.

### Option C — Dipendenza npm `open` per il browser

- **Sommario:** usare il pacchetto `open` per lanciare il browser predefinito.
- **Perché scartata:** viola `C2` (nessuna nuova dipendenza npm); i comandi di sistema coprono i tre OS richiesti da `C4` con poche righe.

### Option D — Il launcher pre-calcola la porta libera e la passa via `PORT`

- **Sommario:** `bin/ears-navigator` cerca la prima porta libera e avvia `node server.js` con `PORT=<porta trovata>`.
- **Perché scartata:** duplica nel launcher la logica di retry, reintroduce la race tra verifica e bind e lascia due implementazioni da mantenere; inoltre il launcher non puo' conoscere la porta realmente occupata dal server.

### Option E — Risalita tramite `git rev-parse --show-toplevel`

- **Sommario:** usare Git per trovare la root del repository e cercare `.walden/specs` solo li'.
- **Perché scartata:** introduce una dipendenza da Git e da un repository, non funziona per directory specs fuori da Git e non copre progetti Walden annidati; la risalita POSIX con `dirname` e' autosufficiente (`C7`).

## Simplicity And Elegance Review

- **Un solo modulo nuovo:** `src/start.js` contiene avvio, retry e apertura browser; non viene creato un grafo di moduli per meno di 100 righe.
- **Nessuna nuova configurazione utente:** il fallback e' sempre attivo; non ci sono flag o variabili aggiuntive oltre alla `PORT` gia' esistente (`C1`).
- **Nessun timer o sleep:** il passaggio alla porta successiva avviene nell'handler `error` (NFR1).
- **Separazione minima:** `server.js` decide solo la porta base e l'export; `src/start.js` e' testabile senza avviare il processo reale e senza aprire un browser.
- **Launcher senza logica duplicata:** `bin/ears-navigator` non calcola porte e non conosce il retry; aggiunge solo un loop `dirname` e la risoluzione del proprio percorso.
- **Nessuna selezione interattiva:** la prima directory trovata risalendo vince, quindi il comportamento e' deterministico e non richiede input.
- **Riuso:** le route Express, il parser e il serving statico non vengono toccati (`C3`).

## Failure Modes And Tradeoffs

| Failure mode | Mitigazione | Tradeoff |
|---|---|---|
| Porta occupata tra due tentativi | Il bind reale e' il test di disponibilita'; nessun pre-check | Un tentativo puo' fallire e viene semplicemente ripetuto sulla porta successiva |
| Tutte le porte da base a 65535 occupate | `logger.error` esplicito e `process.exit(1)` | La scansione esaustiva puo' richiedere tempo, ma solo nel percorso di errore |
| Errore diverso da `EADDRINUSE` (es. `EACCES`) | Log dell'errore e uscita non zero, senza incrementare la porta | Incrementare non risolverebbe un problema di permessi |
| Comando di apertura browser assente (`ENOENT`) | `onWarning` con URL manuale; il server resta in ascolto | Il warning e' l'unico feedback, come richiesto da `R2.AC2` |
| Comando browser termina con codice non zero | Stesso `onWarning`, emesso una sola volta per tentativo | Alcuni opener di sistema restituiscono 0 anche senza browser visibile; non e' verificabile oltre |
| Doppio evento `error` + `close` sullo stesso spawn | Flag `warned` per emettere un solo warning | Piccola variabile di stato locale |
| Browser aperto su porta sbagliata | L'URL usa `server.address().port` letto nell'evento `listening` | Nessuno: e' la porta reale, non quella richiesta |
| Launcher che stampa la porta base prima del bind | Rimosso l'echo dell'URL dal launcher; l'URL e' stampato solo dal server | Il launcher mostra meno informazioni immediate, ma nessun indirizzo errato |
| Piu' `.walden/specs` nella gerarchia | Vince la prima incontrata risalendo; nessuna domanda interattiva | Un progetto annidato puo' oscurare quello esterno, ma in modo prevedibile |
| Argomento esplicito inesistente con `set -e` | Validazione con `-d` prima di `cd` e messaggio gestito | Nessuno: l'errore grezzo viene sostituito da uno comprensibile |
| Script avviato tramite symlink | Risoluzione del percorso reale da `BASH_SOURCE[0]` prima di calcolare `APP_DIR` | Un ciclo di symlink patologico non e' supportato, come nella maggior parte degli script bash |
| Risalita oltre la radice | Il loop termina quando `dirname` restituisce `/` | Nessuno: non viene cercato fuori dai parent (`C6`) |
| `PORT` non numerica o fuori range | `resolveBasePort` torna a 3000 | Una configurazione errata non blocca l'avvio, coerente con il default esistente |

## Components And Interfaces

### `resolveBasePort(env)`

- **Input:** oggetto ambiente (default `process.env`).
- **Output:** intero tra 1 e 65535, oppure 3000 se `PORT` e' assente/non valida.
- **Requirements:** `C1`

### `start(options)`

- **Input:** `app` (request listener Express), `basePort`, `maxPort` (default 65535), `logger`, `openBrowserFn`, `exit`.
- **Output:** `http.Server` gia' in fase di listen o in retry.
- **Comportamento:**
  - `EADDRINUSE` e `port < maxPort` → incrementa e richiama `listen`.
  - `EADDRINUSE` e `port === maxPort` → `logger.error("Nessuna porta libera tra <base> e <max>")` + `exit(1)`.
  - altro errore → `logger.error` + `exit(1)`.
  - `listening` → `url = http://localhost:<server.address().port>`, `logger.log` dell'URL, `openBrowserFn(url, { onWarning })`.
  - `onWarning` → `logger.warn` con URL e istruzioni di apertura manuale.
- **Requirements:** `R1.AC1`, `R1.AC2`, `R1.AC3`, `R1.AC4`, `R2.AC1`, `R2.AC2`, `R2.AC3`

### `openBrowser(url, options)`

- **Input:** URL, `platform` (default `process.platform`), `spawnFn` (default `child_process.spawn`), `onWarning`.
- **Comportamento:** sceglie comando per piattaforma, lancia il processo in modo detached con `stdio: 'ignore'`, chiama `onWarning` una sola volta su errore di spawn o exit code non zero.
- **Requirements:** `R2.AC1`, `R2.AC2`, `C4`

### `bin/ears-navigator` — modifica

- **Cambiamenti:**
  - rimuovere la riga `echo "  Server    : http://localhost:${PORT:-3000}"`;
  - derivare `SCRIPT_DIR` da `${BASH_SOURCE[0]}` risolvendo i symlink e `APP_DIR` come directory padre;
  - eseguire `node "$APP_DIR/server.js"` invece del percorso assoluto hardcoded;
  - senza argomento, risalire i parent fino a `<dir>/.walden/specs` (prima trovata);
  - con argomento esplicito, mantenere la risoluzione attuale e validare il percorso prima di `cd`;
  - su specs dir non trovata o argomento non valido, stampare un errore su stderr e uscire con codice 1.
- **Invariato:** echo di `Specs dir`, supporto a `<argomento>/.walden/specs` e a una directory specs diretta, propagazione di `WALDEN_SPECS_DIR` e `PORT` tramite `exec env`.
- **Requirements:** `R1.AC6`, `R3.AC1`, `R3.AC2`, `R3.AC3`, `R3.AC4`, `R3.AC5`, `R3.AC6`, `C5`, `C6`, `C7`

## Verification Plan

Tutti i test usano il runner nativo `node --test` gia' presente nel progetto (`test/parser.test.js`), senza nuove dipendenze.

1. **Porta base libera** — creare un server di prova, avviare `start` su una porta alta libera con logger e opener stub; asserire che `server.listening` sia vero, che `server.address().port` coincida con la base e che `logger.log` contenga l'URL. Copre `R1.AC1`, `R1.AC3`, `R2.AC1`.
2. **Prima porta successiva** — occupare la base con `net.createServer`, avviare `start`; asserire che la porta scelta sia `base + 1`. Ripetere occupando base e base+1 e asserire `base + 2`. Copre `R1.AC2`.
3. **Servizio sulla porta di fallback** — con un'app Express di prova che espone `/api/projects`, effettuare `GET /api/projects` sulla porta scelta e asserire status 200 e JSON valido. Copre `R1.AC5`.
4. **Esaurimento porte** — usare `maxPort` piccolo, occupare tutte le porte del range, avviare `start` con `exit` stub; asserire `exit(1)`, messaggio di errore e nessun `logger.log` di avvio. Copre `R1.AC4`.
5. **Warning browser** — con `openBrowserFn` stub che invoca `onWarning`, asserire `logger.warn` con l'URL e verificare che una richiesta HTTP al server risponda ancora. Copre `R2.AC2`, `R2.AC3`.
6. **Comandi browser per piattaforma** — con `spawnFn` stub, asserire `cmd /c start "" <url>` su `win32`, `open <url>` su `darwin`, `xdg-open <url>` sulle altre piattaforme; simulare `error` e `close` con codice non zero e asserire un solo warning. Copre `R2.AC1`, `R2.AC2`, `C4`.
7. **Porta base da ambiente** — asserire `resolveBasePort({}) === 3000`, `resolveBasePort({ PORT: '4100' }) === 4100` e fallback a 3000 per valori invalidi. Copre `C1`.
8. **Regressione** — eseguire `node --test test/parser.test.js` e una verifica manuale di `GET /api/projects` con `WALDEN_SPECS_DIR` reale. Copre `C3`, `NFR1`.
9. **Launcher end-to-end** — creare un progetto temporaneo con `.walden/specs/probe/requirements.md`; occupare la porta base e avviare `bash bin/ears-navigator <progetto>` con `PORT=<base>` e un finto `xdg-open` nel `PATH` che registra l'URL ricevuto. Asserire che stdout contenga `localhost:<base+1>`, non contenga `localhost:<base>`, che il finto opener riceva l'URL con `base+1` e che `GET /api/projects` sulla porta scelta risponda. Terminare il processo al termine. Copre `R1.AC6`, `R2.AC1`, `C5`.
10. **Risalita da sottodirectory** — eseguire `bash bin/ears-navigator` senza argomento da `<progetto>/a/b`, con finto opener nel `PATH`; asserire che l'output riporti `<progetto>/.walden/specs` e che il server risponda. Copre `R3.AC1`, `R3.AC5`.
11. **Nessuna specs dir** — eseguire lo script da una directory temporanea fuori da qualsiasi progetto; asserire exit code non zero, messaggio su stderr e nessun processo server avviato. Copre `R3.AC2`.
12. **Argomento esplicito** — eseguire da una directory esterna con il percorso di un progetto (valido) e con un percorso inesistente; asserire rispettivamente l'avvio con la specs dir indicata e l'uscita con errore gestito. Copre `R3.AC3`, `R3.AC6`.
13. **Script dir e symlink** — creare un symlink allo script in una directory esterna ed eseguirlo da una sottodirectory del progetto; asserire che trovi `server.js` e avvii il server. Copre `R3.AC4`.

La verifica manuale finale avvia due istanze consecutive tramite `bin/ears-navigator`: la seconda deve scegliere la porta successiva, stampare solo l'URL corretto e aprire il browser su quell'URL. I test 9-13 sono POSIX; su Windows il controllo equivalente resta manuale.

## Requirement Coverage

| Requirement | Covered By |
| --- | --- |
| `R1` | `start` con retry su `EADDRINUSE`, URL derivato da `server.address().port` |
| `R1.AC1` | `start` su porta base libera + test 1 |
| `R1.AC2` | incremento `port += 1` su `EADDRINUSE` + test 2 |
| `R1.AC3` | `logger.log` nell'evento `listening` + test 1 |
| `R1.AC4` | ramo `port === maxPort` con `logger.error` + `exit(1)` + test 4 |
| `R1.AC5` | stesso `http.Server`/app su qualsiasi porta scelta + test 3 |
| `R1.AC6` | rimosso l'echo della porta fissa da `bin/ears-navigator`; URL solo dal server + test 9 |
| `R3` | risalita dei parent e derivazione di `APP_DIR` nello script |
| `R3.AC1` | loop `dirname` fino a `.walden/specs` + test 10 |
| `R3.AC2` | errore su stderr e exit 1 se la risalita non trova specs dir + test 11 |
| `R3.AC3` | ramo argomento esplicito invariato + test 12 |
| `R3.AC4` | `SCRIPT_DIR` da `BASH_SOURCE[0]` risolto + `APP_DIR/server.js` + test 13 |
| `R3.AC5` | prima directory incontrata risalendo + test 10 |
| `R3.AC6` | validazione `-d` prima di `cd` + test 12 |
| `R2` | `openBrowser` invocato da `start` nell'evento `listening` |
| `R2.AC1` | URL `http://localhost:<porta effettiva>` passato all'opener + test 1 e 6 |
| `R2.AC2` | `onWarning` → `logger.warn` con URL, emesso una sola volta + test 5 e 6 |
| `R2.AC3` | il warning non chiude il server; richiesta HTTP successiva + test 5 |
| `NFR1` | nessun timer/sleep nel retry; transizione nell'handler `error` + test 2 e 4 |
| `C1` | `resolveBasePort` con `PORT` o default 3000 + test 7 |
| `C2` | solo `http`, `child_process`, `process` di Node.js + review delle import |
| `C3` | route, parser e statici invariati; test 8 e regressione parser |
| `C4` | mapping `win32`/`darwin`/default in `openBrowser` + test 6 |
| `C5` | launcher mantiene l'exec e la propagazione env, senza URL fisso + test 9 |
| `C6` | risalita terminata alla radice, solo parent della directory di avvio + test 11 |
| `C7` | bash + comandi POSIX (`dirname`, `readlink`, `cd`), nessuna dipendenza esterna + test 9-13 |
