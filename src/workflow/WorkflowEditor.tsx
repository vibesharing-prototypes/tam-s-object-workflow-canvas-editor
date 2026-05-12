import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Box,
  Button,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";

import { Breadcrumb } from "@/components/Breadcrumb";

import type {
  Capabilities,
  ParamSpec,
  ParamValue,
  StateCategory,
  WorkflowDefinition,
} from "@/api/types";
import {
  capabilitiesApi,
  templatesApi,
} from "@/api/client";
import { STATE_CATEGORIES } from "@/components/StatusPill";
import { tokens } from "@/theme/tokens";
import {
  type CanvasAction,
  type CanvasGuard,
  type CanvasModel,
  type CanvasState,
  type CanvasTransition,
  definitionToModel,
  modelToDefinition,
  slugify,
} from "./types";
import { autoLayout, ensurePositions } from "./layout";
import { StateNode, type StateNodeData } from "./StateNode";
import { TransitionEdge, type TransitionEdgeData } from "./TransitionEdge";

const nodeTypes = { state: StateNode };
const edgeTypes = { transition: TransitionEdge };

interface WorkflowEditorProps {
  templateKey: string;
  initialDefinition: WorkflowDefinition;
  initialName: string;
  initialService: string;
  basedOnVersion: number | null;
  hasDraft: boolean;
  onPublished: () => void;
  onCancel: () => void;
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}

type AutosaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error" };

function EditorInner({
  templateKey,
  initialDefinition,
  initialName,
  initialService,
  basedOnVersion,
  hasDraft,
  onPublished,
  onCancel,
}: WorkflowEditorProps) {
  const queryClient = useQueryClient();
  const [model, setModel] = useState<CanvasModel>(() =>
    ensurePositions(definitionToModel(initialDefinition)),
  );
  const [name, setName] = useState(initialName);
  const [service, setService] = useState(initialService);
  const [selection, setSelection] = useState<
    | { kind: "state"; id: string }
    | { kind: "transition"; id: string }
    | null
  >(null);
  const [dirty, setDirty] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>({
    kind: "idle",
  });

  const { fitView } = useReactFlow();

  const { data: capabilities } = useQuery({
    queryKey: ["capabilities"],
    queryFn: () => capabilitiesApi.get(),
  });

  // Updating the transition label offset uses a ref-backed callback so
  // the React Flow edge data closures (built once per render) always see
  // the latest setter — and we don't have to thread it through every
  // memo dependency.
  const onTransitionLabelMove = useCallback(
    (transitionId: string, offset: { x: number; y: number }) => {
      setModel((m) => ({
        ...m,
        transitions: m.transitions.map((t) =>
          t.id === transitionId ? { ...t, labelOffset: offset } : t,
        ),
      }));
      setDirty(true);
    },
    [],
  );

  // React Flow needs *its own* nodes/edges state so measurement and
  // dimension changes flow through `applyNodeChanges`. We sync this state
  // from `model` whenever the model changes, but accept dimension/position
  // updates from React Flow back into both this state and the model.
  const [flowNodes, setFlowNodes] = useState<Node<StateNodeData>[]>(() =>
    modelToFlow(model, null, onTransitionLabelMove).nodes,
  );
  const [flowEdges, setFlowEdges] = useState<Edge<TransitionEdgeData>[]>(() =>
    modelToFlow(model, null, onTransitionLabelMove).edges,
  );

  // Re-derive flow nodes/edges when the model or selection changes,
  // preserving React Flow's per-node `width`/`height` (set after measurement).
  useEffect(() => {
    const built = modelToFlow(model, selection, onTransitionLabelMove);
    setFlowNodes((prev) => {
      const measureMap = new Map(prev.map((n) => [n.id, n]));
      return built.nodes.map((n) => {
        const old = measureMap.get(n.id);
        return old ? { ...n, width: old.width, height: old.height } : n;
      });
    });
    setFlowEdges(built.edges);
  }, [model, selection, onTransitionLabelMove]);

  const fittedRef = useRef(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
    setFlowNodes((nds) => applyNodeChanges(changes, nds));

    // First time React Flow reports node dimensions, fit the view.
    if (!fittedRef.current) {
      const dimChanges = changes.filter(
        (c) => c.type === "dimensions" && c.dimensions,
      );
      if (dimChanges.length > 0) {
        fittedRef.current = true;
        // Defer a frame so flowNodes state has the new dims when fitView reads.
        requestAnimationFrame(() => fitView({ padding: 0.2, duration: 0 }));
      }
    }

    // Mirror position changes back into the model.
    const positionChanges = changes.filter(
      (c) => c.type === "position" && c.position,
    );
    if (positionChanges.length > 0) {
      setModel((prev) => ({
        ...prev,
        states: prev.states.map((s) => {
          const change = positionChanges.find(
            (c) => c.type === "position" && c.id === s.id,
          );
          if (change && change.type === "position" && change.position) {
            return { ...s, position: change.position };
          }
          return s;
        }),
      }));
      // Don't mark dirty for purely incremental drag updates; only the final
      // commit (handled below) matters.
      const dragStop = changes.some(
        (c) => c.type === "position" && c.dragging === false,
      );
      if (dragStop) setDirty(true);
    }

    for (const c of changes) {
      if (c.type === "select" && c.selected) {
        setSelection({ kind: "state", id: c.id });
      }
    }
    },
    [fitView],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setFlowEdges((eds) => applyEdgeChanges(changes, eds));
    for (const c of changes) {
      if (c.type === "select" && c.selected) {
        setSelection({ kind: "transition", id: c.id });
      }
    }
  }, []);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const usedEvents = new Set(
        model.transitions
          .filter((t) => t.source === conn.source)
          .map((t) => t.event),
      );
      let event = "next";
      const altSuffixes = ["alt", "again", "more", "extra", "other"];
      let i = 0;
      while (usedEvents.has(event) && i < altSuffixes.length) {
        event = `next_${altSuffixes[i++]}`;
      }
      const newT: CanvasTransition = {
        id: `${conn.source}--${event}--${conn.target}`,
        source: conn.source,
        target: conn.target,
        event,
        label: humanise(event),
        guards: [],
        actions: [],
      };
      setModel((m) => ({ ...m, transitions: [...m.transitions, newT] }));
      setSelection({ kind: "transition", id: newT.id });
      setDirty(true);
      void addEdge;
    },
    [model.transitions],
  );

  const addRegularState = () => {
    const ids = new Set(model.states.map((s) => s.id));
    const id = slugify("new state", ids);
    const next: CanvasState = {
      id,
      label: humanise(id),
      isInitial: model.states.length === 0,
      locked: false,
      category: "static",
      position: {
        x: 100 + model.states.length * 30,
        y: 280 + model.states.length * 30,
      },
    };
    setModel((m) => ({ ...m, states: [...m.states, next] }));
    setSelection({ kind: "state", id });
    setDirty(true);
  };

  const updateState = (id: string, patch: Partial<CanvasState>) => {
    setModel((m) => ({
      ...m,
      states: m.states.map((s) => {
        if (s.id !== id) {
          if (patch.isInitial) return { ...s, isInitial: false };
          return s;
        }
        return { ...s, ...patch };
      }),
    }));
    setDirty(true);
  };

  const deleteState = (id: string) => {
    const target = model.states.find((s) => s.id === id);
    if (!target) return;
    if (target.locked) {
      alert("This state is locked and can't be deleted.");
      return;
    }
    if (target.isInitial) {
      alert("Initial state can't be deleted. Mark another state as initial first.");
      return;
    }
    setModel((m) => ({
      states: m.states.filter((s) => s.id !== id),
      transitions: m.transitions.filter(
        (t) => t.source !== id && t.target !== id,
      ),
    }));
    setSelection(null);
    setDirty(true);
  };

  const updateTransition = (id: string, patch: Partial<CanvasTransition>) => {
    setModel((m) => ({
      ...m,
      transitions: m.transitions.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    }));
    setDirty(true);
  };

  const deleteTransition = (id: string) => {
    setModel((m) => ({
      ...m,
      transitions: m.transitions.filter((t) => t.id !== id),
    }));
    setSelection(null);
    setDirty(true);
  };

  // ---- Persistence ----

  const definition = useMemo(() => modelToDefinition(model), [model]);

  // Track the in-flight autosave promise so Publish can await it before
  // posting — avoids publishing the version-before-the-last-keystroke.
  const saveDraftPromiseRef = useRef<Promise<unknown> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useMutation({
    mutationFn: () => {
      const p = templatesApi.saveDraft(templateKey, {
        definition,
        name,
        service,
        basedOnVersion,
      });
      saveDraftPromiseRef.current = p;
      return p;
    },
    onMutate: () => {
      setAutosaveStatus({ kind: "saving" });
    },
    onSuccess: () => {
      setDirty(false);
      setAutosaveStatus({ kind: "saved", at: new Date() });
      void queryClient.invalidateQueries({ queryKey: ["draft", templateKey] });
    },
    onError: () => {
      setAutosaveStatus({ kind: "error" });
    },
    onSettled: () => {
      saveDraftPromiseRef.current = null;
    },
  });

  // Debounced autosave: 500ms after the last edit, push the draft to the
  // server. Fires regardless of validation — partial/invalid drafts must
  // still survive a refresh.
  useEffect(() => {
    if (!dirty) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveDraft.mutate();
    }, 500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, definition, name, service]);

  const discardDraft = useMutation({
    mutationFn: () => templatesApi.discardDraft(templateKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["draft", templateKey] });
      onCancel();
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      // Wait for any in-flight autosave to settle.
      if (saveDraftPromiseRef.current) {
        await saveDraftPromiseRef.current.catch(() => {
          // ignore; we'll re-save below
        });
      }
      // Belt-and-suspenders: if there are still unsaved changes (e.g. a
      // keystroke that hadn't yet hit the debounce), flush them now.
      if (dirty) {
        await templatesApi.saveDraft(templateKey, {
          definition,
          name,
          service,
          basedOnVersion,
        });
        setDirty(false);
      }
      return templatesApi.publish(templateKey);
    },
    onSuccess: () => {
      setAutosaveStatus({ kind: "saved", at: new Date() });
      void queryClient.invalidateQueries({ queryKey: ["latest", templateKey] });
      void queryClient.invalidateQueries({ queryKey: ["draft", templateKey] });
      void queryClient.invalidateQueries({
        queryKey: ["versions", templateKey],
      });
      onPublished();
    },
  });

  // Validation summary
  const validation = useMemo(
    () => validateModel(model, capabilities),
    [model, capabilities],
  );

  // Publish is blocked while validation is failing (orphaned states,
  // missing required params). Autosave is NOT blocked by validation —
  // mid-edit invalid states must still survive a refresh.
  // Also blocked when there's nothing new to publish: no server-side
  // draft AND no in-flight local edits. The backend would 400 in that
  // case, so we surface it up-front instead of as an error toast.
  const hasChangesToPublish = hasDraft || dirty;
  const canPublish =
    validation.ok && !publish.isPending && hasChangesToPublish;
  const publishDisabledReason = !validation.ok
    ? validation.errors[0]
    : !hasChangesToPublish
      ? "No changes to publish — make an edit first."
      : "";

  const selectedState =
    selection?.kind === "state"
      ? model.states.find((s) => s.id === selection.id)
      : undefined;
  const selectedTransition =
    selection?.kind === "transition"
      ? model.transitions.find((t) => t.id === selection.id)
      : undefined;

  // Keyboard delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      // Ignore when typing in an input/textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;
      if (selectedState) deleteState(selectedState.id);
      else if (selectedTransition) deleteTransition(selectedTransition.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState?.id, selectedTransition?.id]);

  const sidesheetOpen = Boolean(selectedState || selectedTransition);
  const SIDESHEET_WIDTH = 460;

  return (
    <Box
      sx={{
        height: `calc(100vh - ${tokens.shape.headerHeight}px)`,
        display: "flex",
        flexDirection: "column",
        bgcolor: tokens.color.surface.default,
        position: "relative",
        // Shift all editor content left when the sidesheet is open so
        // nothing renders behind it.
        pr: sidesheetOpen ? `${SIDESHEET_WIDTH}px` : 0,
        transition: "padding-right 160ms ease",
      }}
    >
      <Box sx={{ px: 6, pt: 3, pb: 2, maxWidth: 1380, mx: "auto", width: "100%" }}>
        <Breadcrumb
          items={[
            { label: "Audit", to: "/" },
            { label: "Object library", to: "/" },
            { label: "Audit findings", to: "/findings" },
          ]}
        />
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Box
              sx={{
                color: tokens.color.type.muted,
                fontSize: 22,
                cursor: "pointer",
                mt: 0.25,
              }}
              onClick={onCancel}
            >
              ←
            </Box>
            <Box>
              <Typography variant="h2">Edit: {name || "Workflow"}</Typography>
              <Typography
                sx={{ mt: 0.5, fontSize: 13, color: tokens.color.type.muted }}
              >
                Audit finding workflow
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AutosaveIndicator
              status={autosaveStatus}
              onRetry={() => saveDraft.mutate()}
            />
            {!validation.ok && (
              <Box
                sx={{
                  fontSize: 12,
                  color: tokens.color.status.error.content,
                  bgcolor: tokens.color.status.error.bg,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: tokens.radius.full + "px",
                  maxWidth: 280,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={validation.errors[0]}
              >
                {validation.errors[0]}
              </Box>
            )}
            {publish.error && (
              <Box
                sx={{
                  fontSize: 12,
                  color: tokens.color.status.error.content,
                  bgcolor: tokens.color.status.error.bg,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: tokens.radius.full + "px",
                  maxWidth: 280,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={(publish.error as Error).message}
              >
                Publish failed
              </Box>
            )}
            <Button variant="outlined" onClick={onCancel}>
              Close
            </Button>
            <Tooltip title={!canPublish ? publishDisabledReason : ""}>
              {/* span keeps the tooltip working even when the button
                  is disabled (MUI requires a non-disabled wrapper). */}
              <span>
                <Button
                  variant="contained"
                  disabled={!canPublish}
                  onClick={() => publish.mutate()}
                >
                  {publish.isPending ? "Publishing…" : "Publish"}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: 6, pb: 2, maxWidth: 1380, mx: "auto", width: "100%" }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: tokens.color.type.default,
            mb: 0.5,
          }}
        >
          Workflow name{" "}
          <Box
            component="span"
            sx={{ color: tokens.color.type.muted, fontWeight: 400 }}
          >
            (Required)
          </Box>
        </Typography>
        <TextField
          size="small"
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          sx={{ maxWidth: 720 }}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          px: 6,
          pb: 4,
          maxWidth: 1380,
          mx: "auto",
          width: "100%",
          position: "relative",
          display: "flex",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            border: `1px solid ${tokens.color.outline.static}`,
            borderRadius: tokens.radius.md + "px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            bgcolor: tokens.color.surface.variantSubtle,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${tokens.color.outline.static}`,
              bgcolor: tokens.color.surface.default,
            }}
          >
            <Stack direction="row" spacing={3} alignItems="center">
              <ToolbarLink
                icon="🕒"
                label="See previous versions"
                to="/findings/workflow/versions"
              />
              {hasDraft && (
                <ToolbarAction
                  icon="↶"
                  label="Discard edits"
                  onClick={() => discardDraft.mutate()}
                  disabled={discardDraft.isPending}
                />
              )}
            </Stack>
            <Button
              variant="outlined"
              onClick={addRegularState}
              startIcon={<Box sx={{ fontSize: 14 }}>+</Box>}
              size="small"
            >
              Add state
            </Button>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelection({ kind: "state", id: n.id })}
              onEdgeClick={(_, e) =>
                setSelection({ kind: "transition", id: e.id })
              }
              onPaneClick={() => setSelection(null)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              connectionLineType={ConnectionLineType.Bezier}
              defaultEdgeOptions={{ type: "transition" }}
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
          </Box>
        </Box>

      </Box>

      {sidesheetOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: SIDESHEET_WIDTH,
            bgcolor: tokens.color.surface.default,
            borderLeft: `1px solid ${tokens.color.outline.static}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          {selectedState && (
            <StatePanel
              state={selectedState}
              allStateIds={model.states.map((s) => s.id)}
              onChange={(patch) => updateState(selectedState.id, patch)}
              onDelete={() => deleteState(selectedState.id)}
              onClose={() => setSelection(null)}
            />
          )}
          {selectedTransition && capabilities && (
            <TransitionPanel
              transition={selectedTransition}
              capabilities={capabilities}
              states={model.states.map((s) => ({ id: s.id, label: s.label }))}
              onChange={(patch) =>
                updateTransition(selectedTransition.id, patch)
              }
              onDelete={() => deleteTransition(selectedTransition.id)}
              onClose={() => setSelection(null)}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

function ToolbarLink({
  icon,
  label,
  to,
}: {
  icon: string;
  label: string;
  to: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      component={RouterLink}
      to={to}
      sx={{
        color: tokens.color.type.default,
        fontSize: 14,
        textDecoration: "none",
        cursor: "pointer",
        "&:hover": { color: tokens.color.action.primary },
      }}
    >
      <Box sx={{ fontSize: 14, color: tokens.color.type.muted }}>{icon}</Box>
      <span>{label}</span>
    </Stack>
  );
}

function ToolbarAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      onClick={disabled ? undefined : onClick}
      sx={{
        color: disabled ? tokens.color.type.disabled : tokens.color.type.default,
        fontSize: 14,
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        "&:hover": disabled
          ? {}
          : { color: tokens.color.action.primary },
      }}
    >
      <Box sx={{ fontSize: 14, color: tokens.color.type.muted }}>{icon}</Box>
      <span>{label}</span>
    </Stack>
  );
}

function SidesheetHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <Box
      sx={{
        px: 3,
        pt: 3,
        pb: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${tokens.color.outline.static}`,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 18 }}>{title}</Typography>
      <Box
        onClick={onClose}
        sx={{
          fontSize: 18,
          color: tokens.color.type.muted,
          cursor: "pointer",
          lineHeight: 1,
          px: 0.5,
        }}
      >
        ×
      </Box>
    </Box>
  );
}

function SidesheetFooter({
  destructiveLabel,
  destructiveDisabled,
  onDestructive,
  onClose,
}: {
  destructiveLabel: string;
  destructiveDisabled?: boolean;
  onDestructive: () => void;
  onClose: () => void;
}) {
  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderTop: `1px solid ${tokens.color.outline.static}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Button
        color="error"
        variant="outlined"
        onClick={onDestructive}
        disabled={destructiveDisabled}
      >
        {destructiveLabel}
      </Button>
      <Button variant="outlined" onClick={onClose}>
        Close
      </Button>
    </Box>
  );
}

function StatePanel({
  state,
  allStateIds,
  onChange,
  onDelete,
  onClose,
}: {
  state: CanvasState;
  allStateIds: string[];
  onChange: (patch: Partial<CanvasState>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [labelDraft, setLabelDraft] = useState(state.label);
  useEffect(() => setLabelDraft(state.label), [state.id, state.label]);

  return (
    <>
      <SidesheetHeader title="State properties" onClose={onClose} />
      <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <FieldLabel label="State name" required />
            <TextField
              size="small"
              fullWidth
              value={labelDraft}
              disabled={state.locked}
              helperText={
                state.locked
                  ? "Locked: this state was shipped OOTB and can't be renamed."
                  : undefined
              }
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={() => {
                if (state.locked) return;
                if (labelDraft !== state.label) {
                  onChange({ label: labelDraft });
                }
              }}
            />
          </Box>
          <Box>
            <FieldLabel label="State category" required />
            <TextField
              select
              size="small"
              fullWidth
              value={state.category}
              disabled={state.locked}
              helperText={
                state.locked
                  ? "Locked: this state was shipped OOTB and its category can't be changed."
                  : undefined
              }
              onChange={(e) =>
                onChange({ category: e.target.value as StateCategory })
              }
            >
              {STATE_CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          {state.isInitial && (
            <Typography
              sx={{ fontSize: 12, color: tokens.color.type.muted }}
            >
              This is the initial state. Initial-state assignment is fixed
              for the OOTB workflow.
            </Typography>
          )}
        </Stack>
      </Box>
      <SidesheetFooter
        destructiveLabel="Delete state"
        destructiveDisabled={state.isInitial || state.locked}
        onDestructive={onDelete}
        onClose={onClose}
      />
    </>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Typography
      sx={{
        fontSize: 12,
        fontWeight: 600,
        color: tokens.color.type.default,
        mb: 0.5,
      }}
    >
      {label}{" "}
      {required && (
        <Box
          component="span"
          sx={{ color: tokens.color.type.muted, fontWeight: 400 }}
        >
          (Required)
        </Box>
      )}
    </Typography>
  );
}

function TransitionPanel({
  transition,
  capabilities,
  states,
  onChange,
  onDelete,
  onClose,
}: {
  transition: CanvasTransition;
  capabilities: Capabilities;
  states: Array<{ id: string; label: string }>;
  onChange: (patch: Partial<CanvasTransition>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const sharedGuards = capabilities.guards.filter((g) => g.source === "shared");
  const customGuards = capabilities.guards.filter((g) => g.source === "custom");
  const sharedActions = capabilities.actions.filter((a) => a.source === "shared");
  const customActions = capabilities.actions.filter((a) => a.source === "custom");

  const guardByName = useMemo(
    () => new Map(capabilities.guards.map((g) => [g.name, g])),
    [capabilities.guards],
  );
  const usedGuardNames = new Set(transition.guards.map((g) => g.name));

  const setGuardParam = (
    guardName: string,
    paramName: string,
    value: ParamValue,
  ) => {
    onChange({
      guards: transition.guards.map((g) =>
        g.name === guardName
          ? { ...g, params: { ...g.params, [paramName]: value } }
          : g,
      ),
    });
  };

  const removeGuard = (guardName: string) => {
    onChange({
      guards: transition.guards.filter((g) => g.name !== guardName),
    });
  };

  const addGuard = (guardName: string) => {
    if (usedGuardNames.has(guardName)) return;
    const spec = guardByName.get(guardName);
    const initial: Record<string, ParamValue> = {};
    for (const p of spec?.params ?? []) {
      initial[p.name] = p.multiple ? [] : "";
    }
    onChange({
      guards: [...transition.guards, { name: guardName, params: initial }],
    });
  };

  const actionByName = useMemo(
    () => new Map(capabilities.actions.map((a) => [a.name, a])),
    [capabilities.actions],
  );
  const usedActionNames = new Set(transition.actions.map((a) => a.name));

  const setActionParam = (
    actionName: string,
    paramName: string,
    value: ParamValue,
  ) => {
    onChange({
      actions: transition.actions.map((a) =>
        a.name === actionName
          ? { ...a, params: { ...a.params, [paramName]: value } }
          : a,
      ),
    });
  };

  const removeAction = (actionName: string) => {
    onChange({
      actions: transition.actions.filter((a) => a.name !== actionName),
    });
  };

  const addAction = (actionName: string) => {
    if (usedActionNames.has(actionName)) return;
    const spec = actionByName.get(actionName);
    const initial: Record<string, ParamValue> = {};
    for (const p of spec?.params ?? []) {
      initial[p.name] = p.multiple ? [] : "";
    }
    onChange({
      actions: [...transition.actions, { name: actionName, params: initial }],
    });
  };

  return (
    <>
      <SidesheetHeader title="Transition properties" onClose={onClose} />
      <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
    <Stack spacing={2}>
      <TextField
        label="Label"
        size="small"
        value={transition.label}
        onChange={(e) => onChange({ label: e.target.value })}
      />
      <TextField
        label="Target"
        select
        size="small"
        value={transition.target}
        onChange={(e) => onChange({ target: e.target.value })}
      >
        {states.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.label}
          </MenuItem>
        ))}
      </TextField>
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>
          Guards
        </Typography>
        <Stack spacing={1.5}>
          {transition.guards.map((g) => (
            <GuardCard
              key={g.name}
              guard={g}
              spec={guardByName.get(g.name)}
              onRemove={() => removeGuard(g.name)}
              onParamChange={(paramName, value) =>
                setGuardParam(g.name, paramName, value)
              }
            />
          ))}
          <TextField
            label="Add guard"
            select
            size="small"
            value=""
            onChange={(e) => {
              if (e.target.value) addGuard(e.target.value);
            }}
            // The select's value is intentionally empty (it acts as a
            // command, not a stored value), so MUI would otherwise let
            // the label sit inside the box and overlap the placeholder.
            // Force the label to stay floated.
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="" disabled>
              Choose a guard…
            </MenuItem>
            {sharedGuards.length > 0 && (
              <ListSubheader>Shared</ListSubheader>
            )}
            {sharedGuards.map((g) => (
              <MenuItem
                key={g.name}
                value={g.name}
                disabled={usedGuardNames.has(g.name)}
              >
                {g.name}
              </MenuItem>
            ))}
            {customGuards.length > 0 && (
              <ListSubheader>App-specific</ListSubheader>
            )}
            {customGuards.map((g) => (
              <MenuItem
                key={g.name}
                value={g.name}
                disabled={usedGuardNames.has(g.name)}
              >
                {g.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>
          Actions
        </Typography>
        <Stack spacing={1.5}>
          {transition.actions.map((a) => (
            <ActionCard
              key={a.name}
              action={a}
              spec={actionByName.get(a.name)}
              onRemove={() => removeAction(a.name)}
              onParamChange={(paramName, value) =>
                setActionParam(a.name, paramName, value)
              }
            />
          ))}
          <TextField
            label="Add action"
            select
            size="small"
            value=""
            onChange={(e) => {
              if (e.target.value) addAction(e.target.value);
            }}
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="" disabled>
              Choose an action…
            </MenuItem>
            {sharedActions.length > 0 && (
              <ListSubheader>Shared</ListSubheader>
            )}
            {sharedActions.map((a) => (
              <MenuItem
                key={a.name}
                value={a.name}
                disabled={usedActionNames.has(a.name)}
              >
                {a.name}
              </MenuItem>
            ))}
            {customActions.length > 0 && (
              <ListSubheader>App-specific</ListSubheader>
            )}
            {customActions.map((a) => (
              <MenuItem
                key={a.name}
                value={a.name}
                disabled={usedActionNames.has(a.name)}
              >
                {a.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>

    </Stack>
      </Box>
      <SidesheetFooter
        destructiveLabel="Delete transition"
        onDestructive={onDelete}
        onClose={onClose}
      />
    </>
  );
}

function ParamCard({
  title,
  description,
  params,
  values,
  onParamChange,
  onRemove,
}: {
  title: string;
  description?: string;
  params: ParamSpec[];
  values: Record<string, ParamValue>;
  onParamChange: (paramName: string, value: ParamValue) => void;
  onRemove: () => void;
}) {
  return (
    <Box
      sx={{
        border: `1px solid ${tokens.color.outline.static}`,
        borderRadius: tokens.radius.sm + "px",
        p: 1.25,
        bgcolor: tokens.color.surface.default,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{title}</Typography>
        <Button
          size="small"
          color="error"
          onClick={onRemove}
          sx={{ minWidth: 0, px: 0.75, fontSize: 11 }}
        >
          Remove
        </Button>
      </Stack>
      {description && (
        <Typography
          sx={{
            fontSize: 11,
            color: tokens.color.type.muted,
            mb: 1,
          }}
        >
          {description}
        </Typography>
      )}
      {params.length === 0 ? (
        <Typography sx={{ fontSize: 11, color: tokens.color.type.muted }}>
          No parameters.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {params.map((param) =>
            param.multiple ? (
              <MultiStringField
                key={param.name}
                spec={param}
                values={
                  Array.isArray(values[param.name])
                    ? (values[param.name] as string[])
                    : []
                }
                onChange={(next) => onParamChange(param.name, next)}
              />
            ) : (
              <TextField
                key={param.name}
                label={`${param.label}${param.required ? " *" : ""}`}
                placeholder={param.placeholder}
                size="small"
                value={
                  typeof values[param.name] === "string"
                    ? (values[param.name] as string)
                    : ""
                }
                onChange={(e) => onParamChange(param.name, e.target.value)}
                error={
                  param.required && !(values[param.name] as string)?.trim()
                }
              />
            ),
          )}
        </Stack>
      )}
    </Box>
  );
}

function GuardCard({
  guard,
  spec,
  onRemove,
  onParamChange,
}: {
  guard: CanvasGuard;
  spec: Capabilities["guards"][number] | undefined;
  onRemove: () => void;
  onParamChange: (paramName: string, value: ParamValue) => void;
}) {
  return (
    <ParamCard
      title={guard.name}
      description={spec?.description}
      params={spec?.params ?? []}
      values={guard.params}
      onParamChange={onParamChange}
      onRemove={onRemove}
    />
  );
}

function ActionCard({
  action,
  spec,
  onRemove,
  onParamChange,
}: {
  action: CanvasAction;
  spec: Capabilities["actions"][number] | undefined;
  onRemove: () => void;
  onParamChange: (paramName: string, value: ParamValue) => void;
}) {
  return (
    <ParamCard
      title={action.name}
      description={spec?.description}
      params={spec?.params ?? []}
      values={action.params}
      onParamChange={onParamChange}
      onRemove={onRemove}
    />
  );
}

function MultiStringField({
  spec,
  values,
  onChange,
}: {
  spec: ParamSpec;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const isEmpty = values.length === 0;
  const hasError = spec.required && isEmpty;
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 600,
          color: hasError
            ? tokens.color.status.error.content
            : tokens.color.type.default,
          mb: 0.5,
        }}
      >
        {spec.label}
        {spec.required ? " *" : ""}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", mb: 0.5 }}>
        {values.map((v, i) => (
          <Box
            key={`${v}-${i}`}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              bgcolor: tokens.color.surface.variant,
              borderRadius: tokens.radius.full + "px",
              px: 1,
              py: 0.25,
              fontSize: 12,
              mb: 0.5,
            }}
          >
            <span>{v}</span>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              style={{
                background: "transparent",
                border: 0,
                color: tokens.color.type.muted,
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
              }}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </Box>
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          value={draft}
          placeholder={spec.placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = draft.trim();
              if (v && !values.includes(v)) onChange([...values, v]);
              setDraft("");
            }
          }}
          fullWidth
        />
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const v = draft.trim();
            if (v && !values.includes(v)) onChange([...values, v]);
            setDraft("");
          }}
        >
          Add
        </Button>
      </Stack>
    </Box>
  );
}

function AutosaveIndicator({
  status,
  onRetry,
}: {
  status: AutosaveStatus;
  onRetry: () => void;
}) {
  const relative = useRelativeTime(
    status.kind === "saved" ? status.at : null,
  );
  const baseSx = {
    fontSize: 12,
    color: tokens.color.type.muted,
  } as const;

  if (status.kind === "saving") {
    return <Typography sx={baseSx}>Saving…</Typography>;
  }
  if (status.kind === "saved") {
    return <Typography sx={baseSx}>Saved {relative}</Typography>;
  }
  if (status.kind === "error") {
    return (
      <Typography
        onClick={onRetry}
        sx={{
          fontSize: 12,
          color: tokens.color.status.error.content,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Save failed — retry
      </Typography>
    );
  }
  return null;
}

function useRelativeTime(date: Date | null): string {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [date]);
  if (!date) return "";
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function modelToFlow(
  model: CanvasModel,
  selection:
    | { kind: "state"; id: string }
    | { kind: "transition"; id: string }
    | null,
  onLabelMove: (transitionId: string, offset: { x: number; y: number }) => void,
): { nodes: Node<StateNodeData>[]; edges: Edge<TransitionEdgeData>[] } {
  const nodes: Node<StateNodeData>[] = model.states.map((s) => ({
    id: s.id,
    type: "state",
    position: s.position,
    selected: selection?.kind === "state" && selection.id === s.id,
    data: {
      label: s.label,
      stateId: s.id,
      isInitial: s.isInitial,
      locked: s.locked,
      isCurrent: false,
      category: s.category,
      selected: selection?.kind === "state" && selection.id === s.id,
    },
  }));

  const edges: Edge<TransitionEdgeData>[] = model.transitions.map((t) => {
    const isSelected = selection?.kind === "transition" && selection.id === t.id;
    return {
      id: t.id,
      source: t.source,
      target: t.target,
      type: "transition",
      selected: isSelected,
      data: {
        label: t.label,
        labelOffset: t.labelOffset,
        adornments: edgeAdornments(t.guards.length, t.actions.length),
        draggable: true,
        onLabelMove: (offset) => onLabelMove(t.id, offset),
      },
      style: {
        stroke: isSelected ? tokens.color.action.primary : tokens.color.outline.default,
        strokeWidth: isSelected ? 2.5 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isSelected
          ? tokens.color.action.primary
          : tokens.color.outline.default,
        width: 16,
        height: 16,
      },
    };
  });

  return { nodes, edges };
}

function edgeAdornments(guards: number, actions: number): string {
  const a: string[] = [];
  if (guards) a.push("🛡");
  if (actions) a.push("⚡");
  return a.join(" ");
}

function humanise(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function validateModel(
  model: CanvasModel,
  capabilities: Capabilities | undefined,
): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (model.states.length === 0) errors.push("Add at least one state.");
  if (model.states.filter((s) => s.isInitial).length !== 1)
    errors.push("Exactly one state must be marked as initial.");

  const ids = new Set(model.states.map((s) => s.id));
  for (const t of model.transitions) {
    if (!ids.has(t.target)) errors.push(`Transition target "${t.target}" missing.`);
    if (!ids.has(t.source)) errors.push(`Transition source "${t.source}" missing.`);
    if (!t.event) errors.push(`Transition needs an event name.`);
  }

  // Unique events per source
  const seen = new Map<string, Set<string>>();
  for (const t of model.transitions) {
    const set = seen.get(t.source) ?? new Set();
    if (set.has(t.event)) errors.push(`Duplicate event "${t.event}" on ${t.source}.`);
    set.add(t.event);
    seen.set(t.source, set);
  }

  // Orphaned states: any state with neither outgoing nor incoming
  // transitions is unreachable / disconnected. Initial state is exempt
  // from the "must have incoming" rule (no transition targets it).
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const t of model.transitions) {
    incoming.set(t.target, (incoming.get(t.target) ?? 0) + 1);
    outgoing.set(t.source, (outgoing.get(t.source) ?? 0) + 1);
  }
  if (model.states.length > 1) {
    for (const s of model.states) {
      const inDeg = incoming.get(s.id) ?? 0;
      const outDeg = outgoing.get(s.id) ?? 0;
      if (inDeg === 0 && outDeg === 0) {
        errors.push(`State "${s.id}" is orphaned (no transitions).`);
      } else if (!s.isInitial && inDeg === 0) {
        errors.push(`State "${s.id}" has no incoming transitions.`);
      }
    }
  }

  // Required guard / action parameters must be filled.
  if (capabilities) {
    const guardSpecByName = new Map(
      capabilities.guards.map((g) => [g.name, g]),
    );
    const actionSpecByName = new Map(
      capabilities.actions.map((a) => [a.name, a]),
    );
    const checkRequired = (
      label: string,
      paramName: string,
      paramLabel: string,
      multiple: boolean | undefined,
      value: ParamValue | undefined,
    ) => {
      const empty = multiple
        ? !Array.isArray(value) || value.length === 0
        : typeof value !== "string" || !value.trim();
      if (empty) {
        errors.push(`${label}: "${paramLabel}" is required.`);
      }
    };
    for (const t of model.transitions) {
      for (const g of t.guards) {
        const spec = guardSpecByName.get(g.name);
        for (const p of spec?.params ?? []) {
          if (!p.required) continue;
          checkRequired(
            `${t.event}/${g.name}`,
            p.name,
            p.label,
            p.multiple,
            g.params[p.name],
          );
        }
      }
      for (const a of t.actions) {
        const spec = actionSpecByName.get(a.name);
        for (const p of spec?.params ?? []) {
          if (!p.required) continue;
          checkRequired(
            `${t.event}/${a.name}`,
            p.name,
            p.label,
            p.multiple,
            a.params[p.name],
          );
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
