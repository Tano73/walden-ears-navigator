# Project Constitution

Questo file raccoglie il contesto stabile di progetto per le feature Walden della modernizzazione OBG Batch FileGW. Per queste specifiche, la fonte autorevole di contenuto e perimetro sono i documenti DocMind del progetto `OBG-BATCH-FILEGW`.

## Project Summary

OBG Batch FileGW viene modernizzato verso una piattaforma Apache Airflow per gestire nuovi flussi di trasferimento file tra nodi FE/BE, sistemi interni TIM e partner esterni.

Il perimetro corrente e' greenfield: i flussi legacy esistenti restano sul sistema attuale durante la coesistenza e non devono essere migrati o importati automaticamente nel nuovo sistema. Il catalogo storico vale come riferimento per le tipologie funzionali da coprire, non come backlog di migrazione.

## Tech Stack

- Orchestrazione target: Apache Airflow 2.x
- Linguaggio applicativo target: Python 3.11+
- Database: PostgreSQL 14+ indipendente per ciascun nodo FE e BE
- Deployment target: Kubernetes con CeleryExecutor/KubernetesExecutor oppure VM con LocalExecutor, in base all'ambiente
- Integrazioni principali: SFTP/SSH, IBM Connect:Direct, relay FE/BE tramite canale SFTP dedicato, backend esterno per i segreti
- Osservabilita': audit trail persistente, metriche esportabili e alert operativi

## Conventions

- Usare la terminologia DocMind: flusso, FlowDefinition, nodo FE, nodo BE, relay FE/BE, post-processing, audit trail.
- Considerare i documenti DocMind come source of truth per scope, vincoli e architettura target.
- Redigere i requisiti in EARS con ID stabili (`R#`, `R#.AC#`, `NFR#`, `C#`) e mantenere la tracciabilita' verso gli artefatti DocMind.
- Separare requisiti e design: le decisioni ancora pendenti vanno espresse come vincoli o punti aperti, non forzate nei requirements.
- Esplicitare sempre gli elementi fuori scope quando esiste rischio di confondere coesistenza e migrazione dei flussi legacy.

## Sanity Checks

- Verificare lo stato Walden della feature prima di cambiare fase.
- Validare i documenti Walden prima di aprire una review.
- Usare solo i documenti DocMind del progetto `OBG-BATCH-FILEGW` come base di contenuto per requirements, design e tasks di questa modernizzazione.

```bash
walden status <feature-name> --json
walden validate <feature-name> --all --json
```

## Key Files

- DocMind `concept-prd-airflow`: obiettivi, business requirements, FR/NFR target, profili utente
- DocMind `analysis-fr`: perimetro greenfield e fuori scope sulla mancata migrazione dei flussi legacy
- DocMind `design-architecture`: ADR target, separazione FE/BE, stack e concern trasversali
- DocMind `analysis-gap-report`: gap di copertura da chiudere nelle spec, inclusa la rimozione di dipendenze JNI/OS-specifiche
- `.walden/specs/<feature-name>/requirements.md`: contratto funzionale approvabile
- `.walden/specs/<feature-name>/design.md`: architettura tracciata ai requisiti
- `.walden/specs/<feature-name>/tasks.md`: piano implementativo approvabile

## Hard Rules

- Il progetto corrente e' greenfield per nuovi flussi; la migrazione dei flussi legacy e' fuori scope.
- Apache Airflow e' un vincolo non negoziabile dell'orchestrazione target.
- Il nuovo sistema deve coprire le tipologie di comunicazione documentate: SFTP, Connect:Direct, relay FE/BE e pipeline di post-processing configurabile.
- FE e BE restano separati a livello logico e dati; ciascun nodo ha il proprio PostgreSQL e il relay inter-nodo usa un buffer SFTP dedicato.
- Le credenziali non devono comparire in chiaro in codice, definizioni di flusso o configurazioni non cifrate; l'accesso ai segreti passa da un backend dedicato/pluggable.
- Audit, metriche operative, alert e capacita' di restart manuale sono parte integrante della piattaforma.
- Le specifiche di modernizzazione devono chiudere il gap documentato sulle dipendenze JNI/OS-specifiche per la crittografia, privilegiando implementazioni Python-native o integrazioni gestite portabili.
- Per i flussi soggetti a vincoli normativi o di pagamento, restano obbligatori cifratura in transito, controllo accessi e audit trail.
