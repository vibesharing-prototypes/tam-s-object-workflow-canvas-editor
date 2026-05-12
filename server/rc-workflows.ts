/**
 * Thin client for the locally-running rc-workflows service.
 *
 * Build day uses only one endpoint: POST /v1/orgs/:org_id/workflow_templates.
 */

const BASE_URL = process.env.RC_WORKFLOWS_URL ?? "http://localhost:3000";
const BEARER = process.env.RC_WORKFLOWS_BEARER ?? "dev-token";

export const ORG_ID = Number(process.env.RC_WORKFLOWS_ORG_ID ?? 12345);

export interface WorkflowDefinition {
  initial: string;
  states: Record<string, WorkflowState>;
}

export type ParamValue = string | string[];

export type StateCategory = "static" | "progressing" | "waiting" | "completed";

export interface WorkflowState {
  on?: Record<string, WorkflowTransition>;
  _editor_metadata?: {
    position?: { x: number; y: number };
    locked?: boolean;
    label?: string;
    category?: StateCategory;
  };
}

export interface GuardInstance {
  name: string;
  type: "custom_webhook";
  url?: string;
  params?: Record<string, ParamValue>;
}

export interface ActionInstance {
  name: string;
  type: "custom";
  params?: Record<string, ParamValue>;
}

export interface WorkflowTransition {
  target: string;
  guards?: GuardInstance[];
  actions?: ActionInstance[];
  _editor_metadata?: {
    label?: string;
    label_offset?: { x: number; y: number };
  };
}

export interface CreateTemplatePayload {
  name: string;
  service: string;
  version: number;
  definition: WorkflowDefinition;
}

export interface CreatedTemplate {
  id: number;
  version: number;
  name: string;
  service: string;
  definition: WorkflowDefinition;
}

export async function createWorkflowTemplate(
  payload: CreateTemplatePayload,
): Promise<CreatedTemplate> {
  const res = await fetch(`${BASE_URL}/v1/orgs/${ORG_ID}/workflow_templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEARER}`,
    },
    body: JSON.stringify({
      data: {
        type: "workflow_templates",
        attributes: payload,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`rc-workflows POST failed: ${res.status} ${text}`);
  }

  type Attrs = Partial<CreatedTemplate> & { version?: number | string };
  const json = (await res.json()) as {
    id?: string | number;
    attributes?: Attrs;
    data?: { id?: string | number; attributes?: Attrs };
  } & Partial<CreatedTemplate>;

  // rc-workflows can return either:
  //   { id, type, attributes: { name, service, version, definition, ... } }
  // or
  //   { data: { id, type, attributes: { ... } } }
  let resourceId: string | number | undefined;
  let attrs: Attrs | undefined;
  if (json.attributes) {
    resourceId = json.id;
    attrs = json.attributes;
  } else if (json.data?.attributes) {
    resourceId = json.data.id;
    attrs = json.data.attributes;
  }

  let result: Partial<CreatedTemplate>;
  if (attrs) {
    result = {
      ...attrs,
      id: Number(resourceId),
      version: Number(attrs.version),
    };
  } else {
    result = json as Partial<CreatedTemplate>;
  }

  if (
    !Number.isFinite(result.id) ||
    !Number.isFinite(result.version) ||
    !result.definition ||
    !result.name ||
    !result.service
  ) {
    throw new Error(
      `rc-workflows returned an unexpected response shape: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }

  return result as CreatedTemplate;
}

export async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/doc`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
