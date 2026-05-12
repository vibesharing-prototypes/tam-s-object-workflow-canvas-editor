export interface WorkflowDefinition {
  initial: string;
  states: Record<string, WorkflowState>;
}

/**
 * Category drives the state's pill color on the canvas. Static = gray,
 * Progressing = blue, Waiting = yellow, Completed = green. Stored as
 * lowercase strings so they survive a round-trip through rc-workflows.
 */
export type StateCategory =
  | "static"
  | "progressing"
  | "waiting"
  | "completed";

export interface WorkflowState {
  on?: Record<string, WorkflowTransition>;
  _editor_metadata?: {
    position?: { x: number; y: number };
    /**
     * OOTB-locked: a state shipped as part of a packaged template that
     * end users cannot rename or delete. Not user-settable from the UI.
     */
    locked?: boolean;
    /**
     * Human-readable label for the state. Decoupled from the slug id so
     * users can rename freely without changing the underlying key.
     */
    label?: string;
    /** Visual category for the state (drives pill color). */
    category?: StateCategory;
  };
}

export interface WorkflowTransitionMetadata {
  /** Human-readable label for the transition (e.g. "Approve"). */
  label?: string;
  /**
   * User-positioned offset for the transition's label, in canvas
   * coordinates. Relative to the edge's natural midpoint. Lets users
   * drag labels off overlapping edges.
   */
  label_offset?: { x: number; y: number };
}

// Parameter values: string for single-valued params, string[] when
// the param spec declares multiple: true.
export type ParamValue = string | string[];
export type ActionParamValue = ParamValue; // backwards-compat alias

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
  _editor_metadata?: WorkflowTransitionMetadata;
}

export interface MirrorTemplate {
  templateId: number;
  version: number;
  name: string;
  service: string;
  definition: WorkflowDefinition;
  createdAt?: string;
}

export interface DraftTemplate {
  templateKey: string;
  name: string;
  service: string;
  basedOnVersion: number | null;
  definition: WorkflowDefinition;
  updatedAt: string;
}

export interface Finding {
  id: number;
  externalId: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  currentState: string;
  owner: { name: string; initials: string } | null;
  approver: { name: string; initials: string } | null;
  workflow: {
    templateKey: string;
    templateId: number;
    templateVersion: number;
  };
}

export interface FindingDetail extends Finding {
  template: MirrorTemplate | null;
}

export interface ParamSpec {
  name: string;
  label: string;
  type: "string"; // build day: string only; later: number, boolean, ref…
  required?: boolean;
  multiple?: boolean;
  placeholder?: string;
}
// Backwards-compat alias.
export type ActionParamSpec = ParamSpec;

export interface GuardSpec {
  name: string;
  source: "shared" | "custom";
  description: string;
  params?: ParamSpec[];
}

export interface ActionSpec {
  name: string;
  source: "shared" | "custom";
  description: string;
  params?: ParamSpec[];
}

export interface Capabilities {
  guards: GuardSpec[];
  actions: ActionSpec[];
}
