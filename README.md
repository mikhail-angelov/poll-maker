# Poll Maker

A self-hosted web app for creating, publishing, answering, editing, and exporting polls.

No user accounts required. Polls are identified by a shareable public URL; the creator gets a private admin URL for viewing results, editing, and exporting data.

## Features

- **Markdown-like question editor** — write questions in a simple text format, see a live preview
- **Public respondent wizard** — one question per screen, auto-saves progress, survives page refresh
- **Admin dashboard** — view results, copy share links, download QR code, export CSV
- **No login required** — sessions are cookie-based; admin access is a 20-character bearer secret
- **English / Russian UI** — auto-detected from browser locale, toggleable at any time
- **Offline-resilient drafts** — in-progress answers stored in localStorage and synced to the server

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Preact + Tailwind CSS + Vite |
| Backend | Node.js + Express |
| Database | SQLite via Drizzle ORM |
| Testing | Vitest + Playwright |

## Getting started

### Prerequisites

- Node.js 20+

### Install

```bash
npm install
```

### Develop

```bash
npm run dev
```

Starts the Express API on `http://127.0.0.1:3001` and the Vite dev server on `http://127.0.0.1:5173`. The frontend proxies `/api/*` to the API server automatically.

### Build & run

```bash
npm run build
npm start
```

Builds the frontend to `dist/client` and starts the Express server on port 3001. The server serves the static client and handles all API routes.

### Database

The SQLite database is created automatically on first start. To run migrations manually:

```bash
npm run db:migrate
```

By default the file is `poll-maker.sqlite` in the project root. Set `SQLITE_FILE` to override the path.

## Docker

```bash
docker compose up
```

The Compose file mounts a `./data` volume for the SQLite file so data survives container restarts.

## Testing

```bash
npm test          # unit tests (Vitest)
npm run test:e2e  # end-to-end tests (Playwright)
```

E2E tests require the dev server to be running (`npm run dev`).

## Poll question format

Questions are written in a markdown-like syntax in the editor:

```
# Question name
## Question text shown to respondents
[] optional
[x] multiselect
- Option A
- Option B
- text
```

- `# name` starts a new question block.
- `## text` is the question shown to respondents.
- `[] optional` / `[x] optional` — mark as optional (default: required).
- `[] multiselect` / `[x] multiselect` — allow multiple selections (default: single).
- `-` lines are the selectable options.
- `text` or `текст` as an option value adds a free-text input field.

Multiple questions are written as consecutive blocks in the same editor.

## API overview

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/session` | — | Create/return session |
| GET | `/api/user/polls` | Cookie | List your polls |
| POST | `/api/polls` | Cookie | Create a poll |
| GET | `/api/polls/:pollId` | — | Public poll data |
| GET | `/api/admin/poll` | `X-Poll-Admin-Hash` | Admin poll data + results |
| PUT | `/api/admin/poll` | `X-Poll-Admin-Hash` | Update poll |
| POST | `/api/polls/:pollId/answers/draft` | Cookie | Save draft answer |
| POST | `/api/polls/:pollId/answers/submit` | Cookie | Submit final answer |
| GET | `/api/admin/poll/results.csv` | `?adminHash=` | Export CSV |

## Project structure

```
src/
  client/       # Preact frontend
    pages/      # Route-level components
    components/ # Shared UI components
    i18n/       # English & Russian dictionaries
  server/       # Express backend
    db/         # Drizzle schema, client, migrations
  shared/       # Types, validation, question format parser
tests/
  e2e/          # Playwright smoke tests
```

## Design docs

- [`docs/superpowers/specs/2026-04-18-poll-maker-design.md`](docs/superpowers/specs/2026-04-18-poll-maker-design.md) — current design
- [`docs/superpowers/specs/2026-04-10-poll-maker-design.md`](docs/superpowers/specs/2026-04-10-poll-maker-design.md) — original spec
