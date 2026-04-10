# Poll Maker Design

## Context

Build a greenfield web app for creating, publishing, answering, editing, and exporting polls. The repository is currently empty, so the implementation can define the project scaffold from scratch.

## Goals

- Provide a create/update poll flow with required poll name, validated poll details, and editor-first question entry.
- Provide a public poll URL for respondents.
- Provide a separate admin URL for results, editing, copyable links, and CSV export.
- Persist all data in local SQLite through Drizzle ORM.
- Authenticate browser users with a 30-day session identifier.
- Let respondents refresh the browser and continue an in-progress poll.

## Non-Goals

- No username/password login for v1.
- No hosted database or external persistence for v1.
- No drag-and-drop/form-based question builder for v1.
- No raw JSON question editor for v1; creators use the markdown-like question format described below.
- No per-poll password or role-based access control for v1.

## Architecture

Use a single Node service for the backend and production static serving. The backend owns API routes, SQLite access through Drizzle ORM, session cookie creation, admin-hash authorization, CSV export, and serving the built Vite frontend. During development, Vite serves the Preact app and proxies `/api/*` to the Node API server.

Frontend routes:

- `/`: create poll view.
- `/admin/:pollHash`: created poll/admin view. `pollHash` is a separate admin bearer hash stored in the database and is not the same as the public poll ID.
- `/poll/:pollId`: public respondent wizard. `pollId` is the publishable 20-character poll hash.

Backend routes are under `/api/*`.

Admin-only API calls require the request header:

```http
X-Poll-Admin-Hash: <pollHash>
```

The public poll ID is safe to share with respondents. The admin hash is the bearer secret for viewing results, editing the poll, toggling active state, and exporting CSV.

## Data Model

### `polls`

- `id`: UUID primary key.
- `user_id`: 20-character session/user hash for creator attribution.
- `poll_id`: 20-character public hash used in `/poll/:pollId`.
- `admin_hash`: 20-character admin bearer hash used in `/admin/:pollHash` and `X-Poll-Admin-Hash`.
- `name`: poll title text.
- `details`: poll description/details text, markdown-capable.
- `questions`: JSON text array of poll question objects.
- `active`: boolean.
- `created_at`: ISO text timestamp.
- `updated_at`: ISO text timestamp.

### `answers`

- `id`: UUID primary key.
- `user_id`: 20-character respondent session hash.
- `poll_id`: public poll hash.
- `user_info`: text, initially request IP/User-Agent summary.
- `answers`: JSON text object keyed by question index.
- `time`: local client time text supplied by the browser.
- `status`: `draft` or `submitted`.
- `created_at`: ISO text timestamp.
- `updated_at`: ISO text timestamp.

The backend upserts one answer row per `poll_id` and respondent `user_id`. A final submit marks that row as `submitted` instead of creating duplicates.

## Poll Question Format

The backend stores each poll question as JSON:

```ts
{
  name: string;
  question: string;
  optional?: boolean;
  multiselect?: boolean;
  options: string[]; // "text" or "текст" means free-form text input
}
```

`optional` and `multiselect` default to `false`.

The creator UI accepts a markdown-like text format and converts it into the stored JSON array. Each question block uses this shape:

```md
# <name>
## <question>
[] optional
[] multiselect
- option 1
- option 2
```

Rules:

- `# <name>` starts a new question and maps to `name`.
- Multiple questions are represented by repeated `# <name>` blocks in the same editor.
- `## <question>` maps to `question`.
- `[] optional` means `optional: false`; `[x] optional` means `optional: true`.
- `[] multiselect` means `multiselect: false`; `[x] multiselect` means `multiselect: true`.
- Option lines start with `- ` and map to `options`.
- `text` and `текст` remain special option values that enable a free-form text field.
- Missing optional/multiselect lines default to `false`.

Valid free-text question:

```md
# Id
## Type your email
- text
```

Valid multi-select question with free text:

```md
# Subjects
## What subjects do you have
[x] multiselect
- Math
- Literature
- text
```

## Validation

Poll validation:

- `name` is required after trimming.
- `details` is required after trimming.
- Creator question text must parse into a non-empty question array.
- Each question requires non-empty `name`, non-empty `question`, and a non-empty `options` array.
- Every option must be a non-empty string.
- `optional` and `multiselect` must be booleans when present.

Answer validation:

- Non-optional questions must be answered before final submit.
- Single-select answers may include one selected option.
- Multi-select answers may include multiple selected options.
- If a question includes an option exactly equal to `text` or `текст`, the UI exposes a free-text field and the backend accepts a text answer for that question.
- Draft saves are allowed to be incomplete.

## API

- `GET /api/session`: ensures a 30-day session cookie and returns the current session hash.
- `POST /api/polls`: creates a poll and returns `{ pollId, adminHash, publicUrl, adminUrl }`.
- `GET /api/polls/:pollId`: returns public poll data for respondents.
- `GET /api/admin/poll`: returns admin poll data, summary, and results by looking up the poll from `X-Poll-Admin-Hash`.
- `PUT /api/admin/poll`: updates poll fields by looking up the poll from `X-Poll-Admin-Hash`.
- `POST /api/polls/:pollId/answers/draft`: upserts the current respondent session's draft answer.
- `POST /api/polls/:pollId/answers/submit`: validates and marks the current respondent session's answer as submitted.
- `GET /api/admin/poll/results.csv`: downloads submitted results as CSV by looking up the poll from `X-Poll-Admin-Hash`.

Generated URLs after creating a poll:

- Publish URL: `<host>/poll/<pollId>`.
- Admin URL: `<host>/admin/<adminHash>`.

The frontend reads `pollHash` from `/admin/:pollHash` and sends it as `X-Poll-Admin-Hash` for admin API calls. Direct navigation to `/admin/:pollHash` works because the backend looks up the poll by admin hash for all admin endpoints.

## UI

Use focused pages, not an admin-dashboard layout.

Create/update page:

- Poll name input.
- `microMDEditor`-backed poll details editor.
- Markdown-like question editor using the poll question UI format.
- Validation messages.
- Parsed question preview.
- Create/Update and Clear buttons.
- After create, navigate to `/admin/<adminHash>`.

Admin page:

- Poll title and details.
- Summary: number of questions and submitted answers.
- Publish URL with copy-to-clipboard button.
- Admin URL with copy-to-clipboard button.
- Result table with date/time, user info/id, and answered-question count.
- Edit Poll button.
- Download CSV button.

Public respondent page:

- Poll title.
- Poll summary as `x question out of y`.
- Current question title with optional marker.
- Current question details.
- Single-select or multi-select option controls.
- Free-text input when an option is `text` or `текст`.
- Prev and Next buttons.
- Each Next/Prev save sends the full current answer object to the backend as a draft.
- Local storage stores the same draft by `poll_id` and session `user_id`, so refresh can continue the poll.
- Final Submit sends the answer object and marks it submitted.
- Thank-you state shows the poll name and passed question count.

## Styling

Use Tailwind CSS with a clean, focused-pages visual direction: editorial cards, clear form rhythm, strong action buttons, and a mobile-first respondent wizard. Avoid a generic dashboard layout for v1.

## Localization

Use a small dictionary-based i18n layer for English and Russian UI text.

- Store UI dictionaries in `src/client/i18n/en.ts` and `src/client/i18n/ru.ts`.
- Expose a typed `t(key)` helper through a lightweight Preact provider/hook.
- Detect the initial language from `navigator.language`, using Russian for `ru*` locales and English otherwise.
- Add an `EN/RU` language toggle in the app shell and persist the selected language in `localStorage`.
- Translate app chrome, buttons, labels, validation messages, empty states, and table/export UI.
- Do not translate user-created poll names, poll details, question text, options, or answers.
- Backend validation responses should include stable error codes such as `POLL_NAME_REQUIRED`, and the frontend should map those codes to localized messages.
- CSV export should use stable English column headers and does not need localization in v1.

## Testing

- Unit tests for poll question validation.
- Unit tests for answer validation.
- Unit tests for language detection, dictionary fallback, and backend error-code localization.
- API tests for session creation, poll create/read/update, admin hash rejection and acceptance, draft upsert, final submit, and CSV export.
- Frontend/component tests for create validation, admin copy URL rendering, and respondent wizard local draft restoration.
- End-to-end smoke test: create poll, open public URL, answer through the wizard, submit, confirm the result appears in admin view, and export CSV.
