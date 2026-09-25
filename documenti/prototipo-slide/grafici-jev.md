# Grafici di JEV: fonte e lettura

Screenshot del grafico "Mean accuracy vs cost and time" di https://evals.typesafe.ai (TypeSafe), preso il 25/09/2026, nelle due viste del selettore "Lens":

- `grafico-jev-costo.png`: precisione contro costo per caso (USD, scala logaritmica)
- `grafico-jev-tempo.png`: precisione contro secondi per caso (scala logaritmica)
- `grafico-jev-costo-bianco.png`, `grafico-jev-tempo-bianco.png`: gli stessi grafici col tema chiaro del sito (`data-theme="light"`), sfondo portato a bianco pieno e bordo tolto. I dati non sono toccati.

## Cosa misura

Media di 4 workflow aziendali di esempio (Security Incidents, Agent Trace Observability, Invoice Processing, Customer Service). Ogni modello gira con il ragionamento di default del fornitore. Le risposte giuste sono la media di GPT-6 Astra e Claude Fable 5.1 al massimo del ragionamento.

## Numeri (dai dati della pagina)

| Modello | Precisione | Costo per caso | Tempo per caso |
|---|---:|---:|---:|
| **JEV** (workflow) | 67,8% | 0,0004 $ | 0,4 s |
| luna (OpenAI, workflow) | 66,8% | 0,0033 $ | 12,9 s |
| terra (OpenAI, workflow) | 67,9% | 0,0304 $ | 10,1 s |
| sonnet 5 (Anthropic, workflow) | 67,8% | 0,1174 $ | 78,1 s |
| sol (OpenAI, workflow) | 74,1% | 0,0836 $ | 23,3 s |
| opus 5 (Anthropic, workflow) | 73,1% | 0,1761 $ | 37,8 s |

A parità di precisione (~68%), JEV rispetto al modello più economico (luna) costa circa 8 volte meno ed è circa 30 volte più veloce.

## Attenzione, per le domande della giuria

- È il **benchmark del fornitore**, non una misura nostra.
- I workflow non sono il nostro caso. Una Segnalazione è più semplice, quindi i secondi assoluti non valgono per noi. Vale il confronto relativo.
- I modelli più grandi (sol, opus 5) sono un po' più precisi: JEV vince su costo e velocità, non sulla precisione assoluta.
