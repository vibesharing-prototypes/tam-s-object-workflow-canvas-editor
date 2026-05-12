import { db } from "./db.js";
import {
  ORG_ID,
  createWorkflowTemplate,
  isReachable,
} from "./rc-workflows.js";
import {
  SEED_TEMPLATE_DEFINITION,
  SEED_TEMPLATE_NAME,
  SEED_TEMPLATE_SERVICE,
  SEEDED_FINDINGS,
} from "./seed-template.js";

const TEMPLATE_KEY = "findings";

export async function seedIfEmpty(): Promise<void> {
  // Mirror seed
  const mirrorRow = db
    .prepare(
      `SELECT template_id, version FROM workflow_templates_mirror
       WHERE template_key = ? AND org_id = ?
       ORDER BY version DESC LIMIT 1`,
    )
    .get(TEMPLATE_KEY, ORG_ID) as
    | { template_id: number; version: number }
    | undefined;

  let templateId = mirrorRow?.template_id;
  let templateVersion = mirrorRow?.version;

  if (!mirrorRow) {
    const reachable = await isReachable();
    if (reachable) {
      // rc-workflows is append-only with no GET. If we've POSTed before in a
      // previous run that wiped only the local DB, the (name, service, v) is
      // already taken and we'll get 409. Walk versions up until one sticks
      // (cap at 50 to avoid runaway loops).
      for (let attempt = 1; attempt <= 50; attempt++) {
        try {
          const created = await createWorkflowTemplate({
            name: SEED_TEMPLATE_NAME,
            service: SEED_TEMPLATE_SERVICE,
            version: attempt,
            definition: SEED_TEMPLATE_DEFINITION,
          });
          // Mirror the *source* definition (with _editor_metadata) rather
          // than what rc-workflows echoes back — the service strips
          // _editor_metadata on its way through.
          db.prepare(
            `INSERT INTO workflow_templates_mirror
               (template_key, template_id, version, org_id, name, service, definition_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            TEMPLATE_KEY,
            created.id,
            created.version,
            ORG_ID,
            created.name,
            created.service,
            JSON.stringify(SEED_TEMPLATE_DEFINITION),
          );
          templateId = created.id;
          templateVersion = created.version;
          console.log(
            `[seed] created template via rc-workflows (id=${created.id} v${created.version})`,
          );
          break;
        } catch (err) {
          const message = (err as Error).message;
          if (message.includes("409") && attempt < 50) {
            continue; // already exists, try next version
          }
          console.warn(
            `[seed] rc-workflows POST failed; using local-only template. Err: ${message}`,
          );
          break;
        }
      }
    } else {
      console.warn(
        "[seed] rc-workflows not reachable; using local-only template (Publish will fail)",
      );
    }

    if (templateId === undefined || templateVersion === undefined) {
      // Local-only fallback so the demo still runs.
      const placeholderId = -1;
      db.prepare(
        `INSERT OR IGNORE INTO workflow_templates_mirror
           (template_key, template_id, version, org_id, name, service, definition_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        TEMPLATE_KEY,
        placeholderId,
        1,
        ORG_ID,
        SEED_TEMPLATE_NAME,
        SEED_TEMPLATE_SERVICE,
        JSON.stringify(SEED_TEMPLATE_DEFINITION),
      );
      templateId = placeholderId;
      templateVersion = 1;
    }
  }

  // Findings seed
  const count = (
    db.prepare("SELECT COUNT(*) AS n FROM findings").get() as { n: number }
  ).n;

  if (count === 0 && templateId !== undefined && templateVersion !== undefined) {
    const insert = db.prepare(
      `INSERT INTO findings (
         org_id, external_id, title, severity,
         workflow_template_key, workflow_template_id, workflow_template_version,
         current_state, owner_name, owner_initials, approver_name, approver_initials
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const tx = db.transaction(() => {
      for (const f of SEEDED_FINDINGS) {
        insert.run(
          ORG_ID,
          f.external_id,
          f.title,
          f.severity,
          TEMPLATE_KEY,
          templateId,
          templateVersion,
          f.current_state,
          f.owner_name,
          f.owner_initials,
          f.approver_name,
          f.approver_initials,
        );
      }
    });
    tx();
    console.log(`[seed] inserted ${SEEDED_FINDINGS.length} findings`);
  }
}
