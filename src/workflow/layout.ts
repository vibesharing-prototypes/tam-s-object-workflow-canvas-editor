import dagre from "dagre";
import type { CanvasModel } from "./types";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

export function autoLayout(model: CanvasModel): CanvasModel {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const s of model.states) {
    g.setNode(s.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const t of model.transitions) {
    g.setEdge(t.source, t.target);
  }
  dagre.layout(g);

  const states = model.states.map((s) => {
    const n = g.node(s.id);
    return n
      ? { ...s, position: { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 } }
      : s;
  });

  return { states, transitions: model.transitions };
}

export function ensurePositions(model: CanvasModel): CanvasModel {
  const missing = model.states.some(
    (s) => s.position.x === 0 && s.position.y === 0,
  );
  return missing ? autoLayout(model) : model;
}
