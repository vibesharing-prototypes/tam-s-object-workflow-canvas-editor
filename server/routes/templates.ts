import { Hono } from "hono";
import { db } from "../db.js";
import { ORG_ID, createWorkflowTemplate } from "../rc-workflows.js";
import type { WorkflowDefinition } from "../rc-workflows.js";

export const templatesRouter = new Hono();

interface DraftBody {
  definition: WorkflowDefinition;
  name: string;
  service: string;
  basedOnVersion: number | null;
}

interface MirrorRow {
  template_id: number;
  version: number;
  name: string;
  service: string;
  definition_json: string;
  created_at: string;
}

interface DraftRow {
  template_key: string;
  org_id: number;
  name: string;
  service: string;
  definition_json: string;
  based_on_version: number | null;
  updated_at: string;
}

// ---- Draft ----

templatesRouter.get("/workflow-templates/:key/draft", (c) => {
  const key = c.req.param("key");
  const row = db
    .prepare(
      `SELECT * FROM workflow_template_drafts WHERE template_key = ? AND org_id = ?`,
    )
    .get(key, ORG_ID) as DraftRow | undefined;
  if (!row) return c.json({ error: "no draft" }, 404);
  return c.json({
    data: {
      templateKey: row.template_key,
      name: row.name,
      service: row.service,
      basedOnVersion: row.based_on_version,
      definition: JSON.parse(row.definition_json),
      updatedAt: row.updated_at,
    },
  });
});

templatesRouter.put("/workflow-templates/:key/draft", async (c) => {
  const key = c.req.param("key");
  const body = (await c.req.json()) as DraftBody;
  if (!body.definition || !body.name || !body.service) {
    return c.json({ error: "missing fields" }, 400);
  }

  db.prepare(
    `INSERT INTO workflow_template_drafts
       (template_key, org_id, name, service, definition_json, based_on_version, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (org_id, template_key) DO UPDATE SET
       name = excluded.name,
       service = excluded.service,
       definition_json = excluded.definition_json,
       based_on_version = excluded.based_on_version,
       updated_at = datetime('now')`,
  ).run(
    key,
    ORG_ID,
    body.name,
    body.service,
    JSON.stringify(body.definition),
    body.basedOnVersion,
  );

  return c.json({ ok: true });
});

templatesRouter.delete("/workflow-templates/:key/draft", (c) => {
  const key = c.req.param("key");
  db.prepare(
    `DELETE FROM workflow_template_drafts WHERE template_key = ? AND org_id = ?`,
  ).run(key, ORG_ID);
  return c.json({ ok: true });
});

// ---- Mirror (read-only published) ----

templatesRouter.get("/workflow-templates/:key/versions", (c) => {
  const key = c.req.param("key");
  const rows = db
    .prepare(
      `SELECT * FROM workflow_templates_mirror WHERE template_key = ? AND org_id = ?
       ORDER BY version DESC`,
    )
    .all(key, ORG_ID) as MirrorRow[];
  return c.json({ data: rows.map(mirrorRowToDto) });
});

templatesRouter.get("/workflow-templates/:key/latest", (c) => {
  const key = c.req.param("key");
  const row = db
    .prepare(
      `SELECT * FROM workflow_templates_mirror WHERE template_key = ? AND org_id = ?
       ORDER BY version DESC LIMIT 1`,
    )
    .get(key, ORG_ID) as MirrorRow | undefined;
  if (!row) return c.json({ error: "no version" }, 404);
  return c.json({ data: mirrorRowToDto(row) });
});

templatesRouter.get(
  "/workflow-templates/:key/versions/:version",
  (c) => {
    const key = c.req.param("key");
    const version = Number(c.req.param("version"));
    const row = db
      .prepare(
        `SELECT * FROM workflow_templates_mirror WHERE template_key = ? AND org_id = ? AND version = ?`,
      )
      .get(key, ORG_ID, version) as MirrorRow | undefined;
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json({ data: mirrorRowToDto(row) });
  },
);

// ---- Publish ----

templatesRouter.post(
  "/workflow-templates/:key/publish",
  async (c) => {
    const key = c.req.param("key");

    const draft = db
      .prepare(
        `SELECT * FROM workflow_template_drafts WHERE template_key = ? AND org_id = ?`,
      )
      .get(key, ORG_ID) as DraftRow | undefined;
    if (!draft) return c.json({ error: "no draft to publish" }, 400);

    const definition = JSON.parse(draft.definition_json) as WorkflowDefinition;
    const result = await publishNewVersion(key, {
      name: draft.name,
      service: draft.service,
      definition,
    });
    if (!result.ok) return c.json(result.body, result.status);

    db.prepare(
      `DELETE FROM workflow_template_drafts WHERE template_key = ? AND org_id = ?`,
    ).run(key, ORG_ID);

    return c.json({ data: result.dto });
  },
);

// ---- Revert ----
// Republishes an older version's definition as a new latest version.
templatesRouter.post(
  "/workflow-templates/:key/versions/:version/revert",
  async (c) => {
    const key = c.req.param("key");
    const version = Number(c.req.param("version"));

    const source = db
      .prepare(
        `SELECT * FROM workflow_templates_mirror
         WHERE template_key = ? AND org_id = ? AND version = ?`,
      )
      .get(key, ORG_ID, version) as MirrorRow | undefined;
    if (!source) return c.json({ error: "version not found" }, 404);

    const definition = JSON.parse(source.definition_json) as WorkflowDefinition;
    const result = await publishNewVersion(key, {
      name: source.name,
      service: source.service,
      definition,
    });
    if (!result.ok) return c.json(result.body, result.status);

    // Reverting blows away any in-progress draft, since the editor must
    // always start from the latest version going forward.
    db.prepare(
      `DELETE FROM workflow_template_drafts WHERE template_key = ? AND org_id = ?`,
    ).run(key, ORG_ID);

    return c.json({ data: result.dto });
  },
);

interface PublishInput {
  name: string;
  service: string;
  definition: WorkflowDefinition;
}

type PublishResult =
  | {
      ok: true;
      dto: ReturnType<typeof mirrorRowToDto> & { templateKey: string };
    }
  | { ok: false; status: 500 | 502; body: Record<string, unknown> };

async function publishNewVersion(
  key: string,
  input: PublishInput,
): Promise<PublishResult> {
  const highest = db
    .prepare(
      `SELECT MAX(version) AS v FROM workflow_templates_mirror
       WHERE template_key = ? AND org_id = ?`,
    )
    .get(key, ORG_ID) as { v: number | null };
  const targetVersion = (highest.v ?? 0) + 1;

  let created;
  try {
    created = await createWorkflowTemplate({
      name: input.name,
      service: input.service,
      version: targetVersion,
      definition: input.definition,
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      body: {
        error: "rc-workflows POST failed",
        detail: (err as Error).message,
      },
    };
  }

  const definitionJson = JSON.stringify(input.definition);
  try {
    db.prepare(
      `INSERT INTO workflow_templates_mirror
         (template_key, template_id, version, org_id, name, service, definition_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      key,
      created.id,
      created.version,
      ORG_ID,
      created.name,
      created.service,
      definitionJson,
    );
  } catch (err) {
    console.error(
      `[publish] MIRROR INCONSISTENCY: rc-workflows accepted v${targetVersion} (id=${created.id}) but mirror write failed:`,
      err,
    );
    return {
      ok: false,
      status: 500,
      body: {
        error: "mirror inconsistency",
        detail: `Published v${created.version} to rc-workflows but failed to mirror locally. Manual recovery needed.`,
        rcWorkflows: { id: created.id, version: created.version },
      },
    };
  }

  const row = db
    .prepare(
      `SELECT * FROM workflow_templates_mirror
       WHERE template_id = ? AND version = ?`,
    )
    .get(created.id, created.version) as MirrorRow;

  return {
    ok: true,
    dto: { ...mirrorRowToDto(row), templateKey: key },
  };
}

function mirrorRowToDto(row: MirrorRow) {
  return {
    templateId: row.template_id,
    version: row.version,
    name: row.name,
    service: row.service,
    definition: JSON.parse(row.definition_json),
    createdAt: row.created_at,
  };
}
