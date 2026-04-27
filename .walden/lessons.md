# Walden Lessons

Review this file before non-trivial work when the current request matches past mistakes, rejections, or validation failures.

## Lessons

<!-- Append entries with scripts/log_walden_lesson.py -->
### 2026-04-27T20:10:52Z | ears-keyword-highlight | execute
- Trigger: Regex case-sensitive non copriva 'The system SHALL' (T maiuscola) — issue #1
- Lesson: La locuzione 'the system SHALL' appare in minuscolo nel testo di flussi event-driven/unwanted, ma in maiuscola (The system SHALL) come prima parola nei requisiti ubiquitous EARS. Scegliere case-sensitive per intero senza distinguere i due pattern causa miss sul caso ubiquitous.
- Guardrail: Quando il pattern di una keyword include varianti di capitalizzazione (es. inizio frase vs corpo frase), usare character class esplicita [Tt] anziché assumere un'unica forma. Validare sempre i test con almeno un caso ubiquitous che inizia con T maiuscola.

