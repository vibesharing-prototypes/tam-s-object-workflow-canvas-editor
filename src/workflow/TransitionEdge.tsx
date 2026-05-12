import { useRef } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useStore,
  type EdgeProps,
} from "reactflow";
import { Box } from "@mui/material";
import { tokens } from "@/theme/tokens";

export interface TransitionEdgeData {
  label: string;
  labelOffset?: { x: number; y: number };
  /** Optional adornments shown alongside the label (e.g. 🛡 ⚡). */
  adornments?: string;
  /** Whether dragging the label is allowed (false in viewer mode). */
  draggable?: boolean;
  /** Called when the user finishes dragging the label. */
  onLabelMove?: (offset: { x: number; y: number }) => void;
}

const CURVATURE = 0.45;

export function TransitionEdge(props: EdgeProps<TransitionEdgeData>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    selected,
    data,
  } = props;

  const [path, baseLabelX, baseLabelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: CURVATURE,
  });

  const offset = data?.labelOffset ?? { x: 0, y: 0 };
  const labelX = baseLabelX + offset.x;
  const labelY = baseLabelY + offset.y;

  // React Flow stores the canvas zoom in its store; we divide drag deltas
  // by the zoom so the label tracks the cursor in canvas coordinates.
  const zoom = useStore((s) => s.transform[2]);
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startOffset: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  const draggable = Boolean(data?.draggable);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffset: { ...offset },
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startClientX) / zoom;
    const dy = (e.clientY - drag.startClientY) / zoom;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.moved = true;
    data?.onLabelMove?.({
      x: drag.startOffset.x + dx,
      y: drag.startOffset.y + dy,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    // If this was a click (no drag), let the click bubble up so the edge
    // gets selected; otherwise swallow it.
    if (dragRef.current.moved) e.stopPropagation();
    dragRef.current = null;
  };

  const showAdornments = Boolean(data?.adornments);

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <Box
          // pointerEvents: "all" overrides the parent renderer's "none"
          // so the label is interactive.
          sx={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            cursor: draggable ? "grab" : "default",
            "&:active": draggable ? { cursor: "grabbing" } : undefined,
            bgcolor: tokens.color.surface.default,
            color: selected
              ? tokens.color.action.primary
              : tokens.color.type.default,
            border: `1px solid ${
              selected ? tokens.color.action.primary : tokens.color.outline.static
            }`,
            borderRadius: tokens.radius.sm + "px",
            px: 0.75,
            py: 0.25,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            userSelect: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
          // nodrag prevents React Flow from interpreting the gesture as
          // a pane pan; nopan does the same for trackpads.
          className="nodrag nopan"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span>{data?.label ?? ""}</span>
          {showAdornments && (
            <Box component="span" sx={{ color: tokens.color.type.muted }}>
              {data!.adornments}
            </Box>
          )}
        </Box>
      </EdgeLabelRenderer>
    </>
  );
}
