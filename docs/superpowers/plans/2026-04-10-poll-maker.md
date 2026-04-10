# Poll Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-service Preact/Node poll maker with SQLite persistence, admin-hash results, respondent drafts, English/Russian UI dictionaries, and CSV export.

**Architecture:** A Node/Express API owns SQLite/Drizzle, sessions, validation, admin authorization, and production static serving. Vite serves the Preact app in development and proxies `/api/*` to the API server. The client has focused routes for create/update, admin/results, and public respondent wizard.

**Tech Stack:** Node.js, TypeScript, Express, Vite, Preact, Tailwind CSS, Drizzle ORM, SQLite via `better-sqlite3`, Vitest, Playwright, `micro-md-editor`.

---

## File Structure

- Create `package.json`: npm scripts and dependencies.
- Create `tsconfig.json`, `tsconfig.node.json`: shared TypeScript settings.
- Create `vite.config.ts`: Preact Vite config with `/api` dev proxy.
- Create `tailwind.config.ts`, `postcss.config.cjs`, `src/client/styles.css`: Tailwind setup and app visual direction.
- Create `index.html`: Vite HTML entry.
- Create `src/shared/types.ts`: shared poll/question/answer DTO types.
- Create `src/shared/errorCodes.ts`: stable backend validation error codes.
- Create `src/shared/questionFormat.ts`: parser/serializer for markdown-like question format.
- Create `src/shared/validation.ts`: poll and answer validation.
- Create `src/server/db/schema.ts`: Drizzle table definitions.
- Create `src/server/db/client.ts`: SQLite/Drizzle connection.
- Create `src/server/db/migrate.ts`: local schema creation runner.
- Create `src/server/session.ts`: 30-day session cookie middleware.
- Create `src/server/routes.ts`: API route registration.
- Create `src/server/csv.ts`: CSV serialization.
- Create `src/server/index.ts`: API/static server entry.
- Create `src/client/main.tsx`: Preact bootstrap.
- Create `src/client/App.tsx`: route selection and app shell.
- Create `src/client/api.ts`: typed fetch client.
- Create `src/client/i18n/en.ts`, `src/client/i18n/ru.ts`, `src/client/i18n/index.tsx`: lightweight i18n layer.
- Create `src/client/components/MarkdownEditor.tsx`: `micro-md-editor` wrapper.
- Create `src/client/pages/CreatePollPage.tsx`: create/update poll page.
- Create `src/client/pages/AdminPollPage.tsx`: results/admin page.
- Create `src/client/pages/RespondPollPage.tsx`: public wizard with local draft restore.
- Create `src/client/components/QuestionPreview.tsx`, `src/client/components/CopyButton.tsx`: focused shared UI.
- Create `src/shared/*.test.ts`, `src/server/routes.test.ts`, `src/client/*.test.tsx`: Vitest coverage.
- Create `playwright.config.ts`, `tests/e2e/poll-flow.spec.ts`: smoke test.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `tailwind.config.ts`
- Create: `postcss.config.cjs`
- Create: `src/client/styles.css`

- [ ] **Step 1: Create npm package and scripts**

Write `package.json`:

```json
{
  "name": "poll-maker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "npm run dev:api & npm run dev:web",
    "dev:api": "tsx watch src/server/index.ts",
    "dev:web": "vite --host 127.0.0.1",
    "build": "tsc -p tsconfig.node.json && vite build",
    "start": "node dist/server/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "tsx src/server/db/migrate.ts"
  },
  "dependencies": {
    "@preact/preset-vite": "latest",
    "better-sqlite3": "latest",
    "cookie": "latest",
    "drizzle-orm": "latest",
    "express": "latest",
    "micro-md-editor": "latest",
    "nanoid": "latest",
    "preact": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/preact": "latest",
    "@types/better-sqlite3": "latest",
    "@types/express": "latest",
    "@types/node": "latest",
    "autoprefixer": "latest",
    "drizzle-kit": "latest",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Add TypeScript and Vite config**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  },
  "include": ["src/client", "src/shared", "vite.config.ts"]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/server", "src/shared"]
}
```

Write `vite.config.ts`:

```ts
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: false
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
```

- [ ] **Step 3: Add HTML and Tailwind setup**

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Poll Maker</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

Write `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18201b',
        paper: '#f7f0df',
        moss: '#526b4f',
        clay: '#b75f35'
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['ui-serif', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
} satisfies Config;
```

Write `postcss.config.cjs`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

Write `src/client/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(183, 95, 53, 0.16), transparent 28rem),
    linear-gradient(135deg, #f7f0df 0%, #eef2df 100%);
  color: #18201b;
  font-family: Georgia, serif;
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and all packages install successfully.

- [ ] **Step 5: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html tailwind.config.ts postcss.config.cjs src/client/styles.css
git commit -m "chore: scaffold poll maker app"
```

---

### Task 2: Shared Types, Question Parser, and Validation

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/errorCodes.ts`
- Create: `src/shared/questionFormat.ts`
- Create: `src/shared/validation.ts`
- Create: `src/shared/questionFormat.test.ts`
- Create: `src/shared/validation.test.ts`

- [ ] **Step 1: Write parser tests**

Create `src/shared/questionFormat.test.ts` with tests for free-text, multiselect, repeated question blocks, default flags, and serialization round trip.

Run:

```bash
npm test -- src/shared/questionFormat.test.ts
```

Expected: FAIL because `parseQuestionFormat` does not exist.

- [ ] **Step 2: Implement shared types and parser**

Create `src/shared/types.ts`:

```ts
export type PollQuestion = {
  name: string;
  question: string;
  optional?: boolean;
  multiselect?: boolean;
  options: string[];
};

export type AnswerValue = {
  selectedOptions?: string[];
  text?: string;
};

export type AnswerMap = Record<string, AnswerValue>;

export type PollRecord = {
  id: string;
  userId: string;
  pollId: string;
  adminHash: string;
  name: string;
  details: string;
  questions: PollQuestion[];
  active: boolean;
};

export type AnswerStatus = 'draft' | 'submitted';
```

Create `src/shared/questionFormat.ts` with:

```ts
import type { PollQuestion } from './types';

export function parseQuestionFormat(source: string): PollQuestion[] {
  const questions: PollQuestion[] = [];
  let current: PollQuestion | null = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# ') && !line.startsWith('## ')) {
      current = { name: line.slice(2).trim(), question: '', options: [] };
      questions.push(current);
      continue;
    }

    if (!current) {
      throw new Error('QUESTION_NAME_REQUIRED');
    }

    if (line.startsWith('## ')) {
      current.question = line.slice(3).trim();
      continue;
    }

    const optional = line.match(/^\[(x|X)?\]\s+optional$/);
    if (optional) {
      current.optional = optional[1]?.toLowerCase() === 'x';
      continue;
    }

    const multiselect = line.match(/^\[(x|X)?\]\s+multiselect$/);
    if (multiselect) {
      current.multiselect = multiselect[1]?.toLowerCase() === 'x';
      continue;
    }

    if (line.startsWith('- ')) {
      current.options.push(line.slice(2).trim());
      continue;
    }

    throw new Error('QUESTION_FORMAT_INVALID');
  }

  return questions.map((question) => ({
    ...question,
    optional: question.optional ?? false,
    multiselect: question.multiselect ?? false
  }));
}

export function serializeQuestionFormat(questions: PollQuestion[]): string {
  return questions
    .map((question) => {
      const lines = [
        `# ${question.name}`,
        `## ${question.question}`,
        question.optional ? '[x] optional' : '[] optional',
        question.multiselect ? '[x] multiselect' : '[] multiselect',
        ...question.options.map((option) => `- ${option}`)
      ];
      return lines.join('\n');
    })
    .join('\n\n');
}

export function hasTextOption(question: PollQuestion): boolean {
  return question.options.some((option) => option === 'text' || option === 'текст');
}
```

- [ ] **Step 3: Run parser tests**

Run:

```bash
npm test -- src/shared/questionFormat.test.ts
```

Expected: PASS.

- [ ] **Step 4: Write validation tests**

Create `src/shared/validation.test.ts` covering missing poll name, missing details, empty parsed questions, missing options, draft answer permissiveness, final answer required fields, single-select rejection for multiple choices, multiselect acceptance, and free-text acceptance.

Run:

```bash
npm test -- src/shared/validation.test.ts
```

Expected: FAIL because validation functions do not exist.

- [ ] **Step 5: Implement error codes and validation**

Create `src/shared/errorCodes.ts`:

```ts
export const errorCodes = {
  POLL_NAME_REQUIRED: 'POLL_NAME_REQUIRED',
  POLL_DETAILS_REQUIRED: 'POLL_DETAILS_REQUIRED',
  QUESTIONS_REQUIRED: 'QUESTIONS_REQUIRED',
  QUESTION_NAME_REQUIRED: 'QUESTION_NAME_REQUIRED',
  QUESTION_TEXT_REQUIRED: 'QUESTION_TEXT_REQUIRED',
  QUESTION_OPTIONS_REQUIRED: 'QUESTION_OPTIONS_REQUIRED',
  ANSWER_REQUIRED: 'ANSWER_REQUIRED',
  ANSWER_OPTION_INVALID: 'ANSWER_OPTION_INVALID',
  ANSWER_MULTIPLE_NOT_ALLOWED: 'ANSWER_MULTIPLE_NOT_ALLOWED',
  ADMIN_HASH_REQUIRED: 'ADMIN_HASH_REQUIRED',
  ADMIN_HASH_INVALID: 'ADMIN_HASH_INVALID',
  POLL_NOT_FOUND: 'POLL_NOT_FOUND'
} as const;
```

Create `src/shared/validation.ts`:

```ts
import { errorCodes } from './errorCodes';
import { hasTextOption } from './questionFormat';
import type { AnswerMap, PollQuestion } from './types';

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validatePollInput(input: {
  name: string;
  details: string;
  questions: PollQuestion[];
}): ValidationResult {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push(errorCodes.POLL_NAME_REQUIRED);
  if (!input.details.trim()) errors.push(errorCodes.POLL_DETAILS_REQUIRED);
  if (input.questions.length === 0) errors.push(errorCodes.QUESTIONS_REQUIRED);

  input.questions.forEach((question) => {
    if (!question.name.trim()) errors.push(errorCodes.QUESTION_NAME_REQUIRED);
    if (!question.question.trim()) errors.push(errorCodes.QUESTION_TEXT_REQUIRED);
    if (question.options.length === 0 || question.options.some((option) => !option.trim())) {
      errors.push(errorCodes.QUESTION_OPTIONS_REQUIRED);
    }
  });

  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateAnswers(input: {
  questions: PollQuestion[];
  answers: AnswerMap;
  final: boolean;
}): ValidationResult {
  const errors: string[] = [];
  if (!input.final) return { ok: true };

  input.questions.forEach((question, index) => {
    const answer = input.answers[String(index)];
    const selected = answer?.selectedOptions ?? [];
    const text = answer?.text?.trim() ?? '';
    const hasAnswer = selected.length > 0 || text.length > 0;

    if (!question.optional && !hasAnswer) errors.push(errorCodes.ANSWER_REQUIRED);
    if (!question.multiselect && selected.length > 1) errors.push(errorCodes.ANSWER_MULTIPLE_NOT_ALLOWED);
    if (text && !hasTextOption(question)) errors.push(errorCodes.ANSWER_OPTION_INVALID);

    selected.forEach((option) => {
      if (!question.options.includes(option)) errors.push(errorCodes.ANSWER_OPTION_INVALID);
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true };
}
```

- [ ] **Step 6: Run validation tests**

Run:

```bash
npm test -- src/shared/questionFormat.test.ts src/shared/validation.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit shared logic**

Run:

```bash
git add src/shared
git commit -m "feat: add poll format validation"
```

---

### Task 3: Database, Sessions, and API Foundation

**Files:**
- Create: `src/server/db/schema.ts`
- Create: `src/server/db/client.ts`
- Create: `src/server/db/migrate.ts`
- Create: `src/server/session.ts`
- Create: `src/server/routes.ts`
- Create: `src/server/index.ts`
- Create: `src/server/routes.test.ts`

- [ ] **Step 1: Write API foundation tests**

Create `src/server/routes.test.ts` covering:

- `GET /api/session` sets a session cookie and returns `{ userId }`.
- `POST /api/polls` rejects missing name/details/questions.
- `POST /api/polls` creates a poll and returns `pollId`, `adminHash`, `publicUrl`, and `adminUrl`.
- `GET /api/polls/:pollId` returns public poll fields without `adminHash`.

Run:

```bash
npm test -- src/server/routes.test.ts
```

Expected: FAIL because server routes do not exist.

- [ ] **Step 2: Implement schema and database client**

Create `src/server/db/schema.ts`:

```ts
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const polls = sqliteTable('polls', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  pollId: text('poll_id').notNull(),
  adminHash: text('admin_hash').notNull(),
  name: text('name').notNull(),
  details: text('details').notNull(),
  questions: text('questions').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, (table) => ({
  pollIdIdx: uniqueIndex('polls_poll_id_idx').on(table.pollId),
  adminHashIdx: uniqueIndex('polls_admin_hash_idx').on(table.adminHash)
}));

export const answers = sqliteTable('answers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  pollId: text('poll_id').notNull(),
  userInfo: text('user_info').notNull(),
  answers: text('answers').notNull(),
  time: text('time').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, (table) => ({
  answerSessionIdx: uniqueIndex('answers_poll_user_idx').on(table.pollId, table.userId)
}));
```

Create `src/server/db/client.ts` with a `createDb(filename = process.env.SQLITE_FILE ?? 'poll-maker.sqlite')` helper returning `{ sqlite, db }`.

Create `src/server/db/migrate.ts` that executes `CREATE TABLE IF NOT EXISTS` SQL matching the schema and unique indexes.

- [ ] **Step 3: Implement sessions**

Create `src/server/session.ts`:

```ts
import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

const cookieName = 'poll_maker_session';
const maxAgeMs = 30 * 24 * 60 * 60 * 1000;

export type SessionRequest = Request & { userId: string };

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.split('=')[1];
  const userId = existing && existing.length === 20 ? existing : nanoid(20);

  res.cookie(cookieName, userId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/'
  });

  (req as SessionRequest).userId = userId;
  next();
}
```

- [ ] **Step 4: Implement route foundation**

Create `src/server/routes.ts` with `createApp(db)` registering JSON parsing, session middleware, `GET /api/session`, `POST /api/polls`, and `GET /api/polls/:pollId`.

Use `nanoid(20)` for `pollId` and `adminHash`, `crypto.randomUUID()` for primary keys, parse question text with `parseQuestionFormat`, validate with `validatePollInput`, and return stable `{ errors: string[] }` responses with HTTP 400 for validation failures.

- [ ] **Step 5: Implement server entry**

Create `src/server/index.ts` that creates the database, runs migration, registers routes, serves `dist/client` when present, and listens on `process.env.PORT ?? 3001`.

- [ ] **Step 6: Run API foundation tests**

Run:

```bash
npm test -- src/server/routes.test.ts
```

Expected: PASS for session and public poll creation/read.

- [ ] **Step 7: Commit API foundation**

Run:

```bash
git add src/server src/shared package.json package-lock.json
git commit -m "feat: add poll api foundation"
```

---

### Task 4: Admin APIs, Draft Answers, and CSV Export

**Files:**
- Modify: `src/server/routes.ts`
- Create: `src/server/csv.ts`
- Modify: `src/server/routes.test.ts`

- [ ] **Step 1: Add failing route tests**

Extend `src/server/routes.test.ts` for:

- `GET /api/admin/poll` rejects missing/invalid `X-Poll-Admin-Hash`.
- `GET /api/admin/poll` returns poll details, question count, submitted answer count, and result rows for a valid admin hash.
- `PUT /api/admin/poll` updates name, details, question format, and active flag for a valid admin hash.
- `POST /api/polls/:pollId/answers/draft` upserts an incomplete draft.
- `POST /api/polls/:pollId/answers/submit` rejects incomplete required answers.
- `POST /api/polls/:pollId/answers/submit` marks the row as `submitted`.
- `GET /api/admin/poll/results.csv` returns stable English headers.

Run:

```bash
npm test -- src/server/routes.test.ts
```

Expected: FAIL because admin/answer/export routes are missing.

- [ ] **Step 2: Implement CSV helper**

Create `src/server/csv.ts`:

```ts
export function escapeCsv(value: unknown): string {
  const raw = String(value ?? '');
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  const headers = ['time', 'user_info', 'answered_questions', 'answers'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}
```

- [ ] **Step 3: Implement admin and answer routes**

Modify `src/server/routes.ts` to add:

- `requireAdminPoll(req, res)` helper that reads `X-Poll-Admin-Hash`, looks up `polls.adminHash`, and returns 401/403 with `ADMIN_HASH_REQUIRED` or `ADMIN_HASH_INVALID`.
- `GET /api/admin/poll`.
- `PUT /api/admin/poll`.
- `POST /api/polls/:pollId/answers/draft`.
- `POST /api/polls/:pollId/answers/submit`.
- `GET /api/admin/poll/results.csv`.

Represent answer request bodies as:

```ts
{
  answers: Record<string, { selectedOptions?: string[]; text?: string }>;
  time: string;
}
```

For `user_info`, store `${req.ip ?? 'unknown'} ${req.get('user-agent') ?? ''}` trimmed.

- [ ] **Step 4: Run route tests**

Run:

```bash
npm test -- src/server/routes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit admin and answers**

Run:

```bash
git add src/server
git commit -m "feat: add admin answers and csv api"
```

---

### Task 5: Client API and Localization

**Files:**
- Create: `src/client/api.ts`
- Create: `src/client/i18n/en.ts`
- Create: `src/client/i18n/ru.ts`
- Create: `src/client/i18n/index.tsx`
- Create: `src/client/i18n/i18n.test.tsx`

- [ ] **Step 1: Write i18n tests**

Create `src/client/i18n/i18n.test.tsx` covering:

- `detectLanguage('ru-RU')` returns `ru`.
- `detectLanguage('en-US')` returns `en`.
- unknown locales fall back to `en`.
- `t('create.title')` returns a Russian string after switching to `ru`.
- backend error code `POLL_NAME_REQUIRED` maps to localized text.

Run:

```bash
npm test -- src/client/i18n/i18n.test.tsx
```

Expected: FAIL because i18n module is missing.

- [ ] **Step 2: Implement dictionaries**

Create `src/client/i18n/en.ts` and `src/client/i18n/ru.ts` with identical keys for app chrome, create/admin/respondent labels, validation messages, empty states, and buttons.

Minimum keys:

```ts
export const en = {
  'app.title': 'Poll Maker',
  'language.en': 'EN',
  'language.ru': 'RU',
  'create.title': 'Create poll',
  'create.name': 'Poll name',
  'create.details': 'Poll details',
  'create.questions': 'Questions',
  'create.submit': 'Create',
  'create.update': 'Update',
  'create.clear': 'Clear',
  'admin.publishUrl': 'Publish URL',
  'admin.adminUrl': 'Admin URL',
  'admin.downloadCsv': 'Download CSV',
  'respond.next': 'Next',
  'respond.prev': 'Prev',
  'respond.submit': 'Submit',
  'respond.thanks': 'Thank you for participation',
  'error.POLL_NAME_REQUIRED': 'Poll name is required',
  'error.POLL_DETAILS_REQUIRED': 'Poll details are required',
  'error.QUESTIONS_REQUIRED': 'Add at least one question'
} as const;
```

Use the same key set in `ru.ts`.

- [ ] **Step 3: Implement i18n provider**

Create `src/client/i18n/index.tsx` exporting `Language`, `detectLanguage`, `I18nProvider`, `useI18n`, and `translateErrorCode`. Persist selection under local storage key `poll-maker-language`.

- [ ] **Step 4: Implement API client**

Create `src/client/api.ts` with typed functions:

- `getSession()`
- `createPoll(input)`
- `getPublicPoll(pollId)`
- `getAdminPoll(adminHash)`
- `updateAdminPoll(adminHash, input)`
- `saveDraft(pollId, input)`
- `submitAnswer(pollId, input)`
- `csvUrl(adminHash)`

Admin requests set `X-Poll-Admin-Hash`.

- [ ] **Step 5: Run i18n tests**

Run:

```bash
npm test -- src/client/i18n/i18n.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit client infrastructure**

Run:

```bash
git add src/client/api.ts src/client/i18n
git commit -m "feat: add client api and localization"
```

---

### Task 6: Create and Admin Pages

**Files:**
- Create: `src/client/main.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/components/MarkdownEditor.tsx`
- Create: `src/client/components/QuestionPreview.tsx`
- Create: `src/client/components/CopyButton.tsx`
- Create: `src/client/pages/CreatePollPage.tsx`
- Create: `src/client/pages/AdminPollPage.tsx`
- Create: `src/client/pages/CreatePollPage.test.tsx`
- Create: `src/client/pages/AdminPollPage.test.tsx`

- [ ] **Step 1: Write page tests**

Create tests that verify:

- create page shows name/details/questions fields.
- create page parses question format and shows a preview.
- create page shows localized validation errors.
- admin page renders publish/admin URLs and result summary from mocked API data.
- copy button calls `navigator.clipboard.writeText`.

Run:

```bash
npm test -- src/client/pages/CreatePollPage.test.tsx src/client/pages/AdminPollPage.test.tsx
```

Expected: FAIL because pages are missing.

- [ ] **Step 2: Implement markdown editor wrapper**

Create `src/client/components/MarkdownEditor.tsx` as the only direct import site for `micro-md-editor`. If the package does not expose Preact-compatible JSX types directly, wrap it with `preact/compat` in Vite aliasing or use the package's documented web-component/React-compatible entry after checking the installed package exports.

The wrapper interface must be:

```ts
type MarkdownEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};
```

- [ ] **Step 3: Implement create/update page**

Create `CreatePollPage.tsx` with local state for `name`, `details`, `questionText`, `errors`, and optional update mode. Use `parseQuestionFormat` and `validatePollInput` before submit. On create success, navigate with `history.pushState` or `location.assign` to `/admin/${adminHash}`.

Use this default question text:

```md
# Id
## Type your email
- text
```

- [ ] **Step 4: Implement admin page**

Create `AdminPollPage.tsx` that extracts `pollHash` from `/admin/:pollHash`, calls `getAdminPoll(pollHash)`, renders summary, copy buttons, result rows, edit button, and CSV download link. Edit mode should reuse the same form concepts as `CreatePollPage` and call `updateAdminPoll`.

- [ ] **Step 5: Implement app shell and routing**

Create `main.tsx` and `App.tsx` with simple pathname-based routing for `/`, `/admin/:pollHash`, and `/poll/:pollId`. Wrap the app in `I18nProvider`, import `styles.css`, and render the `EN/RU` toggle.

- [ ] **Step 6: Run page tests**

Run:

```bash
npm test -- src/client/pages/CreatePollPage.test.tsx src/client/pages/AdminPollPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit create/admin UI**

Run:

```bash
git add src/client
git commit -m "feat: add create and admin ui"
```

---

### Task 7: Respondent Wizard and Local Drafts

**Files:**
- Create: `src/client/pages/RespondPollPage.tsx`
- Create: `src/client/pages/RespondPollPage.test.tsx`
- Modify: `src/client/App.tsx`
- Modify: `src/client/i18n/en.ts`
- Modify: `src/client/i18n/ru.ts`

- [ ] **Step 1: Write respondent tests**

Create tests that verify:

- public poll page renders `1 question out of 2`.
- optional marker appears for optional questions.
- multiselect permits more than one option.
- free-text input appears for `text` and `текст` options.
- Next saves a draft through API.
- local storage draft restores after remount.
- final submit shows thank-you state and passed question count.

Run:

```bash
npm test -- src/client/pages/RespondPollPage.test.tsx
```

Expected: FAIL because respondent page is missing.

- [ ] **Step 2: Implement local draft helpers inside respondent page**

Use the local storage key:

```ts
const draftKey = `poll-maker-draft:${pollId}:${userId}`;
```

Store:

```ts
{
  currentIndex: number;
  answers: Record<string, { selectedOptions?: string[]; text?: string }>;
}
```

- [ ] **Step 3: Implement wizard behavior**

Create `RespondPollPage.tsx` that loads session and poll data, restores local draft, renders one question at a time, saves full answer object on Prev/Next, validates final submit through the API, and renders thank-you state.

For passed question count, count answers with at least one selected option or non-empty text.

- [ ] **Step 4: Run respondent tests**

Run:

```bash
npm test -- src/client/pages/RespondPollPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit respondent UI**

Run:

```bash
git add src/client
git commit -m "feat: add respondent poll wizard"
```

---

### Task 8: Full Verification and E2E Smoke Test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/poll-flow.spec.ts`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add E2E config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://127.0.0.1:5173'
  }
});
```

Update `.gitignore` to include:

```gitignore
test-results/
playwright-report/
poll-maker.sqlite
```

- [ ] **Step 2: Write E2E smoke test**

Create `tests/e2e/poll-flow.spec.ts` that:

- opens `/`;
- creates a poll with the default `# Id` free-text question and a `# Subjects` multiselect question;
- captures `/admin/<adminHash>`;
- opens `/poll/<pollId>`;
- answers the questions and submits;
- returns to admin URL;
- verifies answer count is visible;
- clicks/downloads CSV and verifies a file is produced.

- [ ] **Step 3: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and `dist/` contains built server and client assets.

- [ ] **Step 5: Run E2E smoke test**

Run:

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit verification**

Run:

```bash
git add .gitignore package.json package-lock.json playwright.config.ts tests src
git commit -m "test: add poll maker smoke coverage"
```

---

## Self-Review Checklist

- Spec coverage: plan includes single Node service, Vite/Preact, Tailwind, Drizzle/SQLite, session cookie, separate public poll ID/admin hash, admin hash header, create/update page, admin results page, public wizard, local draft restore, CSV export with English headers, lightweight EN/RU UI dictionaries, and `micro-md-editor`.
- Placeholder scan: no task depends on unspecified routes, missing file names, or future-only work.
- Type consistency: `pollId` is the public hash, `adminHash`/`pollHash` is the admin bearer value, and admin APIs use `X-Poll-Admin-Hash` without `:pollId`.
