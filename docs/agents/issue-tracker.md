# Issue Tracker: GitHub Issues

Issues for this repo live in GitHub Issues. Skills like `triage`, `to-tickets`, and `to-spec` read from and write to issues here using the `gh` CLI.

## Creating issues

Use `gh issue create` to programmatically add issues, or open them directly on GitHub.

## PRs as requests

By default, pull requests are **not** part of the triage queue. Only GitHub Issues are triaged. If you want to include PRs in triage (for example, to review external contributions), you can enable this by editing this file and setting the `include-prs` flag.

## Wayfinding operations

- **Mappa**: una issue con label `wayfinder:map`.
- **Ticket**: sub-issue native della mappa (`POST /repos/{owner}/{repo}/issues/{map}/sub_issues` con `sub_issue_id` = id numerico della issue, non il numero). Label di tipo: `wayfinder:research|prototype|grilling|task`.
- **Blocking**: dipendenze native di GitHub (`POST /repos/{owner}/{repo}/issues/{n}/dependencies/blocked_by` con `issue_id`).
- **Claim**: assegnare la issue a chi la lavora, prima di iniziare.
- **Frontier**: sub-issue aperte della mappa, senza assegnatario, i cui `blocked_by` sono tutti chiusi.

### Aree di lavoro (vale per ogni mappa, attuale e futura)

Il team è diviso in due code, più le decisioni condivise. **Ogni ticket ha esattamente una label `area:*`:**

- `area:frontend`: @cavallinilorenzo. React: App di segnalazione (mobile) e Portale operatore (desktop).
- `area:backend`: @TrentoElProgrammatores, @itsmrma. Django REST Framework + JWT.
- `area:condiviso`: decisioni che toccano il contratto API (`api/openapi.yaml`) o `CONTEXT.md`; si prendono con tutti e tre.

Frontend e backend comunicano solo via REST: il contratto OpenAPI è l'unico file che entrambe le aree modificano. Quando una mappa di spec è conclusa, l'implementazione si apre come **una mappa per area** (frontend, backend), collegate dal contratto API.

## Issue links

- **This repo**: https://github.com/cavallinilorenzo/alert-app-garda-chiese
- **Issues page**: https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues
