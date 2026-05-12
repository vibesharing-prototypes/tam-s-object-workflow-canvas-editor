import { Hono } from "hono";
import { db } from "../db.js";
import { ORG_ID } from "../rc-workflows.js";

interface FindingRow {
  id: number;
  external_id: string;
  title: string;
  severity: string;
  workflow_template_key: string;
  workflow_template_id: number;
  workflow_template_version: number;
  current_state: string;
  owner_name: string | null;
  owner_initials: string | null;
  approver_name: string | null;
  approver_initials: string | null;
  created_at: string;
}

interface MirrorRow {
  definition_json: string;
  name: string;
  service: string;
}

export const findingsRouter = new Hono();

findingsRouter.get("/findings", (c) => {
  const rows = db
    .prepare(
      `SELECT * FROM findings WHERE org_id = ? ORDER BY id ASC`,
    )
    .all(ORG_ID) as FindingRow[];
  return c.json({ data: rows.map(rowToDto) });
});

findingsRouter.get("/findings/:id", (c) => {
  const id = Number(c.req.param("id"));
  const row = db
    .prepare(`SELECT * FROM findings WHERE id = ? AND org_id = ?`)
    .get(id, ORG_ID) as FindingRow | undefined;
  if (!row) return c.json({ error: "not found" }, 404);

  const mirror = db
    .prepare(
      `SELECT definition_json, name, service FROM workflow_templates_mirror
       WHERE template_id = ? AND version = ?`,
    )
    .get(row.workflow_template_id, row.workflow_template_version) as
    | MirrorRow
    | undefined;

  return c.json({
    data: {
      ...rowToDto(row),
      template: mirror
        ? {
            id: row.workflow_template_id,
            version: row.workflow_template_version,
            name: mirror.name,
            service: mirror.service,
            definition: JSON.parse(mirror.definition_json),
          }
        : null,
    },
  });
});

function rowToDto(row: FindingRow) {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    severity: row.severity,
    currentState: row.current_state,
    owner: row.owner_name
      ? { name: row.owner_name, initials: row.owner_initials ?? "" }
      : null,
    approver: row.approver_name
      ? { name: row.approver_name, initials: row.approver_initials ?? "" }
      : null,
    workflow: {
      templateKey: row.workflow_template_key,
      templateId: row.workflow_template_id,
      templateVersion: row.workflow_template_version,
    },
  };
}
