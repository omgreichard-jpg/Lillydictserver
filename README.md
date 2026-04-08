# Lillydict Server

Dieses Verzeichnis ist jetzt als kostenloses Backend-Setup fuer `Vercel Hobby + Supabase Free` vorbereitet.

## Was jetzt drin ist

- `api/health.js`
  Health-Check und Config-Status.
- `api/register.js`
  Registriert einen neuen Player und gibt `playerId + playerToken` zurueck.
- `api/leaderboard.js`
  `GET` fuer Leaderboard lesen, `POST` fuer Score-Updates.
- `lib/leaderboard-store.js`
  Datenbankzugriff ueber Supabase REST.
- `lib/rate-limit.js`
  Einfaches kostenloses In-Memory-Rate-Limit auf Vercel-Funktionsebene.
- `sql/001_leaderboard.sql`
  SQL fuer Tabelle, Trigger und Leaderboard-View.

## Kostenloser Stack

- `Vercel Hobby`
- `Supabase Free`
- keine bezahlten NPM-Add-ons

Wichtig:

- Das ist fuer den Start kostenlos.
- Supabase Free und Vercel Hobby haben Limits.
- Das aktuelle Schutzmodell ist gut genug fuer einen ersten Release, aber nicht mit vollwertigem Account-System gleichzusetzen.

## Datenmodell

Das Leaderboard speichert:

- `name`
- `handle`
- `points`
- `level`
- `streak`
- `updated_at`

## Player-Schutz

Beim Registrieren erzeugt der Server:

- `playerId`
- `playerToken`

Die Extension muss beides lokal speichern.

Fuer spaetere Score-Updates gilt:

- ohne korrektes `playerToken` kann niemand den Score dieses Players aktualisieren
- das schuetzt gegen einfaches Ueberschreiben anderer Nutzer

Grenze:

- Ein Client kann weiterhin seinen eigenen lokalen Score faelschen
- fuer echte Cheat-Resistance bräuchten wir spaeter ein staerkeres Verifikationsmodell

## Supabase Setup

1. Kostenloses Supabase-Projekt anlegen
2. Den Inhalt aus `sql/001_leaderboard.sql` im SQL Editor ausfuehren
3. Service Role Key und Project URL kopieren
4. In Vercel fuer das `server`-Projekt diese Env-Variablen setzen:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LEADERBOARD_TITLE`
- `LEADERBOARD_ALLOWED_ORIGINS`
- `REGISTER_RATE_LIMIT_PER_MINUTE`
- `SCORE_RATE_LIMIT_PER_MINUTE`
- `LEADERBOARD_MAX_LIMIT`

## Vercel Setup

1. Repo bei Vercel importieren
2. `Root Directory` auf `server` setzen
3. Env-Variablen eintragen
4. Deploy starten

## API

### `GET /api/health`

Antwort:

```json
{
  "ok": true,
  "configured": true,
  "storage": "supabase"
}
```

### `POST /api/register`

Body:

```json
{
  "name": "Jason",
  "handle": "lillyfan123"
}
```

Antwort:

```json
{
  "ok": true,
  "playerId": "uuid",
  "playerToken": "hex-token"
}
```

### `GET /api/leaderboard?limit=20&playerId=uuid`

Antwort:

```json
{
  "ok": true,
  "entries": [],
  "self": null
}
```

### `POST /api/leaderboard`

Body:

```json
{
  "playerId": "uuid",
  "playerToken": "hex-token",
  "points": 4200,
  "level": 8,
  "streak": 4
}
```

## Nächster Schritt im Hauptprojekt

Sobald der Server deployed ist, sollten wir in der Extension:

1. beim ersten Start `name/handle` abfragen
2. `playerId + playerToken` lokal speichern
3. Scores regelmaessig an `/api/leaderboard` senden
4. eine Leaderboard-Ansicht im Widget einbauen
