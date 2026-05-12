import type {
  ActionInstance,
  GuardInstance,
  ParamValue,
  StateCategory,
  WorkflowDefinition,
} from "@/api/types";

export type { StateCategory } from "@/api/types";

export interface CanvasState {
  id: string;
  label: string;
  isInitial: boolean;
  /**
   * Locked states are OOTB and cannot be renamed or deleted by users.
   * The flag is preserved on round-trip (read in `definitionToModel`,
   * written in `modelToDefinition`); the editor UI never sets it.
   */
  locked: boolean;
  /** Visual category for the state (drives pill color). */
  category: StateCategory;
  position: { x: number; y: number };
  isCurrent?: boolean;
}

export interface CanvasGuard {
  name: string;
  params: Record<string, ParamValue>;
}

export interface CanvasAction {
  name: string;
  params: Record<string, ParamValue>;
}

export interface CanvasTransition {
  id: string;
  source: string;
  target: string;
  /** Stable, slug-shaped key — kept verbatim through publish so existing
   * findings tracking the event don't break. */
  event: string;
  /** Human-readable label shown on the canvas and in the sidesheet. */
  label: string;
  /** User-positioned offset for the label, applied on top of the edge's
   * natural midpoint. */
  labelOffset?: { x: number; y: number };
  guards: CanvasGuard[];
  actions: CanvasAction[];
}

export interface CanvasModel {
  states: CanvasState[];
  transitions: CanvasTransition[];
}

export function definitionToModel(
  def: WorkflowDefinition,
  currentState?: string,
): CanvasModel {
  const states: CanvasState[] = Object.entries(def.states).map(
    ([id, raw]) => ({
      id,
      label: raw._editor_metadata?.label ?? humanise(id),
      isInitial: id === def.initial,
      locked: raw._editor_metadata?.locked === true,
      category: raw._editor_metadata?.category ?? "static",
      position: raw._editor_metadata?.position ?? { x: 0, y: 0 },
      isCurrent: id === currentState,
    }),
  );

  const transitions: CanvasTransition[] = [];
  for (const [sourceId, state] of Object.entries(def.states)) {
    for (const [event, t] of Object.entries(state.on ?? {})) {
      transitions.push({
        id: `${sourceId}--${event}--${t.target}`,
        source: sourceId,
        target: t.target,
        event,
        label: t._editor_metadata?.label ?? humanise(event),
        labelOffset: t._editor_metadata?.label_offset,
        guards: (t.guards ?? []).map((g) => ({
          name: g.name,
          params: g.params ?? {},
        })),
        actions: (t.actions ?? []).map((a) => ({
          name: a.name,
          params: a.params ?? {},
        })),
      });
    }
  }

  return { states, transitions };
}

export function modelToDefinition(model: CanvasModel): WorkflowDefinition {
  const initial =
    model.states.find((s) => s.isInitial)?.id ?? model.states[0]?.id ?? "draft";
  const states: WorkflowDefinition["states"] = {};
  for (const s of model.states) {
    const meta: {
      position: { x: number; y: number };
      locked?: boolean;
      label?: string;
      category?: StateCategory;
    } = {
      position: s.position,
      label: s.label,
      category: s.category,
    };
    if (s.locked) meta.locked = true;
    states[s.id] = { _editor_metadata: meta };
    const transitionsFromHere = model.transitions.filter(
      (t) => t.source === s.id,
    );
    if (transitionsFromHere.length > 0) {
      states[s.id].on = {};
      for (const t of transitionsFromHere) {
        states[s.id].on![t.event] = {
          target: t.target,
          _editor_metadata: {
            label: t.label,
            ...(t.labelOffset ? { label_offset: t.labelOffset } : {}),
          },
          ...(t.guards.length
            ? {
                guards: t.guards.map<GuardInstance>((g) => ({
                  name: g.name,
                  type: "custom_webhook",
                  // rc-workflows requires `url` even though we don't
                  // run guard webhooks on build day. Placeholder.
                  url: `https://placeholder.invalid/guards/${g.name}`,
                  ...(Object.keys(g.params).length
                    ? { params: g.params }
                    : {}),
                })),
              }
            : {}),
          ...(t.actions.length
            ? {
                actions: t.actions.map<ActionInstance>((a) => ({
                  name: a.name,
                  type: "custom",
                  ...(Object.keys(a.params).length
                    ? { params: a.params }
                    : {}),
                })),
              }
            : {}),
        };
      }
    }
  }
  return { initial, states };
}

function humanise(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function slugify(label: string, existing: ReadonlySet<string>): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z]+/g, "_")
    .replace(/^_|_$/g, "");
  const safe = base || "new_state";
  if (!existing.has(safe)) return safe;
  // Add a word suffix instead of a digit, since rc-workflows rejects digits
  // in keys.
  const SUFFIXES = ["b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
  for (const s of SUFFIXES) {
    const candidate = `${safe}_${s}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${safe}_x`;
}
