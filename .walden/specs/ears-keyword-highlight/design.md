---
status: approved
approved_at: 2026-04-27T20:10:18Z
last_modified: 2026-04-27T20:10:18Z
source_requirements_approved_at: 2026-04-27T19:30:07Z
---

# Feature Design — ears-keyword-highlight

## Overview

Due funzioni pure in `app.js`: `escapeHtml(text)` e `highlightEARS(text)`. La pipeline è: escape HTML → sostituzione con regex → stringa HTML con `<strong>`. Vengono modificati esattamente due punti di inserimento nel DOM: la card (riga `${ac.text}` nel template innerHTML) e il popup di dettaglio (che attualmente usa `textContent`, convertito a `innerHTML`). Zero modifiche a CSS, `index.html`, `server.js`, `src/parser.js`.

> Nota: la card già inserisce `ac.text` via `innerHTML` — la nostra modifica aggiunge anche l'escaping che mancava, chiudendo un XSS latente (R3.AC1 copre entrambi i punti di inserimento).

## Architecture

```
app.js
 ├── escapeHtml(s)      → &amp; &lt; &gt; &quot; &#39;
 ├── highlightEARS(text)
 │    1. escaped = escapeHtml(text)
 │    2. return escaped.replace(EARS_KW_RE, '<strong>$&</strong>')
 │
 ├── renderCard()  [modifica riga 181]
 │    ${ac.text}  →  ${highlightEARS(ac.text)}
 │
 └── openModal()   [modifica riga 61]
      modal-text.textContent = ac.text
      → modal-text.innerHTML = highlightEARS(ac.text)
```

## Regex

```js
const EARS_KW_RE =
  /([Tt]he system SHALL)|\b(WHEN|WHILE|IF|THEN|WHERE|DURING)\b/g;
```

- `([Tt]he system SHALL)` — frase completa; `[Tt]` copre entrambe le varianti: i requisiti ubiquitous EARS iniziano con `The system SHALL` (T maiuscola), mentre la locuzione compare in minuscolo all'interno di frasi event-driven/unwanted. Il flag `i` non è usato perché le keyword trigger (`WHEN`, `WHILE`, ecc.) sono convenzionalmente UPPERCASE e il flag renderebbe il match ambiguo.
- `\b...\b` — word-boundary su tutti i trigger keyword: impedisce match parziali (es. "WHENEVER" non matcherà "WHEN")
- Flag `g` — sostituisce tutte le occorrenze nella stringa
- Case-sensitive per le keyword trigger; case-handled esplicitamente per `the system SHALL` tramite `[Tt]`

## Options Considered

### Option A (scelta) — Regex + escapeHtml pura in app.js

- **Sommario:** due funzioni pure, nessuna dipendenza, 12 righe di codice nette.
- **Perché scelto:** minimo accoppiamento, facile da testare, rispetta C1 (solo app.js), XSS safe tramite escape-first.

### Option B — DOMParser / TreeWalker per text-node walking

- **Sommario:** traversare il DOM cercando text node e wrappare le keyword con `<strong>` nel DOM reale senza innerHTML.
- **Perché scartato:** molto più complessa (15+ righe), non aggiunge sicurezza rispetto a escape-first, incompatibile con il pattern template-string esistente nelle card.

## Simplicity And Elegance Review

- **Forma più semplice:** 2 funzioni, 2 modifiche di 1 riga ciascuna — totale ~15 righe nette.
- **Coupling check:** `highlightEARS` dipende solo da `escapeHtml`; nessuna dipendenza inversa.
- **Future-proofing:** aggiungere nuove keyword richiede solo l'aggiornamento di `EARS_KW_RE`.

## Components And Interfaces

### escapeHtml(s)

- **Purpose:** sanitizza il testo grezzo prima dell'inserimento in innerHTML
- **Input:** stringa testo grezzo (può contenere `<`, `>`, `&`, `"`, `'`)
- **Output:** stringa con entità HTML sostituite
- **Requirements:** `R3.AC1`

### highlightEARS(text)

- **Purpose:** trasforma testo grezzo in HTML con keyword EARS in grassetto
- **Input:** stringa testo grezzo del requisito
- **Output:** stringa HTML sicura con `<strong>` attorno alle keyword
- **Pipeline:** `escapeHtml` → `replace(EARS_KW_RE, '<strong>$&</strong>')`
- **Requirements:** `R1.AC1`, `R1.AC2`, `R1.AC3`, `R2.AC1`, `R2.AC2`, `R3.AC1`, `R3.AC2`

### renderCard() — modifica

- **Cambiamento:** `${ac.text}` → `${highlightEARS(ac.text)}` nella riga `.card-text`
- **Requirements:** `R1.AC1`, `R1.AC2`, `R1.AC3`

### openModal() — modifica

- **Cambiamento:** `modal-text.textContent = ac.text` → `modal-text.innerHTML = highlightEARS(ac.text)`
- **Requirements:** `R2.AC1`, `R2.AC2`

## Data Models

Nessun modello dati nuovo. `EARS_KW_RE` è una costante modulo-level.

## Error Handling

- Input vuoto o null: `escapeHtml('')` restituisce `''`; `highlightEARS('')` restituisce `''`. Nessun errore.
- Testo con HTML arbitrario (es. `<script>`): l'escape-first lo neutralizza prima del replace.

## Security Considerations

Il pattern escape-first garantisce che qualsiasi contenuto proveniente dai file `.md` non venga interpretato come markup. I tag `<strong>` sono costruiti staticamente dal codice, non da input utente.

## Failure Modes And Tradeoffs

| Failure mode | Mitigation | Tradeoff |
|---|---|---|
| Keyword nel mezzo di una parola (es. "WHENEVER") | `\b` word-boundary | Nessuno |
| Testo contenente `<strong>` letterale nel file .md | escape-first lo rende `&lt;strong&gt;` | Testo visualizzato correttamente come letterale |

## Testing Strategy

Verifica manuale: aprire il progetto `airflow-filegw-modernization` e osservare grassetto su WHEN/IF/THEN/WHILE/the system SHALL nelle card e nel popup di dettaglio.

## Verification Plan

- Caricare il progetto → le card mostrano keyword in grassetto
- Aprire una card event-driven → popup mostra "WHEN … **the system SHALL**" in grassetto
- Caricare una card unwanted → "IF … THEN … **the system SHALL**" in grassetto

## Requirement Coverage

| Requirement | Covered By |
| --- | --- |
| `R1` | `renderCard` + `highlightEARS` |
| `R1.AC1` | `EARS_KW_RE` group 2 (WHEN/WHILE/IF/THEN/WHERE/DURING) in `renderCard` |
| `R1.AC2` | `EARS_KW_RE` group 1 (the system SHALL) in `renderCard` |
| `R1.AC3` | `\b` word-boundary in `EARS_KW_RE` |
| `R2` | `openModal` + `highlightEARS` |
| `R2.AC1` | `EARS_KW_RE` group 2 in `openModal` |
| `R2.AC2` | `EARS_KW_RE` group 1 in `openModal` |
| `R3` | `escapeHtml` applicata prima del replace |
| `R3.AC1` | `escapeHtml` neutralizza HTML arbitrario prima del replace |
| `R3.AC2` | Solo `<strong>$&</strong>` — nessun attributo dinamico |
| `NFR1` | Funzioni pure in `app.js`, 0 dipendenze |
| `C1` | Solo `app.js` modificato |
| `C2` | Funzioni pure — nessuna modifica ai file di spec |
