# EARS Navigator

Applicazione web locale per navigare graficamente i requisiti EARS di un progetto Walden.

## Avvio

```bash
cd ears-navigator
npm install          # solo la prima volta
WALDEN_SPECS_DIR=/path/to/.walden/specs node server.js
```

Poi apri [http://localhost:3000](http://localhost:3000).

Se avvii il server dalla stessa directory che contiene `.walden/` non serve la variabile:

```bash
cd /path/to/project-with-walden
node /path/to/ears-navigator/server.js
```

## Variabili d'ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `WALDEN_SPECS_DIR` | `<cwd>/.walden/specs` | Percorso assoluto della directory specs |
| `PORT` | `3000` | Porta HTTP del server |

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
