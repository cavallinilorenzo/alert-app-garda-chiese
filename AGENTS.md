# Agent Skills

### Issue tracker

Issues live in GitHub Issues. Skills like `triage`, `to-tickets`, and `to-spec` read from and write to this repo's GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` at the repo root plus `docs/adr/` for architectural decisions. See `docs/agents/domain.md`.

### Come lavoriamo

Prima di toccare codice leggi `docs/come-lavoriamo.md`: aree, flusso git (trunk-based, branch `<area>/<numero-issue>-<slug>`, squash merge, review obbligatoria su `api/`), struttura della repo e decisioni tecniche già prese. Regole che non si derogano:

- Lavora solo su un ticket assegnato a chi ti sta usando, e assegnalo **prima** di iniziare.
- Tutti lavorano su tutto: frontend, backend e condiviso sono aperti a chiunque. `api/openapi.yaml` si cambia solo con una PR approvata da un'altra persona.
- Non pushare su `main` e non fare force push.
- Mai segreti nella repo: solo in `.env`, che è nel gitignore.
- Termini del dominio in italiano, identici a `CONTEXT.md` (vedi `docs/adr/0001-dominio-in-italiano-nel-codice.md`).
