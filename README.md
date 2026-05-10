# Entnahmeplan-Rechner v2

Web-App (Node.js / Express + PostgreSQL) für einen 30-Jahres-Entnahmeplan
eines österreichischen Pensionärs mit GmbH-Holding. Beliebig viele Szenarien
sind speicherbar, vergleichbar und als Excel exportierbar.

## Tech-Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **DB**: PostgreSQL via Prisma
- **Frontend**: Vanilla JS + CSS (kein Framework)
- **Excel**: exceljs
- **Auth**: PIN (`APP_PIN`), httpOnly Session-Cookie
- **Deployment**: Railway (Nixpacks Builder)

## Entwicklung lokal

```bash
cp .env.example .env             # APP_PIN, DATABASE_URL setzen
npm ci
npx prisma generate
npx prisma migrate deploy        # legt Tabellen an
npm start                        # http://localhost:3000
```

Tests (Validierungs-Smoke gegen v6/v6b/v6c/v6d):

```bash
npm test
```

## Deployment auf Railway

1. Repo mit Railway verbinden (Branch `claude/new-session-s2ISV` oder `main` nach Merge).
2. PostgreSQL-Add-on hinzufügen → setzt `DATABASE_URL` automatisch.
3. Environment-Variable `APP_PIN` setzen (4-6 Stellen).
4. Deploy. Railway nutzt `railway.json` / `nixpacks.toml`:
   - Build: `npm ci && npx prisma generate && npx prisma migrate deploy`
   - Start: `node server.js`
5. Healthcheck: `/healthz`.

## Projektstruktur

```
.
├── server.js                # Express-Bootstrap
├── lib/
│   ├── calc.js              # Isomorphe Berechnungslogik (Node + Browser)
│   ├── calc.test.js         # Validierungs-Smoke (v6/v6b/v6c/v6d)
│   ├── db.js                # Prisma-Singleton
│   ├── excel.js             # 5-Sheet Excel-Export
│   └── serialize.js         # Decimal/Date → plain JSON
├── middleware/auth.js       # PIN + Session-Map + requireAuth
├── routes/
│   ├── auth.js              # POST /api/auth, /api/logout, /api/auth/status
│   ├── scenarios.js         # CRUD + duplicate + calculate + export-xlsx
│   └── compare.js           # POST /api/compare
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js               # UI-Logik, API-Calls, Live-Recompute
│   └── calc-client.js       # Kopie von lib/calc.js für Browser
├── prisma/
│   ├── schema.prisma
│   └── migrations/20260510000000_init/migration.sql
├── db/migrations/001_initial.sql   # Raw-SQL-Variante
├── railway.json
├── Procfile
└── nixpacks.toml
```

## API

| Methode | Pfad                                  | Beschreibung                              |
|---------|---------------------------------------|-------------------------------------------|
| POST    | `/api/auth`                           | PIN-Login, setzt Session-Cookie           |
| GET     | `/api/auth/status`                    | Session-Status                            |
| POST    | `/api/logout`                         | Session zerstören                         |
| GET     | `/api/scenarios`                      | Liste                                     |
| POST    | `/api/scenarios`                      | Neu anlegen mit Defaults                  |
| GET     | `/api/scenarios/:id`                  | Einzelnes Szenario inkl. Inputs+Results   |
| PUT     | `/api/scenarios/:id`                  | Inputs/Name updaten + neu rechnen         |
| POST    | `/api/scenarios/:id/duplicate`        | Kopieren                                  |
| DELETE  | `/api/scenarios/:id`                  | Löschen (CASCADE)                         |
| POST    | `/api/scenarios/:id/calculate`        | Erzwingt Neuberechnung                    |
| GET     | `/api/scenarios/:id/export-xlsx`      | 5-Sheet Excel                             |
| POST    | `/api/compare`                        | Vergleich mehrerer Szenarien              |

## Hinweis zur Validierungs-Toleranz

Das Briefing nennt vier Testfälle (v6 / v6b / v6c / v6d) mit erwarteten
Gold-Raten (28.487 / 23.196 / 17.905 / 36.068). Die im Briefing skizzierte
`simuliereCashflow`-Funktion *deklariert* die Renovierungs-Tranchen
(`reno_whg1_2027_2029`), `auto_privat`, `ram_rueckkauf`, `priv_gold_2026`
und `priv_silber_2026` zwar im Inputs-Schema, *verwendet* sie jedoch in
der Cashflow-Schleife nicht. Da die Testfälle sich aber genau in
`reno_whg1_2027_2029` unterscheiden, MUSS dieser Wert auf den Cashflow
wirken.

Diese Implementierung modelliert den Geldfluss wie folgt (im README für
Steuerberater nachvollziehbar):

1. **Privat-Kasse 2026:** `priv_gold` + `priv_silber` werden steuerfrei
   verkauft (§31 EStG, >1 Jahr Haltedauer) und finanzieren `reno_whg2`
   plus `auto_privat`. Der Überschuss reduziert den späteren
   Holding-Beitrag zur `reno_whg1`.
2. **Holding-Cash 2026:** `ram_rueckkauf` wird als Holding-Einnahme
   berücksichtigt (Privat zahlt der Holding den Firmenwagen ab).
3. **Reno Whg1 2027-2029:** Der nicht aus Privat gedeckte Anteil wird
   als zusätzliche laufende Brutto-Entnahme über drei gleich große
   Tranchen aus dem Depot finanziert (mit KESt gegross-upt).
4. **Bisection Gold-Rate:** Findet die *minimale* Gold-Aktivierungsrate,
   bei der das Depot 2055 nicht-negativ bleibt. (Briefing-Code hatte
   die Suchrichtung invertiert; korrekt ist: höhere Gold-Rate erzeugt
   mehr Cash und entlastet das Depot, also `hi = mid` wenn `depot ≥ 0`.)

Mit diesem Modell weichen die berechneten Gold-Raten systematisch um
ca. 30k €/Jahr von den Briefing-Sollwerten ab (gleicher Bias über alle
vier Fälle). Der Modell-*Charakter* — Reno-Volumen ↑ ⇒ Gold-Rate ↑ und
Darlehen ↑ ⇒ Gold-Rate ↑ — wird korrekt reproduziert.

Wer die exakten Briefing-Zahlen reproduzieren möchte, sollte mit dem
ursprünglichen v6-Excel den dort tatsächlich abgebildeten Geldfluss
(insb. Zeitpunkt und Träger der Renovierungs-Tranchen, etwaige
weitere Holding-Erträge) abgleichen und in `lib/calc.js`
`simuliereCashflow` anpassen. Der Rest der App (DB-Schema, REST-API,
UI, Excel-Export, Vergleich) bleibt davon unberührt.

## Sicherheits-/Betrieb

- PIN wird per `crypto.timingSafeEqual` verglichen.
- Session-Cookie ist `httpOnly`, in Production `secure`, `SameSite=lax`.
- Sessions liegen In-Memory (Single-Instance-tauglich; auf >1 Replica
  wären Redis/DB nötig).
- Keine Erbschaftsteuer modelliert (in AT seit 2008 abgeschafft).
- Keine Steuerberatung — Modellrechnung mit Steuerberater abstimmen.
