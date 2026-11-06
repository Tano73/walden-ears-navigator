---
walden_schema_version: v1alpha1
status: approved
approved_at: 2026-11-06T16:13:40Z
last_modified: 2026-11-06T16:13:40Z
approved_fingerprint: sha256:92d1cfa6ac1161aec65887c0423556a29769245ea56654f8cad96bcea65b98b4
source_requirements_approved_at: 2026-11-06T16:13:40Z
source_requirements_fingerprint: sha256:ed5d8c95b672e7a3f8958dbc96bbd48f273952a2072a05fe676b8f092929c1ee
---

# Feature Design — ears-type-help-popup

## Overview

Il popup di aiuto viene creato interamente in JavaScript (nessuna modifica a `index.html`), soddisfacendo C1. Un oggetto `EARS_HELP` statico in `app.js` contiene template sintattico, campi obbligatori ed esempio per i 4 tipi EARS. Cliccando su un badge nella sidebar si apre un overlay dedicato (`#help-overlay`) con z-index 1100 (sopra il modale AC esistente a z-index 1000). Il tasto Escape viene intercettato in capture-phase per chiudere prima il popup di aiuto e non propagare al modale AC sottostante.

## Architecture

```
app.js
 ├── EARS_HELP  (static data — templates, fields, examples per type)
 ├── initHelpOverlay()      → crea #help-overlay nel DOM al DOMContentLoaded
 ├── openHelpPopup(type)    → popola e mostra #help-overlay
 ├── closeHelpPopup()       → nasconde #help-overlay, ripristina focus
 └── renderStats()  [mod]   → aggiunge click handler su ogni stat-badge

style.css
 └── #help-overlay, .help-popup, .help-badge,
     .stat-badge[data-help] (hover + cursor + icona ?)

index.html — nessuna modifica
server.js  — nessuna modifica
src/parser.js — nessuna modifica
```

## Options Considered

### Option A (scelta) — Overlay JS-injected, dati statici embedded

- **Sommario:** l'HTML del popup viene creato con `document.createElement` da `initHelpOverlay()` e appeso a `document.body` al `DOMContentLoaded`. I dati EARS sono un oggetto literal in `app.js`.
- **Perché scelto:** rispetta C1 (solo `app.js` + `style.css`), non aggiunge dipendenze, contenuto sempre disponibile offline, nessuna fetch aggiuntiva (R2.AC5 / NFR1).

### Option B — Aggiunta HTML statico in `index.html`

- **Sommario:** aggiungere `<div id="help-overlay">` direttamente in `index.html`.
- **Perché scartato:** viola C1 che vieta modifiche ai file che non siano `app.js` e `style.css`.

## Simplicity And Elegance Review

- **Forma più semplice:** un solo oggetto `EARS_HELP`, una funzione `openHelpPopup`, una funzione `closeHelpPopup`, una funzione `initHelpOverlay` — meno di 100 righe nette.
- **Coupling check:** l'overlay è autonomo; `renderStats()` gli passa solo una stringa `type`. Nessuna dipendenza circolare.
- **Future-proofing:** aggiungere altri tipi EARS è un'aggiunta di una chiave a `EARS_HELP` senza toccare la logica.

## Components And Interfaces

### EARS_HELP (data object)

- **Purpose:** dati documentali statici per i 4 tipi EARS
- **Shape:**
```js
const EARS_HELP = {
  'event-driven': {
    title:    'Event-Driven',
    color:    'var(--color-event)',
    template: 'WHEN [trigger event], the system SHALL [response]',
    fields: [
      { name: 'trigger event', desc: 'L\'evento esterno o utente che attiva il comportamento' },
      { name: 'response',      desc: 'La risposta osservabile del sistema' }
    ],
    example: 'WHEN l\'utente clicca su "Salva", the system SHALL persistere i dati e mostrare un messaggio di conferma'
  },
  'unwanted': { ... },
  'state-driven': { ... },
  'ubiquitous': { ... }
};
```
- **Requirements:** `R2.AC1`, `R2.AC2`, `R2.AC3`, `R2.AC4`, `R2.AC5`, `NFR1`

### initHelpOverlay()

- **Purpose:** crea `#help-overlay` e lo appende a `document.body`
- **Called by:** `DOMContentLoaded`
- **Produces:** elemento `#help-overlay` con struttura:
  - `.help-popup` > `.help-header` + `.help-body`
  - `.help-header`: titolo dinamico + badge colorato + pulsante ✕
  - `.help-body`: template, campi obbligatori (lista), esempio
- **Requirements:** `R1.AC2`, `R1.AC3`, `R2.AC5`

### openHelpPopup(type)

- **Purpose:** popola `#help-overlay` con i dati di `EARS_HELP[type]` e lo rende visibile
- **Input:** `type` — stringa chiave di `EARS_HELP`
- **Behaviour:** se già visibile, si aggiorna (soddisfa `R1.AC6` — stesso elemento, nuovo contenuto)
- **Requirements:** `R1.AC1`, `R1.AC6`, `R2.AC1`–`R2.AC4`

### closeHelpPopup()

- **Purpose:** nasconde `#help-overlay`, ripristina il focus al badge che lo aveva aperto
- **Requirements:** `R1.AC3`, `R1.AC4`, `R1.AC5`

### renderStats() — modifica

- **Cambiamento:** ogni `span.stat-badge` ottiene `data-help="<type>"`, `tabindex="0"`, `role="button"`, `aria-label="Aiuto su <type>"` e un listener `click` + `keydown Enter/Space` che chiama `openHelpPopup(type)`
- **Requirements:** `R1.AC1`, `R3.AC1`, `R3.AC2`

### Escape handler — modifica

Attuale (in `DOMContentLoaded`):
```js
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
```
Nuovo (sostituzione):
```js
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const helpOverlay = document.getElementById('help-overlay');
  if (helpOverlay && !helpOverlay.classList.contains('hidden')) {
    closeHelpPopup();
    e.stopPropagation();
  } else {
    closeModal();
  }
}, { capture: true });
```
- **Requirements:** `R1.AC4`, `R1.AC7`

## Data Models

`EARS_HELP` — oggetto JS puro, 4 chiavi, nessuna persistenza, nessuna fetch.

## Error Handling

- Se `EARS_HELP[type]` è `undefined` (tipo non riconosciuto), `openHelpPopup` fa un `return` silenzioso senza aprire il popup.

## Security Considerations

Nessun input utente viene inserito come HTML. Tutti i valori di `EARS_HELP` sono letterali statici. Nessun `innerHTML` con dati dinamici.

## Failure Modes And Tradeoffs

| Failure mode | Mitigation | Tradeoff |
|---|---|---|
| Entrambi gli overlay aperti, Escape ambiguo | Capture-phase listener chiude help-overlay per primo | Leggermente più complesso del listener originale |
| `type` non presente in `EARS_HELP` | Return silenzioso | Nessun feedback utente, ma non può accadere con i 4 tipi fissi |

## Testing Strategy

Verifica manuale sulle 4 tipologie: apertura, contenuto, chiusura con ✕, Escape, click overlay. Verifica coesistenza: aprire il modale AC, poi cliccare un badge sidebar → il popup EARS appare sopra; premere Escape → chiude solo il popup EARS, il modale AC rimane aperto.

## Verification Plan

- Aprire l'app con un progetto caricato
- Cliccare su `⚡ event-driven` nella sidebar → popup aperto con template `WHEN … SHALL`
- Cliccare ✕ → popup chiuso
- Riaprire → premere Escape → popup chiuso
- Cliccare fuori dal box → popup chiuso
- Aprire modale AC (click su una card) → poi cliccare badge sidebar → popup EARS sopra al modale → Escape → solo popup EARS chiuso

## Requirement Coverage

| Requirement | Covered By |
| --- | --- |
| `R1.AC1` | `openHelpPopup` + click handler in `renderStats` |
| `R1.AC2` | `initHelpOverlay` — pulsante ✕ |
| `R1.AC3` | `closeHelpPopup` invocata da click su ✕ |
| `R1.AC4` | Escape handler in capture-phase |
| `R1.AC5` | click sul `#help-overlay` (target === overlay) chiama `closeHelpPopup` |
| `R1.AC6` | `openHelpPopup` aggiorna il contenuto senza duplicare l'overlay |
| `R1.AC7` | Escape handler controlla `help-overlay` visible → `stopPropagation` |
| `R2.AC1` | `EARS_HELP['event-driven']` con template + fields + example |
| `R2.AC2` | `EARS_HELP['unwanted']` con template + fields + example |
| `R2.AC3` | `EARS_HELP['state-driven']` con template + fields + example |
| `R2.AC4` | `EARS_HELP['ubiquitous']` con template + fields + example |
| `R2.AC5` | Dati come oggetto JS literal, nessuna fetch |
| `R3.AC1` | `data-help`, CSS `.stat-badge[data-help]` → cursor:pointer + icona `?` |
| `R3.AC2` | CSS `.stat-badge[data-help]:hover` → background highlight |
| `R1` | `initHelpOverlay`, `openHelpPopup`, `closeHelpPopup`, Escape handler |
| `R2` | `EARS_HELP` static data object |
| `R3` | `renderStats` badge enhancement + CSS hover |
| `NFR1` | `EARS_HELP` literal in `app.js`, 0 fetch aggiuntive |
| `C1` | Solo `app.js` + `style.css` modificati |
| `C2` | z-index 1100 > 1000; Escape capture-phase |
