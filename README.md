# build-day-workflow-editor

Fake consumer app for the ARC Core build day. See [`build-day-spec.md`](build-day-spec.md) for context.

## Run

Requires Node 22 (pinned via `.nvmrc` and `engines.node`).

```bash
nvm use            # picks up .nvmrc → Node 22
pnpm install
pnpm dev
```

If you don't have Node 22 yet: `nvm install 22 && nvm use`.

This starts:

- Vite frontend on `http://localhost:5173`
- Hono backend on `http://localhost:4000` (proxied at `/api/*`)

## Configuration

Environment variables (set in `.env` or shell):

- `RC_WORKFLOWS_URL` — base URL of local `rc-workflows`. Defaults to `http://localhost:3000`.
- `RC_WORKFLOWS_BEARER` — bearer token for `rc-workflows`. Defaults to a placeholder; set when local rc-workflows requires auth.
- `RC_WORKFLOWS_ORG_ID` — org id used in template POST. Defaults to `12345`.

If `rc-workflows` is unreachable on startup, seeding falls back to a local-only template (no real `template_id`, version 1). Save still works; Publish will error with a hint to bring `rc-workflows` up.

## Scripts

- `pnpm dev` — concurrent Vite + Hono.
- `pnpm dev:web` — frontend only.
- `pnpm dev:api` — backend only (with hot reload).
- `pnpm typecheck` — `tsc --noEmit`.

## Layout

```
build-day-workflow-editor/
├── design-tokens/      # vendored Atlas tokens (JSON)
├── server/             # Hono backend
│   ├── index.ts
│   ├── db.ts
│   ├── seed.ts
│   ├── routes/
│   └── rc-workflows.ts
├── src/                # Vite frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── theme/
│   ├── api/
│   ├── components/
│   ├── pages/
│   └── workflow/       # viewer + editor
└── .data/              # SQLite db (gitignored)
```
