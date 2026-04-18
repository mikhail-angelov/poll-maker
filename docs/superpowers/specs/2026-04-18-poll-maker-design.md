# Poll Maker Design (Current)

> Reflects the implementation as of 2026-04-18.
> Original spec: `2026-04-10-poll-maker-design.md`.

## Context

A greenfield web app for creating, publishing, answering, editing, and exporting polls. Single-service Node + Preact app backed by a local SQLite database.

## Architecture

Single Express service owns all API routes, SQLite access through Drizzle ORM, session cookie creation, admin-hash authorization, CSV export, and static serving of the Vite-built Preact frontend. During development Vite serves the frontend on port 5173 and proxies `/api/*` to the Express API on port 3001.

### Frontend routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `LandingPage` | Marketing / entry point |
| `/new` | `CreatePollPage` | Create a new poll |
| `/edit/:adminHash` | `CreatePollPage` | Edit an existing poll |
| `/admin/:adminHash` | `AdminPollPage` | Admin dashboard |
| `/poll/:pollId` | `RespondPollPage` | Public respondent wizard |

`adminHash` is the 20-character admin bearer secret. `pollId` is the 20-character public hash. No client-side router library is used; routing is done directly against `window.location.pathname`.

Backend routes are under `/api/*`.

### Admin authorization

Admin API calls require the request header:

```http
X-Poll-Admin-Hash: <adminHash>
```

CSV export accepts `adminHash` as a query parameter instead of a header.

## Data Model

### `polls`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | UUID |
| `user_id` | text NOT NULL | Creator's session hash |
| `poll_id` | text UNIQUE | 20-char public hash |
| `admin_hash` | text UNIQUE | 20-char admin bearer secret |
| `name` | text NOT NULL | Poll title |
| `details` | text NOT NULL | Markdown-capable description |
| `questions` | text NOT NULL | JSON `PollQuestion[]` |
| `active` | integer (boolean) | Default `true` |
| `created_at` | text | ISO 8601 |
| `updated_at` | text | ISO 8601 |

Indexes: unique on `poll_id`, unique on `admin_hash`.

### `answers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | UUID |
| `user_id` | text NOT NULL | Respondent's session hash |
| `poll_id` | text NOT NULL | References `polls.poll_id` |
| `user_info` | text NOT NULL | `"<IP> <User-Agent>"` string |
| `answers` | text NOT NULL | JSON `AnswerMap` |
| `time` | text NOT NULL | Client-supplied local timestamp |
| `status` | text NOT NULL | `"draft"` or `"submitted"` |
| `created_at` | text | ISO 8601 |
| `updated_at` | text | ISO 8601 |

Unique index on `(poll_id, user_id)` — one row per respondent per poll; upserted on every save. Final submit updates `status` to `"submitted"` in place.

### Shared TypeScript types

```ts
type PollQuestion = {
  name: string;
  question: string;
  optional?: boolean;    // default false
  multiselect?: boolean; // default false
  options: string[];     // "text" or "текст" = free-form input
};

type AnswerValue = {
  selectedOptions?: string[];
  text?: string; // populated when "text" / "текст" is selected
};

type AnswerMap = Record<string, AnswerValue>; // key = question index as string
```

## Poll Question Format

Creator UI accepts a markdown-like text format converted to `PollQuestion[]` at save time.

```md
# <name>
## <question>
[] optional
[] multiselect
- option 1
- option 2
```

Rules:

- `# <name>` starts a new question block.
- `## <question>` is the question text.
- `[] optional` / `[x] optional` → `optional: false` / `true`.
- `[] multiselect` / `[x] multiselect` → `multiselect: false` / `true`.
- Missing flag lines default to `false`.
- `- ` lines are options. `text` and `текст` enable a free-form text field.

The format is round-trip serializable (parse → serialize → parse is stable).

## Validation

### Poll input (`validatePollInput`)

- `name` required after trimming.
- `details` required after trimming.
- Question text must parse to a non-empty `PollQuestion[]`.
- Each question: non-empty `name`, non-empty `question`, non-empty `options` array.
- Every option must be a non-empty string.
- `optional` / `multiselect` must be booleans when present.

### Answers (`validateAnswers`)

- Draft saves are always accepted (incomplete answers allowed).
- Final submit: all non-optional questions must have a selected option.
- Single-select: at most one selected option.
- Multi-select: any number of options.
- Text answers accepted when `"text"` or `"текст"` is among the options.

### Backend error codes

Stable codes returned in API error bodies; the frontend maps them to localized messages.

Examples: `POLL_NAME_REQUIRED`, `POLL_DETAILS_REQUIRED`, `QUESTIONS_REQUIRED`, `ADMIN_HASH_INVALID`, `ANSWER_REQUIRED`, `POLL_NOT_FOUND`, `POLL_NOT_ACTIVE`.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/session` | — | Ensure 30-day session cookie; return `userId` |
| GET | `/api/user/polls` | Cookie | List the current user's polls |
| POST | `/api/polls` | Cookie | Create poll; returns `{ pollId, adminHash, publicUrl, adminUrl }` |
| GET | `/api/polls/:pollId` | — | Public poll data for respondents |
| GET | `/api/admin/poll` | `X-Poll-Admin-Hash` | Admin view: poll data, summary, latest 50 results |
| PUT | `/api/admin/poll` | `X-Poll-Admin-Hash` | Update name, details, questions, active flag |
| POST | `/api/polls/:pollId/answers/draft` | Cookie | Upsert draft answer |
| POST | `/api/polls/:pollId/answers/submit` | Cookie | Validate and submit final answer |
| GET | `/api/admin/poll/results.csv` | `?adminHash=` | Download submitted results as CSV |

Generated URLs after creating a poll:

- Public URL: `<host>/poll/<pollId>`
- Admin URL: `<host>/admin/<adminHash>`

## Session Management

- Cookie name: `poll_maker_session`; httpOnly, sameSite=lax, 30-day expiry.
- Value is a 20-character `nanoid` userId.
- Not persisted in the database; the browser cookie IS the identity.
- Session middleware injects `userId` into the Express `Request` object.

## UI

### App shell

`NeonHeader` — top bar with logo and EN/RU language toggle.
`Sidebar` — navigation + current user's poll list (mobile-responsive; collapsible).

### Landing page (`/`)

Marketing overview of features; links to `/new`.

### Create / Edit page (`/new`, `/edit/:adminHash`)

- Two-column layout: metadata (left) + question editor (right).
- Poll name `<input>`.
- `micro-md-editor` for poll details.
- `micro-md-editor` for the markdown-like question editor with a default template.
- Live parsed-question preview panel.
- Validation error list.
- Create / Update and Clear buttons.
- On create, navigates to `/admin/<adminHash>`.
- Edit mode pre-fills from the admin API.

### Admin page (`/admin/:adminHash`)

- Poll title, LIVE/INACTIVE badge, Edit and CSV-download buttons.
- Metrics: question count, submitted-answer count.
- Share section: public URL with copy button + QR code canvas (downloadable), admin URL with copy button.
- Results table: up to 50 recent submissions — time, user IP, answered-question count, expandable raw answers.

### Respondent page (`/poll/:pollId`)

- Landing screen: poll title, details, feature chips.
- One question per screen; progress bar at top.
- Optional marker on question title.
- Single-select questions render labeled radio-style buttons (A, B, C, D…).
- Multi-select questions render checkbox buttons.
- Free-text option (`"text"` / `"текст"`) adds a text input when selected.
- Prev / Next navigation.
- Each navigation step upserts a draft to the backend and saves to localStorage (`poll-maker-draft:<pollId>:<userId>`).
- Draft restored from localStorage on refresh.
- Submit disabled until all required questions answered.
- Final Submit marks row as `"submitted"`.
- Thank-you screen with celebration emoji and answered-question count.

## Styling

Tailwind CSS with a custom palette: `ink`, `paper`, `moss`, `clay`, `muted`, `lime`, `peach`. Display font: Fraunces; body: Manrope; mono: JetBrains Mono. Decorative gradient blobs on page backgrounds. Card shadow token: `CARD_SHADOW`.

## Localization

Small dictionary-based i18n layer for English and Russian.

- Dictionaries in `src/client/i18n/en.ts` and `src/client/i18n/ru.ts`.
- Typed `t(key)` helper via a Preact context/hook (`I18nProvider`).
- Initial language detected from `navigator.language`; Russian for `ru*`, English otherwise.
- Persisted in `localStorage` under `poll-maker-language`.
- EN/RU toggle in `NeonHeader`.
- Backend error codes mapped to localized messages on the frontend.
- CSV column headers are stable English; not localized.
- User-created content (poll names, details, question text, options) is not translated.

## Offline / draft resilience

Respondent draft is stored both in the database (status=`draft`) and in localStorage as `{ currentIndex, answers }`. On refresh the page reads localStorage first and restores the in-progress wizard state before any API call completes.

## CSV export

- Accessed via `GET /api/admin/poll/results.csv?adminHash=<hash>`.
- RFC 4180-compliant quoting.
- IP address stripped from `user_info` before export.
- Stable English column headers; one row per submitted answer.

## Testing

**Unit tests (Vitest):**
- `src/shared/validation.test.ts` — poll and answer validation.
- `src/shared/questionFormat.test.ts` — parse/serialize round-trip, text options.
- `src/server/routes.test.ts` — session, poll CRUD, answer submission, admin hash rejection.
- `src/server/session.test.ts` — session middleware.
- `src/client/pages/RespondPollPage.test.tsx` — draft restoration, wizard navigation.

**E2E tests (Playwright):**
- `tests/e2e/` — smoke test: create poll → answer through wizard → submit → verify in admin view → export CSV.

**CI (GitHub Actions):**
- Typecheck (`tsc --noEmit`) → unit tests → production build.

## Build & deployment

```
npm run dev       # tsx watch (API :3001) + Vite (:5173, proxies /api)
npm run build     # tsc (server) + vite build (client → dist/client)
npm start         # node dist/server/index.js (serves static + API)
npm test          # vitest run
npm run test:e2e  # playwright test
```

Docker: `node:20-alpine` image; SQLite file at `/app/data/poll-maker.sqlite` (mounted volume in Compose).

## Key dependencies

| Package | Version | Role |
|---------|---------|------|
| express | 4.21.2 | HTTP server |
| drizzle-orm | 0.45.2 | ORM |
| sqlite3 | 6.0.1 | SQLite driver |
| preact | 10.26.4 | UI framework |
| nanoid | 5.0.9 | ID generation |
| qrcode | 1.5.4 | QR code rendering |
| micro-md-editor | 2.0.0 | Markdown editor component |
| vite | 8.0.8 | Frontend bundler |
| tailwindcss | 3.4.17 | Utility CSS |
| vitest | 4.1.4 | Unit test runner |
| playwright | 1.49.1 | E2E test runner |
| tsx | 4.19.3 | TypeScript executor (dev) |
