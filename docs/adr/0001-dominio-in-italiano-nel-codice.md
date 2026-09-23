# Termini del dominio in italiano nel codice

Nel codice (modelli Django, campi, path REST, tipi TypeScript) i termini del dominio si scrivono in italiano, identici al glossario di `CONTEXT.md`: `Segnalazione`, `Segnalante`, `acquaiolo_competente`, `/api/segnalazioni/`. La parte tecnica generica resta in inglese: `created_at`, `utils`, `status_code`.

Il glossario, il Consorzio e i documenti della challenge sono in italiano. Tradurre il dominio in inglese creerebbe un secondo vocabolario da tenere allineato al primo (Segnalazione diventerebbe report, alert o ticket?), proprio la deriva che `CONTEXT.md` vuole evitare. Il prezzo è un codice misto italiano/inglese, che accettiamo. Una volta scritti modelli, contratto OpenAPI e client generato, cambiare lingua vorrebbe dire rinominare tutto da tutte e due le parti.
