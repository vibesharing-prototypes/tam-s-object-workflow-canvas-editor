import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? ".data/fake-app.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS findings (
      id INTEGER PRIMARY KEY,
      org_id INTEGER NOT NULL,
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      workflow_template_key TEXT NOT NULL DEFAULT 'findings',
      workflow_template_id INTEGER,
      workflow_template_version INTEGER,
      current_state TEXT NOT NULL,
      owner_name TEXT,
      owner_initials TEXT,
      approver_name TEXT,
      approver_initials TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflow_templates_mirror (
      template_key TEXT NOT NULL,
      template_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      service TEXT NOT NULL,
      definition_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (template_id, version)
    );

    CREATE TABLE IF NOT EXISTS workflow_template_drafts (
      template_key TEXT NOT NULL,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      service TEXT NOT NULL,
      definition_json TEXT NOT NULL,
      based_on_version INTEGER,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (org_id, template_key)
    );

    DROP TABLE IF EXISTS active_workflows;
  `);
}
