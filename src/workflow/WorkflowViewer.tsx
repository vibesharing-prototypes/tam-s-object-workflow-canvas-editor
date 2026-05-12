import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import type { WorkflowDefinition } from "@/api/types";
import { tokens } from "@/theme/tokens";
import { definitionToModel } from "./types";
import { ensurePositions } from "./layout";
import { StateNode, type StateNodeData } from "./StateNode";
import { TransitionEdge, type TransitionEdgeData } from "./TransitionEdge";

const nodeTypes = { state: StateNode };
const edgeTypes = { transition: TransitionEdge };

interface WorkflowViewerProps {
  definition: WorkflowDefinition;
  currentState?: string | null;
}

export function WorkflowViewer({
  definition,
  currentState,
}: WorkflowViewerProps) {
  const { nodes, edges } = useMemo(
    () => buildFlow(definition, currentState),
    [definition, currentState],
  );

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={tokens.color.outline.static}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

function buildFlow(
  definition: WorkflowDefinition,
  currentState?: string | null,
): { nodes: Node<StateNodeData>[]; edges: Edge<TransitionEdgeData>[] } {
  const model = ensurePositions(
    definitionToModel(definition, currentState ?? undefined),
  );

  const nodes: Node<StateNodeData>[] = model.states.map((s) => ({
    id: s.id,
    type: "state",
    position: s.position,
    data: {
      label: s.label,
      stateId: s.id,
      isInitial: s.isInitial,
      locked: s.locked,
      isCurrent: Boolean(s.isCurrent),
      category: s.category,
    },
  }));

  const edges: Edge<TransitionEdgeData>[] = model.transitions.map((t) => ({
    id: t.id,
    source: t.source,
    target: t.target,
    type: "transition",
    style: { stroke: tokens.color.outline.default, strokeWidth: 1.5 },
    data: {
      label: t.label,
      labelOffset: t.labelOffset,
      adornments: edgeAdornments(t.guards.length, t.actions.length),
      draggable: false,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: tokens.color.outline.default,
      width: 16,
      height: 16,
    },
  }));

  return { nodes, edges };
}

function edgeAdornments(guards: number, actions: number): string {
  const a: string[] = [];
  if (guards) a.push("🛡");
  if (actions) a.push("⚡");
  return a.join(" ");
}
