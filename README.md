# EARS Navigator

Applicazione web locale per navigare graficamente i requisiti EARS di un progetto Walden.

## Avvio

```bash
bin/ears-navigator /path/to/project-with-walden
```

Lo script può essere eseguito da qualunque sottodirectory del progetto: senza argomento risale le directory superiori fino a trovare `.walden/specs`. In alternativa:

```bash
cd ears-navigator
npm install          # solo la prima volta
WALDEN_SPECS_DIR=/path/to/.walden/specs node server.js
```

## Porta e browser

Il server parte dalla porta `PORT` (default `3000`). Se è occupata prova la porta successiva, poi la successiva ancora, fino alla prima libera; l'URL effettivo viene stampato all'avvio. Se nessuna porta è libera fino a `65535` il processo termina con errore.

All'avvio il browser predefinito viene aperto sull'URL effettivo. Se l'apertura fallisce viene mostrato un warning con l'URL da aprire manualmente, senza interrompere il server.

## Variabili d'ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `WALDEN_SPECS_DIR` | `<cwd>/.walden/specs` | Percorso assoluto della directory specs |
| `PORT` | `3000` | Porta base del server; se occupata si usa la porta successiva |

## Struttura

```
ears-navigator/
├── server.js          # Express server + API REST
├── src/
│   └── parser.js      # Markdown → JSON (zero dipendenze esterne)
├── public/
│   ├── index.html     # SPA shell
│   ├── app.js         # Vanilla JS: accordion, card, modale, stats
│   └── style.css      # Layout + palette EARS
└── package.json
```

## API

- `GET /api/projects` — lista progetti disponibili
- `GET /api/projects/:name/requirements` — requisiti parsati come JSON
