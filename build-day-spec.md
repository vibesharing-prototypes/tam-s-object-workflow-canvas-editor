# Build Day Spec: Workflow Viewer & Editor (v5)

**ARC Core — Workflows Service × Fake Consumer App**
**Date:** 2026-05-05 | **Team:** Triad (PM, EM, Designer)
**Status:** v5 — full rewrite. Grounded in the real Workflows Service OpenAPI spec. Host is a purpose-built minimal demo app (not the Object Library). Viewer and editor UI live inside the fake app; promoting them to reusable `packages/ui/` components is a post-day concern. **Scope narrowed to viewer + editor only:** transition firing, guard webhooks, and workflow-instance creation are out of scope — no event infrastructure on build day. **Visual design** is locked in [Figma](https://www.figma.com/design/cpG5xikx8UYQ5Vk9vavwef/2026-05-06-AI-build-day-proto?node-id=1-36567) — see §4 for how the design shapes the build. Supersedes v4.

---

## 1. What we're building and why

One day, one demo: a **visual workflow viewer and editor** embedded in a minimal purpose-built demo app ("fake app") running locally alongside a local `rc-workflows`. Atlas design tokens + MUI v7 throughout — the demo must look like a Diligent product.

The demo app is a stand-in for a consumer application: it has a single "audit finding" detail page, the finding shows what state it's currently in, and the user can open the workflow editor to inspect or modify the template that defines the finding's lifecycle.

**Scope:** viewer + editor + Save (local draft) + Publish (new immutable version in `rc-workflows`). **Out of scope:** firing transitions, guard webhook callbacks, workflow-instance creation, action event handlers, Activate. Rationale below.

**Why this shape:**

- The brainstorm stated: *"first step: visualize what we already have on the backend; second step: figure out what we want to solve for in the future."* Viewer-first is faithful to that.
- The long-form requirements (Risk/Control/Process/Objective workflows, multi-workflow-per-object, per-stage RBAC, triggers, comments, OOTB protection) are a multi-quarter roadmap. Build day has to produce something that proves the **visual editor + real template versioning round-trip** works end-to-end — everything else is deferred without apology.
- The Workflows Service already exists as a JSON-FSM backend with a concrete OpenAPI surface. Our job on build day is almost entirely **frontend + light integration glue** — no Workflows Service changes. The [Workflows Service Integration Guide](https://diligentbrands.atlassian.net/wiki/spaces/RCP/pages/5944999960/Workflows+Service+-+Integration+Guide) is the canonical reference for what a real consumer app needs to provide; we are deliberately skipping the consumer-side runtime (guard webhooks, action event handlers) for build day.
- A real `rc-object-library` plugin drags in the whole app shell, providers, federated GraphQL gateway, Atlas Lens theme chrome, and auth. Too heavy for one day. The **fake app** is a throwaway host; building the viewer/editor UI inside it (rather than as a reusable component upfront) is the lightest path to a working demo. Reusability is a post-day refactor — see §11.

**Why we're cutting transitions and guards:** Firing a transition through `rc-workflows` requires creating workflow instances, exposing guard webhook endpoints with IAM auth, and (for actions) standing up event infrastructure for `StateTransitionEventAcceptedEvent:1` handling. Each of these is a real chunk of work, and none of them showcase the *editor experience* — which is the actual value of the build day. We're deliberately keeping the build focused on **visualising and editing templates**.

**Definition of success:** A teammate opens the demo app, lands on a finding detail page, sees the workflow template that governs the finding rendered as a graph with the finding's current state highlighted (state is hardcoded on the seeded finding — no live transitions). They open the editor, add an approval state, attach a guard from the registry, click Save (draft persists locally), iterate, click Publish — and a new version of the template lands in the locally-running `rc-workflows`, mirrored back to the fake app. Atlas look and feel throughout.

**Explicit non-goal:** Nothing in this build is production-shaped. The fake app, the viewer/editor UI, and all integration glue are throwaway. The only artefact we expect to keep is the **lessons learned** about the right component shape, API surface, and data model — to be applied in a proper rebuild later. See §11.

---

## 2. Named decisions

These are the decisions that the brainstorm left open and that v4 buried. Calling them out explicitly so they aren't re-litigated on build day.

| # | Decision | Choice |
|---|---|---|
| D1 | Where do guards/actions live on the canvas? | **Transitions** carry guards and actions. **States** carry only display metadata and (for approval states) an approver role. |
| D2 | How are approvals modelled? | As **states** flagged `type: approval` in `_editor_metadata`, with a configurable approver role. Not as guards. Rationale: approvals are inherently stateful. Multi-step approvals are a chain of approval states — not in scope today, but the model extends naturally. |
| D3 | Shared vs app-specific guards/actions? | **Both.** A capabilities endpoint on the fake app returns a single flat list with a `source: "shared" \| "custom"` field; the editor groups them in the UI. |
| D4 | Where does Workflows Service REST get called from? | **Fake-app Hono backend**, called directly from the fake-app frontend via plain HTTP. No GraphQL, no federated gateway, no SigV4. |
| D5 | How does the editor load an existing template? | From the **fake-app's local mirror** (see §6). The Workflows Service has no GET template endpoint. |
| D6 | Save vs Publish vs Activate? | **Three distinct actions, three different effects.** *Save* = **autosave** a mutable draft locally on every edit (debounced ~500ms, no user action, no `rc-workflows` call); the editor surfaces a tri-state status indicator ("Saving…" / "Saved Xs ago" / "Save failed — retry"). *Publish* = freeze the current draft into a new immutable template version in `rc-workflows` and mirror it locally; **does not auto-activate**. *Activate* = point the active-workflow pointer at a published version. The Workflows Service is append-only per the OpenAPI, so it can only hold published versions. |
| D7 | Activate? | **In scope as fake-app-local state.** New `active_workflows` table (PK `org_id, template_key`) holds the active pointer. `GET/PUT /workflow-templates/:key/active` exposes it. Activate is reachable from three places: the version history list (`/findings/workflow/versions`), the version detail page (`/findings/workflow/versions/:version`), and the editor toolbar (post-publish, when the just-published version isn't yet active). The editor opens against the active version when there's no draft (`draft ?? active ?? latest`). Activate doesn't affect existing findings — their `workflow_template_version` is immutable per row. The seed marks v1 active on first run. |
| D8 | Instance creation, migration, transition firing? | **Out of scope.** No `POST /workflow_instances`, no `POST /state_transition_events`, no `PATCH /change_template`. The finding's "current state" is just a hardcoded string on the seeded finding row. |
| D9 | Demo host? | A new, minimal **fake app** in a standalone repo at [`dil-tkenez/build-day-workflow-editor`](https://github.com/dil-tkenez/build-day-workflow-editor.git) (Vite + Hono + SQLite). Currently empty. Not the Object Library. Atlas tokens + MUI v7. **Includes a static Diligent app shell** (side nav + global header) to match the Figma design — visual only, no chrome interactions. |
| D10 | Where does the viewer/editor UI live? | **Inside the fake app** (e.g. `src/components/workflow-viewer/`, `.../workflow-editor/`). Not extracted into `rc-object-library/packages/ui/`. Promoting to a reusable component is a post-day refactor (§11). |
| D11 | Local `rc-workflows`? | Run locally during build day. Used only for `POST /workflow_templates` on Publish. No webhook callbacks (no guards), so no localhost reachability concerns from the service. |
| D12 | Guards in templates? | The capabilities registry still surfaces guards as **selectable items in the editor UI** — that's a core editing capability. They are saved into the template definition. We just never trigger them, because we never fire transitions. No webhook endpoints in the fake app. |
| D13 | Editor UX: drawer or route? | **Dedicated route** (`/findings/workflow`), per Figma. Replaces v4's full-screen drawer model. The page has two modes — viewer and editor — toggled by an "Edit" button. The editor's Save/Publish toolbar lives inside the page. |
| D14 | Where does "Edit workflow" live in the IA? | **On the list page**, inside a "Manage" dropdown alongside "Edit schema" (the latter is visible but disabled — out of scope). Per Figma. |
| D15 | Per-finding detail page design? | **Being designed in parallel with the build.** A holding-pattern layout (metadata block + viewer) ships immediately; final design is swapped in when it lands. The viewer component is the same in both. |

---

## 3. Backend facts we're building against

### 3.1 `rc-workflows` — what we use on build day

From `packages/openapi-spec/src/openapi.yaml` (the source of truth) and the [Workflows Service Integration Guide](https://diligentbrands.atlassian.net/wiki/spaces/RCP/pages/5944999960/Workflows+Service+-+Integration+Guide). All endpoints are `Bearer`-authenticated and org-scoped.

**The only endpoint we actually call:**

- `POST /v1/orgs/{org_id}/workflow_templates` — create a template version. Body: `{ data: { type: "workflow_templates", attributes: { definition, name, service, version } } }`. Returns 201 with the created template. Versions are append-only.

That's it. No instance creation, no transition events, no guard webhooks, no template GETs (because there are none — see §3.2), no template DELETE.

**For reference (NOT used on build day):**

- `POST /workflow_instances`, `PATCH .../change_template`, `DELETE .../{id}`, `POST .../state_transition_events` — instance lifecycle. Out of scope.
- Guard webhook callback contract — out of scope. Production guards must use IAM Auth per the integration guide.
- Action event handlers (`StateTransitionEventAcceptedEvent:1` → `Actions Completed`/`Failed`) — out of scope. Requires event infrastructure we're not building.

### 3.2 Gaps in the Workflows Service that shape our design

- **No GET endpoints for templates.** Once we POST a template we can't read it back. Implication: the fake app **must** mirror every published template locally so the editor can load it for further editing. This is the load-bearing reason §6 exists.
- **No "active template" concept in Workflows Service.** Versions are addressable by `(id, version)`. The consumer app owns "which version is current"; we're skipping the Activate concept entirely on build day.
- **No capabilities/registry in Workflows Service.** Guard and action names are free-form strings in the template JSON. The registry is ours to invent in the fake app — and it's an editor-UX concern (so the user has a list to pick from), not a runtime concern.

### 3.3 Local dev assumption

We will run **`rc-workflows` locally** on build day (its repo is cloned and functional per its README). Bearer auth to `rc-workflows` uses whatever its local dev mode accepts (to be confirmed pre-day; see Q1). No webhook callbacks from `rc-workflows` to the fake app are needed, so localhost reachability *from* the service is not a concern.

**Fallback if `rc-workflows` local dev is broken:** point the fake-app backend at a deployed dev `rc-workflows` instead. Bearer token from the team. Noted as a risk, not planned for.

---

## 4. Demo scenario

A pre-seeded **audit finding** with a workflow template attached. The template defines a finding's lifecycle with a branching Head-of-Audit approval path for critical findings — this is purely descriptive (we never fire transitions through it on build day; it's just a realistic-looking template to view and edit).

```
                    submit
       ┌────────┐ ────────▶ ┌──────────────┐
       │ Draft  │           │  In Review   │
       └────────┘ ◀──────── └──────────────┘
            ▲    decline      │          │
            │                 │ approve  │ escalate
            │                 │ [guard:  │ [guard:
            │                 │ is-not-  │ is-critical]
            │                 │ critical]│
            │                 ▼          ▼
            │         ┌────────────┐  ┌──────────────┐
            │         │ To be      │  │  HoA Review  │
            │ decline │ Published  │  │ (approval)   │
            │◀────────│            │  │ approver:    │
            │ reject  │            │  │ Head of      │
            │         └────────────┘  │ Audit        │
            │                    ▲    └──────────────┘
            │                    │ accept │
            │                    └────────┤
            │                             │ decline
            └─────────────────────────────┘
```

**States:** Draft (initial) → In Review → {To be Published | HoA Review} → To be Published
**Guards declared in the registry:** `is-critical`, `is-not-critical` (shared), `authorised-approver` (custom). Selectable in the editor; not invoked at runtime (no transitions fire).
**Actions declared in the registry:** `notify-hoa` (custom). Selectable in the editor; not invoked at runtime.

**Surface:** Four routes, all wrapped in a static Diligent app shell (side nav + global header). Visual design is in [Figma](https://www.figma.com/design/cpG5xikx8UYQ5Vk9vavwef/2026-05-06-AI-build-day-proto?node-id=1-36567).

**App chrome (every route)**

- **Side navigation** (300px wide): Diligent logo, "Audit" section header, items: Home, Audit universe, Audit risk assessment, Audit planning, **Object library** (selected), App settings. **Static — no items are interactive.**
- **Global header** (top, 65px): hamburger, Diligent wordmark, org switcher ("Acme Corporation"), notifications icon, profile avatar. **Static.**
- **Main content area** below the header, padded.

The chrome exists to make the prototype look like a real Diligent product. Everything outside the main content is non-interactive. See Figma for exact visuals.

**Route 1 — `/` (Object library home)**

The OL root frame from Figma. Breadcrumb: `Audit`. Title: "Object library". Top-right: a static "Add object" button (visual only, no behaviour).

Body: a 3×2 grid of object-type tiles — Audit findings, Controls, Control assessments, Assessment methods, Processes, Evidence — each showing a count and "Last updated DD-MM-YYYY HH:MM" placeholder. **Only the "Audit findings" tile is interactive** (links to `/findings`). The other five render with hardcoded counts and dummy timestamps and do nothing on click.

**Route 2 — `/findings` (Audit findings list)**

The list-page frame from Figma. Breadcrumb: `Audit / Object library`. Title: "Audit findings" with a back arrow.

Top-right actions:
- **"Manage" dropdown** with two items:
  - "Edit schema" — visible but disabled / no-op (out of scope, but must be in the menu per the design).
  - "Edit workflow" — navigates to `/findings/workflow`.
- **"+ Add" button** — static visual only, no behaviour.

Toolbar row (below title): Search input, Filter button, Columns button — **all static visuals, no interactions wired**.

Table: faithful to the design, but driven by real data (3–5 seeded rows). Columns: ID, Name (clickable, links to `/findings/:id`), Severity (badge), Status (state-pill in workflow palette), Owner (avatar + name), Approver (avatar + name — second person column), "Applicable to" (link + sub-info). Wider column set in the design (Added at, etc.) is rendered if cheap, otherwise truncated.

Pagination footer: rendered visually ("Rows: 25, 1–N of M"), not interactive.

**Route 3 — `/findings/:id` (Audit finding detail)**

Per-finding detail page. **The Figma design for this page is being produced in parallel with the build** — the build follows the design as it lands. As a holding pattern, the detail page renders:

- Breadcrumb: `Audit / Object library / Audit findings`, back arrow.
- Title: finding name.
- Metadata block: severity badge, current workflow state badge, owner, approver.
- The **workflow viewer** rendering the finding's attached template with the finding's `current_state` highlighted on the canvas.

When the design lands, swap the holding layout for the designed one. The viewer component itself is reusable across the holding and final layouts.

**Route 4 — `/findings/workflow` (Workflow editor)**

Dedicated route, not a drawer. Replaces v4's drawer model (D13).

Page chrome (per Figma): Breadcrumb `Audit / Object library / Audit findings`. Back arrow + "Workflow" title with subtitle "Audit finding". Top-right: a single "Edit" button.

Body in **viewer mode**: the workflow viewer rendered full-bleed below the header, showing the latest published template (no current-state highlight here — there's no finding context). "Edit" button switches to editor mode.

Body in **editor mode**: the interactive editor canvas with the toolbar (Save, Publish, version chip, kebab menu). Returns to viewer mode on Discard or after a successful Publish.

The "Edit workflow" entry point on the list page navigates here. Breadcrumb back to the list page is the way out.

No "fire transition" button anywhere. No way to change a finding's current state on build day.

**Seed data:** 3–5 hardcoded findings in the fake-app DB matching the look of the Figma table (mixed severities, mixed states drawn from the Figma status palette: e.g. *In progress*, *Closed*, *Approved*, *Draft*, *Accepted*, *Published*, *To be approved*). The seeded template is POSTed to local `rc-workflows` once on first startup and mirrored locally; the findings reference its `(template_id, version)`. **The seeded template's states must include all status values shown on seeded findings**, otherwise the viewer can't highlight them. Final state list TBD; alignment with the §4 diagram resolved as part of the design pass.

Seeded via a startup script (§7.4).

---

## 5. The viewer and editor UI (inside the fake app)

The viewer and editor live in the fake-app frontend (`src/components/workflow-viewer/` and `.../workflow-editor/`, plus a shared internal `workflow-canvas/`). They call the fake-app's own Hono backend directly via `fetch` — no abstraction layer, no injected api prop. We're optimising for build-day speed, not reusability.

Build them as ordinary React components with whatever shape makes the day go fastest. **Post-day**, when we have a working reference, we'll extract them into `packages/ui/` properly: extract the component conventions, design the right prop interface, decouple from transport. Trying to do that on build day costs us time and risks designing the wrong abstraction. See §11.

Stack: React 19 + TypeScript, MUI v7, React Flow v11, TanStack React Query. Atlas design tokens are vendored into the repo as JSON under `design-tokens/` (see §7.5) — no `@diligentcorp/atlas-design-tokens` npm dependency.

### 5.1 Workflow viewer

A read-only canvas component. Takes a template definition and a "current state" string (just a label to highlight — there's no live instance behind it on build day).

Inputs (rough — finalise during the day):
- Template definition (the `WorkflowDefinition` JSON returned by the fake-app backend)
- Current state name (string; may be `null` for "no state highlighted" — used on `/findings/workflow` where there's no finding context)

Behaviour:
- States as labelled rounded rectangles; approval states with a distinct border/badge.
- Initial state with entry arrow (rendered from `definition.initial`).
- Transitions as directed arrows labelled with the event name; guard icon (shield) and action icon (lightning bolt) on the arrow when present.
- Current state highlighted (filled background, Atlas semantic success/info token) when provided.
- Pan and zoom only. The "Edit" button that switches into editor mode lives on the page chrome, not in the component (per Figma).

### 5.2 Workflow editor

An interactive canvas component. Loads its data via React Query against the fake-app backend; mutates via the same.

**Loading order on open:**
1. Fetch the draft for `(orgId, objectType=findings)`. If a draft exists, load it.
2. Otherwise fetch the latest published version from the mirror; clone it into a fresh draft (in-memory until first Save).
3. If neither exists (first-ever editor open), start blank.

The status indicator and toolbar (§5.3) reflect which of these three states the editor is in.

Behaviour:
- Mounted on `/findings/workflow` in editor mode (page chrome wraps it; toolbar lives at the top of the page content).
- Free-form canvas: drag nodes, pan, zoom.
- **Double-click empty canvas** → create regular state; inline name editing opens.
- **Toolbar "Add approval state"** → creates an approval state with approver-role field; scaffolds `approve` and `decline` transitions to placeholder targets.
- **Click state** → side panel with: name, is-initial toggle, delete, (approval only) approver role.
- **Drag from state edge to another state** → creates a transition; side panel opens.
- **Click transition** → side panel with: event name (required, unique in source state), guards (multi-select, grouped "Shared" / "App-specific"), actions (multi-select), delete.
- **Delete key** → delete selected element. Initial state can't be deleted. Confirms if transitions attach.
- **Auto-layout on load**; user positions are session-only.

### 5.3 Toolbar

The toolbar reflects the two-state model: a draft is being edited, or a published version is being viewed.

| Field | Draft (no published version yet) | Draft (with published versions) | Viewing a published version |
|---|---|---|---|
| Template name | Editable | Read-only (rename in kebab) | Read-only |
| Service | Editable | Read-only | Read-only |
| Status indicator | "Draft (unsaved)" / "Draft (saved)" | "Draft (saved) — based on v{N}" | "v{N}" |
| Save | Enabled (saves draft locally) | Enabled (saves draft locally) | Disabled (read-only view) |
| Publish | Disabled until first local Save | Enabled | N/A |
| Discard draft | — | Enabled (drops the draft, returns to v{N}) | — |

There is no "Activate" button on build day (D7).

### 5.4 Save flow (local draft)

1. Validate locally: initial state is set, every transition target exists, event names unique per source state, at least one state.
2. Serialise to Workflows Service `WorkflowDefinition` shape. Display metadata goes into `_editor_metadata` on each state.
3. `PUT /workflow-templates/:templateKey/draft` on the fake-app backend, body `{ definition, name, service, basedOnVersion }`. The fake app upserts a row in the `workflow_template_drafts` table. **No call to `rc-workflows`.**
4. On success: brief inline confirmation ("Saved 3s ago"). No toast — saves are routine.

A draft is keyed by **template identity**, not version. For build day there is exactly one draft per `(orgId, objectType=findings)`. Multiple drafts per template are out of scope.

### 5.5 Publish flow

1. Validate locally (same as Save). If the draft has unsaved changes, save first.
2. Confirm modal: "Publish this draft as v{N+1}? This creates an immutable version in the Workflows Service."
3. `POST /workflow-templates/:templateKey/publish` on the fake-app backend.
4. The fake-app backend (in this exact order, see §6.1 for why):
   1. Compute `targetVersion = (highestMirroredVersion + 1)`.
   2. POST the draft to `rc-workflows` `POST /v1/orgs/{org_id}/workflow_templates` with `version = targetVersion`.
   3. **On 201:** insert the returned `(template_id, version, definition, ...)` into `workflow_templates_mirror`. This MUST happen before returning to the client.
   4. **On mirror insert success:** delete the draft row.
   5. Return 201 with the new mirrored row to the client.
5. On success: toast, toolbar switches to "viewing v{N+1}". The next time the editor opens, it loads from the mirror as the new latest version.

**Failure modes:**

- **`rc-workflows` POST fails:** mirror untouched, draft untouched. Safe — user can retry.
- **`rc-workflows` POST succeeds, mirror insert fails:** the new version exists in `rc-workflows` but the fake app doesn't know about it. **This is the dangerous case.** Returning the request as a failure is misleading (the publish *did* happen); returning it as success without a mirror row leaves the next publish to compute the wrong `highestMirroredVersion + 1` and 409. See §6.1 for the chosen strategy.
- **Mirror insert succeeds, draft delete fails:** harmless — leftover draft will be overwritten on next save, or surface as "you have a draft based on v{N+1}" on next editor open. Log and move on.

### 5.6 Canvas library

**React Flow v11** (MIT). Do not use v12+ (AGPL — incompatible with commercial SaaS). See §11 for the production migration decision.

Custom node components (designer's deliverable) use MUI primitives and Atlas tokens — do not mix React Flow's default HTML nodes with our styling.

---

## 6. Why we persist locally

The fake-app DB holds two distinct kinds of state, for two different reasons:

**1. Mirror of published templates.** The Workflows Service has no GET template endpoint, so once a template is POSTed we have no way to read it back. We mirror every published version locally so the viewer/editor can load templates by id+version. Pragmatic scaffold; long-term we should push for GETs on `rc-workflows` and drop the mirror. See §11.

**2. Drafts.** A draft is mutable working state for the editor — it lives only in the fake-app DB and never reaches `rc-workflows` until Publish. `rc-workflows` is append-only, so there's nowhere to store an in-progress edit on the service side; the consumer app has to own this. Drafts are not scaffolding — *some* notion of draft state is the right design even when the service grows GET endpoints. The fake-app schema is throwaway, but the concept persists.

### 6.1 Mirror consistency on Publish

The mirror MUST stay in lockstep with `rc-workflows` for published versions. If `rc-workflows` accepts a `POST /workflow_templates` and the mirror doesn't get the corresponding row, the fake app loses access to a version that exists on the service — and because there is no GET, we cannot recover by re-reading. The next publish will compute the wrong `highestMirroredVersion + 1` and conflict (409).

**Strategy on build day:** "POST first, mirror immediately, fail loudly."

1. The fake-app backend POSTs to `rc-workflows` first (no DB writes before this — we don't want orphan mirror rows for templates that don't exist on the service).
2. On 201, write the mirror row in the **same database transaction** that clears the draft. SQLite + `better-sqlite3` give us trivial transactions; use them. If the mirror write throws, the draft survives.
3. If the mirror write fails after a 201, we have an inconsistency. The handler logs the inconsistency loudly (template id + version that exist in `rc-workflows` but not in the mirror), and returns a **500 with a recovery hint** to the client: "Published v{N} to Workflows Service but failed to mirror. Manually insert the row, or accept a version-number gap and republish as v{N+2}."
4. There is no automatic retry, no reconciliation job, no "fetch from service" fallback. This is build-day scope.

**Why this is acceptable for build day:**
- Both processes run locally on the same laptop with no network in between. SQLite writes after a successful network call rarely fail.
- The demo path is short: open editor → make change → save → publish. If a publish fails mid-flight, restart everything and reseed.
- Production needs a real reconciliation story (idempotent publish, retry from a job queue, or just a GET endpoint on `rc-workflows`). Logged in §11.

**What we explicitly do NOT do on build day:**
- We do not derive `highestMirroredVersion` from `rc-workflows` directly (no GET).
- We do not attempt to detect drift between mirror and service at startup.
- We do not optimistically write the mirror before the POST (would create orphan rows on POST failure).

---

## 7. The fake app

**Repo:** [`dil-tkenez/build-day-workflow-editor`](https://github.com/dil-tkenez/build-day-workflow-editor.git) — currently empty. Cloned locally to `~/claude/build-day-workflow-editor/`. Standalone (no `rc-object-library` dependency). Not deployed; lives only on dev laptops.

### 7.1 Stack

- **Repo layout:** single-package repo, not a monorepo. `pnpm` for package management (consistent with the other ARC repos). Top-level `package.json` with both frontend and backend deps; Vite for the frontend, Hono for the backend, both run by the same `pnpm dev` (concurrently). One `tsconfig.json`. Keep it boring.
- **Frontend:** Vite + React 19 + TypeScript. Viewer/editor UI in `src/components/`. Uses `@mui/material` v7. Atlas design tokens are vendored as JSON files under `design-tokens/` (see §7.5) and wired into a minimal MUI `ThemeProvider` for primary colours, typography, spacing. No `@diligentcorp/atlas-design-tokens` npm dependency, no `@diligentcorp/atlas-theme-mui-lens`. Enough to look like a Diligent product without the full platform chrome.
- **Backend:** Hono, single process, **SQLite** (`better-sqlite3`). Fast to set up, no Docker needed, seed runs on startup. Single file schema in `server/db.ts` (or similar). DB file in `.data/fake-app.db`, gitignored.
- **Routing:** four routes wrapped in a static Diligent app shell — `/` (object library home), `/findings` (audit findings list), `/findings/:id` (finding detail), `/findings/workflow` (workflow viewer + editor). See §4 for visual design.
- **Atlas tokens:** vendored as JSON in `design-tokens/` (§7.5). No private npm registry auth needed.

### 7.2 Backend routes

All plain REST (no GraphQL). Called directly by the fake-app frontend.

**Object data**

- `GET /findings` — list
- `GET /findings/:id` — single finding with joined template (from mirror); includes the finding's hardcoded `current_state`

The list page consumes `GET /findings`; the detail page consumes `GET /findings/:id`. The workflow page (`/findings/workflow`) consumes the draft + capabilities + mirror routes below.

**Drafts** (local only, never hit `rc-workflows`)

- `GET /workflow-templates/:templateKey/draft` — returns the current draft for `(orgId, templateKey)`, or 404
- `PUT /workflow-templates/:templateKey/draft` — upsert the draft. Body: `{ definition, name, service, basedOnVersion }`
- `DELETE /workflow-templates/:templateKey/draft` — discard
- `POST /workflow-templates/:templateKey/publish` — promote the current draft to a new published version: validates, POSTs to `rc-workflows` with `version = highestPublished + 1`, mirrors, clears the draft. **Mirror consistency is critical here — see §6.1 for the exact ordering and failure handling.**

`templateKey` is a stable identifier for "the workflow template for findings in this org" — for build day, just the string `findings` (one per object type per org).

**Published mirror** (read-only)

- `GET /workflow-templates/:templateKey/versions` — list mirrored versions
- `GET /workflow-templates/:templateKey/versions/:version` — read one
- `GET /workflow-templates/:templateKey/latest` — convenience: returns the highest-version mirrored template for the templateKey (used by the finding detail page)

**Capabilities** (registry for the editor's guard/action picker)

- `GET /workflow-capabilities?objectType=findings`

```json
{
  "guards": [
    { "name": "is-critical", "source": "shared", "description": "Passes if finding.severity == 'critical'" },
    { "name": "is-not-critical", "source": "shared", "description": "Passes if finding.severity != 'critical'" },
    { "name": "authorised-approver", "source": "custom", "description": "Passes if the user has the approver role" }
  ],
  "actions": [
    { "name": "notify-hoa", "source": "custom", "description": "Notifies the Head of Audit" }
  ]
}
```

Static response. The `url` field has been dropped from the build-day shape since no guards run; the editor saves only `name` + `type` references into the template definition. (Production would re-add the URL.)

No guard webhook routes. No transition-firing routes. No active-workflow pointer.

### 7.3 DB schema (SQLite)

```sql
CREATE TABLE findings (
  id INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  -- The template that governs this finding's lifecycle. Resolved against
  -- workflow_templates_mirror; on first run, points at the seeded template.
  workflow_template_key TEXT NOT NULL DEFAULT 'findings',
  workflow_template_id INTEGER NOT NULL,
  workflow_template_version INTEGER NOT NULL,
  -- The finding's current state in that template. Hardcoded, not driven by
  -- rc-workflows on build day (no instance, no transition firing).
  current_state TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE workflow_templates_mirror (
  template_key TEXT NOT NULL,    -- e.g. 'findings' (one per object type per org)
  template_id INTEGER NOT NULL,  -- id returned by rc-workflows
  version INTEGER NOT NULL,
  org_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (template_id, version)
);

-- Editable drafts. At most one per (org_id, template_key) for build day.
CREATE TABLE workflow_template_drafts (
  template_key TEXT NOT NULL,
  org_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  based_on_version INTEGER,      -- null when there are no published versions yet
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, template_key)
);

```

No `active_workflows` table on build day — D7 puts Activate out of scope. When the finding detail page needs "the current template," it reads `workflow_template_id` + `workflow_template_version` directly from the finding row.

### 7.4 Startup / seed

On `pnpm dev`:

1. Create/migrate SQLite file (idempotent).
2. If the mirror is empty for `template_key = 'findings'`: POST the audit-finding template (the §4 diagram) to local `rc-workflows` as v1; write the returned `(template_id, version)` to the mirror.
3. If the `findings` table is empty: insert 3–5 findings with mixed severities and **mixed `current_state` values** matching the Figma table (final state list TBD; see pre-day checklist), each pointing at the seeded template's `(template_id, version)`. Make sure every `current_state` referenced by a finding exists in the seeded template, otherwise the viewer can't highlight it.
4. Log the seeded finding ids so the EM can open them directly.

Idempotent: re-running `pnpm dev` is safe.

### 7.5 Design tokens (vendored)

Atlas design tokens are committed to the repo as a set of JSON files under `design-tokens/` rather than pulled from the private `@diligentcorp/atlas-design-tokens` npm package. Rationale: zero registry-auth setup on build-day machines, no flaky network dependency, and the tokens we need don't change during the day.

**Layout:** one JSON file per token category (e.g. `colors.json`, `typography.json`, `spacing.json`, `semantic.json`, `palette.json`). Exact split matches the upstream Atlas package; if in doubt, mirror its export structure 1:1 so the import path can be flipped back to the npm package post-day with minimal code change.

**Source:** export from the upstream Atlas tokens package or Figma library. Pre-day task — owner: designer.

**Consumption:**
- Frontend imports tokens via a small TypeScript module (e.g. `src/theme/tokens.ts`) that loads the JSON and re-exports typed objects.
- The MUI `ThemeProvider` in `src/theme/theme.ts` reads from those exports to populate `palette`, `typography`, `spacing`, etc.
- React Flow custom nodes pull colour, border-radius, and spacing values from the same source.

**Out of scope for build day:** keeping the vendored tokens in sync with Atlas. They are a snapshot. Post-day, switch to the npm package.

---

## 8. Technology choices

- **Frontend (fake app, including viewer/editor UI):** React 19 + Vite + MUI v7. Atlas design tokens vendored as JSON in `design-tokens/` (§7.5), wired into a minimal MUI theme. No Atlas Lens.
- **Canvas:** React Flow **v11** (MIT). Custom MUI nodes only.
- **State:** TanStack React Query in the fake app.
- **Backend (fake app):** Hono + `better-sqlite3`.
- **Backend (`rc-workflows`):** unchanged, run locally.
- **Auth:** `rc-workflows` bearer whatever its local mode accepts. No guard webhook auth concerns (no guard webhooks).
- **Build/dev:** Fake app runs via `pnpm --filter fake-app dev`. Designer iterates inside the running fake app (not Storybook) — fastest feedback loop on a one-day build with throwaway code.

---

## 9. What's in and what's out

### Must-haves

1. **Static app shell** (side nav + global header) wraps every route, matching the Figma design.
2. **Object library home** at `/` renders the 3×2 grid of object-type tiles. Only "Audit findings" is interactive.
3. **Findings list page** at `/findings` renders: page header with breadcrumb + "Manage" dropdown + static "+ Add" button, static toolbar (Search / Filter / Columns), table of seeded findings matching the Figma design, static pagination footer.
4. **Finding detail page** at `/findings/:id` renders the holding-pattern layout (metadata block + viewer with `current_state` highlighted) until the parallel design lands; then swap.
5. **Workflow viewer** renders the seeded audit-finding template; `current_state` highlighted on `/findings/:id`, no highlight on `/findings/workflow`.
6. **Workflow page** at `/findings/workflow` has two modes — **viewer** (default) and **editor** — toggled by the "Edit" button per the Figma design.
7. **Workflow editor** in editor mode supports state/transition CRUD, approval states, guard/action selection from the capabilities registry. Loads from existing draft, else latest published version, else blank.
8. **Save** persists a draft to the fake-app DB (no `rc-workflows` call, idempotent across many saves).
9. **Publish** promotes the current draft to a new immutable version in `rc-workflows`, mirrored locally. The viewer mode then shows the new version on reload.

### Nice-to-haves

10. Rename template flow.
11. "Discard draft" returns the editor to viewer mode showing the latest published version.
12. Final designed layout for the per-finding detail page (Route 3) lands and is integrated.
13. Theme polish on the OL home page (the five non-interactive tiles look as good as the interactive one).

### Stretch goal: extract the editor into a reusable package

Built **separately** from the build-day demo (different branch, ideally a different day). Goal: take the visual editor (and probably the viewer alongside it) and turn it into an installable npm package — `@diligentcorp/workflow-editor` or similar — that any consumer application team can drop into their own product to give end-users a workflow editing UI.

**Shape (sketch — finalise during the spike):**

- A new package directory in this repo (e.g. `packages/workflow-editor/`) or a separate repo, depending on where this lives long-term. Builds to ESM + types.
- Public API: at minimum `<WorkflowEditor>` and `<WorkflowViewer>` components. Both **transport-agnostic** — they don't know about Hono, REST, GraphQL, or `rc-workflows`. Data and side effects come in via props:
  - `template: WorkflowDefinition` (the JSON to render/edit)
  - `currentState?: string` (viewer only)
  - `capabilities: { guards: GuardDef[]; actions: ActionDef[] }` (the registry)
  - `onSaveDraft?: (definition) => Promise<void>` (host owns persistence)
  - `onPublish?: (definition) => Promise<{ templateId: number; version: number }>` (host owns the `rc-workflows` POST and the mirror write)
  - `onClose?: () => void`
- The fake app remains as the **reference integration** showing how to wire the package up against `rc-workflows`.
- Storybook included in the package for designer iteration and consumer documentation.
- Atlas tokens stay vendored in the package on day one (for portability); switch to a peer dependency later.

**Why this is a separate stretch goal, not part of build day:**

- The build-day editor is intentionally not transport-agnostic — it calls the fake-app backend directly via `fetch`. Designing the right prop interface is its own piece of work and is much easier to do *after* we've seen what worked.
- Packaging concerns (tsup/rollup config, package.json `exports`, peer deps for React/MUI, Storybook setup, npm publishing target) are real work and would dominate build day if attempted.
- The *lessons learned* from build day — which props are actually needed, what shape the capabilities registry should take, how draft state should flow — feed directly into this package's API design.

**Open questions (to resolve when the spike starts):**

- Repo location: stay in `build-day-workflow-editor` as `packages/workflow-editor/`, move to a Diligent-owned repo, or live in `rc-object-library/packages/`? (D10 originally pointed at the Object Library — revisit with what we learn from the build.)
- Publication target: internal Diligent npm registry, GitHub Packages, or unpublished workspace dep on day one?
- Who owns the package long-term? The same triad that built it, or hand off to a platform team?

### Out of scope (deferred)

**Out of scope for build day (deliberately, to keep focus on viewer + editor):**

- Firing transitions through `rc-workflows`.
- Workflow instance creation / lifecycle.
- Guard webhook endpoints in the fake app (no IAM auth, no callback handling).
- Action event handlers (no `StateTransitionEventAcceptedEvent:1` handling, no event infrastructure).
- Activate flow / active-workflow pointer.
- Instance migration on template changes.

**Out of scope for the foreseeable future (broader product roadmap):**

- The Object Library plugin (post-day task once components stabilise).
- Real list/browse UI capabilities (filtering, sorting, pagination, search) — the build-day list page is intentionally minimal, just enough to be a credible host for the "Manage workflow" entry point.
- OOTB template protection / locking.
- Template versioning history browser.
- Multiple workflows per object based on conditions.
- Comments per workflow step.
- Per-stage RBAC.
- Triggers (external API, robots, ServiceNow).
- Event schema editor on transitions.
- Persisted node layout across sessions.
- A second object type plugin.

---

## 10. Open questions and pre-day checklist

### Open questions

| # | Question | Needed by | Impact |
|---|---|---|---|
| Q1 | What does local `rc-workflows` expect for bearer auth in dev mode? (Any token? Hardcoded? Disabled?) | **Pre-day** | Every fake-app → `rc-workflows` call fails without this. |
| Q2 | What org id does the demo run under? | **Pre-day** | Every API call needs it. |
| Q3 | ~~Does local `rc-workflows` correctly call back to `http://localhost` guard URLs?~~ **Moot.** No guard webhooks on build day. | — | — |
| Q4 | ~~Where should the fake app live?~~ **Resolved.** Standalone repo at [`dil-tkenez/build-day-workflow-editor`](https://github.com/dil-tkenez/build-day-workflow-editor.git). | — | — |
| Q9 | ~~Does `@diligentcorp/atlas-design-tokens` require private npm registry auth?~~ **Resolved.** Tokens vendored as JSON in `design-tokens/` (§7.5) — no npm dependency. | — | — |
| Q5 | Layout/position persistence — `_editor_metadata`, separate table, or ephemeral? | Post-day | Not blocking. |
| Q6 | React Flow licensing path to production — xyflow commercial vs Reaflow migration? | Post-day | Not blocking. |
| Q7 | Does `activate` belong in `rc-workflows` long-term or stay in consumer apps? (Out of scope for build day.) | Post-day | Not blocking. |
| Q8 | When and how do we extract the viewer/editor UI into reusable `packages/ui/` components, and who owns that? | Post-day | Not blocking. |

### Pre-day checklist

- [ ] Q1 answered. Local `rc-workflows` auth confirmed.
- [ ] Q2 answered. Demo org id written down.
- [ ] `rc-workflows` runs locally end-to-end (`pnpm dev` up, OpenAPI doc reachable, a hand-rolled `POST /workflow_templates` succeeds).
- [ ] [`build-day-workflow-editor`](https://github.com/dil-tkenez/build-day-workflow-editor.git) cloned to `~/claude/build-day-workflow-editor/` on each laptop.
- [ ] Atlas design tokens exported from the upstream package or Figma library and committed to `design-tokens/` (designer owns).
- [ ] Side-nav and header icon assets exported from Figma into `src/assets/` (designer owns). Includes the Diligent wordmark, side-nav icons, header icons.
- [ ] Status pill palette confirmed: which states map to which Atlas semantic colour tokens? (Look at the Figma list-page screenshot.)
- [ ] Final list of seeded finding statuses confirmed (depends on the previous item).
- [ ] Fake-app scaffold committed to `main`: Vite + Hono skeleton, MUI theme wired to vendored tokens, SQLite migration with `findings` + `workflow_templates_mirror` + `workflow_template_drafts` tables, one "hello finding" page rendering. README explains how to run.
- [ ] Workflow-viewer skeleton inside the fake app rendering a hardcoded template (proves React Flow + MUI nodes wire up).
- [ ] [Workflows Service Integration Guide](https://diligentbrands.atlassian.net/wiki/spaces/RCP/pages/5944999960/Workflows+Service+-+Integration+Guide) skimmed by the EM (just enough to understand the `POST /workflow_templates` request shape — we're not implementing the consumer-side runtime).
- [ ] [Figma file](https://www.figma.com/design/cpG5xikx8UYQ5Vk9vavwef/2026-05-06-AI-build-day-proto?node-id=1-36567) opened by everyone on the team.

---

## 11. The scaffolding we are knowingly taking on

These will come back to bite us if we don't name them now.

- **The fake app itself** (§7). Throwaway. Real home for this UI is a `rc-object-library` plugin via `ObjectTypeConfigType`, federated GraphQL, Atlas Lens theme.
- **Static app chrome** (§4). Side nav + global header are hand-built static visuals. None of the chrome's affordances work (org switcher doesn't switch, side nav items don't navigate, "Add object" / "+ Add" buttons do nothing). Production replaces this with the real `atlas-theme-mui-lens` shell that Object Library uses.
- **Parallel detail-page design** (D15). Detail page ships in a holding-pattern layout; final design lands during the build. Risk: the swap is more disruptive than expected. Mitigation: keep the viewer integration on the detail page identical across both layouts.
- **Viewer/editor UI inside the fake app** (§5, D10). Not extracted, not in `packages/ui/`, not following the production component convention. The post-day task is to extract them into reusable components with a stable API surface, transport-agnostic data props, and Storybook stories. We expect the right shape to be clearer after seeing what worked on build day.
- **Local template mirror** (§6). Push for GETs in `rc-workflows`; remove the mirror.
- **Mirror reconciliation** (§6.1). On build day, a mirror write that fails after a successful `rc-workflows` POST creates an inconsistency we can only recover from manually. Production needs idempotent publish (e.g. POST returning the existing row on duplicate version) plus a startup reconciliation step, or a GET endpoint on `rc-workflows` so the mirror can be rebuilt.
- **Hardcoded `current_state` on findings** (§4, §7.3). On build day, the finding's state is just a string in the DB — no instance, no transitions. The viewer renders it accurately, but no state changes are possible. Real consumer apps will get `current_state` by tracking instance state from `rc-workflows`.
- **No transition firing or guard runtime** (D8, D12, §9 out-of-scope). The whole consumer-side runtime — guard webhooks with IAM auth, action event handlers — is untouched. This is a deliberate scope cut, but it means the build day does not validate that the runtime integration works. Plan a separate spike for that.
- **React Flow v11** (§5.6). Before any production ship, choose: xyflow commercial license for v12, or migrate to Reaflow (MIT). Do not decide on build day.
- **`_editor_metadata` in JSONB** (§5.1, §5.2). Pragmatic but a precedent; promote to first-class schema fields in the next iteration.
- **No Activate concept** (D7, Q7). Where Activate lives long-term is unresolved — and we won't learn anything about it on build day. Decide post-day.

---

## 12. How the day runs

### One stream, sequential build

We build sequentially in a single stream. Reasons: the codebase is small, the must-haves form a clean dependency chain (backend → viewer → editor → save → publish), and parallel work introduces coordination overhead and merge friction we don't need on a one-day prototype. Parallelisation is something we can revisit if a future iteration outgrows the single-track approach.

**Build order:**

1. **Smoke check.** Verify the pre-day scaffold runs end-to-end (vendored tokens loading, MUI theme rendering). Bring up local `rc-workflows`; hand-rolled `curl` POST of a template succeeds. **Gating — do not build UI on top of a broken path.**
2. **Seed.** Create SQLite DB, POST the demo template to local `rc-workflows`, mirror it, insert 3–5 findings with hardcoded `current_state` values matching the Figma table look.
3. **Backend reads.** `GET /findings` (list) and `GET /findings/:id` (detail) return finding rows + joined template (from mirror) + `current_state`. Confirm with `curl`.
4. **App shell.** Static side nav + global header per Figma, wraps every route. Render once and reuse via a layout component. No interactions on chrome.
5. **`/` Object library home.** Six tiles in a 3×2 grid. Hardcoded counts + dummy timestamps. Only "Audit findings" tile is interactive (links to `/findings`); the other five are static.
6. **`/findings` list page.** Page header (breadcrumb + title + "Manage" dropdown + static "+ Add"), static toolbar (Search/Filter/Columns), table driven by real data, static pagination footer. "Manage" → "Edit workflow" navigates to `/findings/workflow`. Row click → `/findings/:id`. **First must-have demoable.**
7. **`/findings/:id` detail page (holding pattern).** Page header with breadcrumb + back arrow + finding title; metadata block (severity, current state badge, owner, approver); placeholder space for the viewer. Wire "Manage workflow" or its equivalent to `/findings/workflow` for now. Final design swaps in when it lands (parallel with the build).
8. **Workflow viewer.** React Flow canvas with regular-state node, approval-state node, transition arrow with guard/action icons. Renders the seeded template, accepts an optional `currentState` prop for highlighting.
9. **Mount viewer on `/findings/:id`** (with `currentState` highlighted) and on `/findings/workflow` in viewer mode (no highlight). **Second must-have demoable.**
10. **`/findings/workflow` editor mode.** "Edit" button toggles into editor mode. Editor canvas: state CRUD, transition CRUD, side panels (state config, transition config, guard/action selector grouped Shared / App-specific), toolbar (Save, Publish, version chip, kebab menu).
11. **Save flow:** PUT draft to fake-app DB.
12. **Publish flow:** POST to `rc-workflows`, write mirror in same SQLite tx as draft clear (§6.1). On success, return to viewer mode showing the new version. **Centrepiece.**
13. **Polish pass.** Typography scale, primary colours, spacing alignment with Figma, status pill colours, table-row hover, small interactions.
14. **Demo script + dry run** (see below).

### Checkpoints

After each numbered step, check that everything earlier still works (run the full path: home → list → detail → workflow viewer → editor) before moving on. Cheap insurance.

| Step | What "done" looks like |
|---|---|
| 1 | `curl` POST to local `rc-workflows` returns 201; fake-app `pnpm dev` brings up both Vite and Hono. |
| 3 | `curl localhost:<port>/findings/:id` returns expected JSON with template + current_state. |
| 4 | App shell renders on every route at the right size and position. |
| 5 | `/` shows the tile grid; only Audit findings is clickable. |
| 6 | **First demoable.** List page matches Figma; "Manage → Edit workflow" routes; row click routes. |
| 7 | Detail page renders for any seeded finding id. |
| 9 | **Second demoable.** Viewer renders on both `/findings/:id` (highlighted) and `/findings/workflow` (no highlight). |
| 10 | "Edit" button on `/findings/workflow` flips to editor mode; full CRUD + side panels work. |
| 12 | **Centrepiece.** Edit → Save (draft persists) → Publish (new version in `rc-workflows`, mirrored) → reload `/findings/workflow` shows new version in viewer mode. |
| 14 | Demo script runs cleanly end-to-end without surprises. |

### Demo script (write before step 14; run after step 12)

Land on `/` (Object library home) → click the Audit findings tile → land on `/findings` → see seeded findings in the table with their statuses → click a finding row → land on `/findings/:id`, viewer below shows the template with the finding's status highlighted → breadcrumb back to list → click "Manage" → "Edit workflow" → land on `/findings/workflow` in viewer mode → click "Edit" → editor mode → add an approval state, attach a guard → Save (draft) → Save again (still draft) → Publish → page returns to viewer mode showing the new version → breadcrumb back to list.

### Triage rules if time runs short

Drop in this order:

1. Polish pass (step 13).
2. OL home polish — let the five non-interactive tiles render plainly.
3. Rename flow (sub-feature of step 10).
4. Discard draft (sub-feature of step 10).
5. List page table polish — drop wider columns, keep ID / Name / Severity / Status.
6. Detail page (step 7) — fall back to a minimal "back link + viewer" layout if the holding-pattern design feels expensive. The viewer must still render.
7. Publish (step 12) — editor + Save still work; drafts persist; we just can't demo a new version landing in `rc-workflows`.
8. Save (step 11) — editor edits live in memory only.

**Never drop:**
- The static app shell.
- `/` Object library home with at least the Audit findings tile clickable.
- `/findings` list page with the "Manage → Edit workflow" entry point.
- `/findings/workflow` rendering the viewer in viewer mode and switching into the editor.
- The viewer rendering a real template from the mirror.

Those are the demo.
