import { Box, Stack, Typography } from "@mui/material";
import { Handle, Position } from "reactflow";
import type { StateCategory } from "@/api/types";
import { tokens } from "@/theme/tokens";
import { StatePill } from "@/components/StatusPill";

export interface StateNodeData {
  label: string;
  stateId: string;
  isInitial: boolean;
  locked: boolean;
  isCurrent: boolean;
  category: StateCategory;
  selected?: boolean;
}

const HANDLE_STYLE = {
  background: tokens.color.outline.default,
  width: 8,
  height: 8,
} as const;

export function StateNode({
  data,
  selected,
}: {
  data: StateNodeData;
  selected?: boolean;
}) {
  const isSelected = Boolean(selected || data.selected);
  // Initial state gets an on-brand subtle blue fill + primary blue
  // outline so the canvas entry point reads at a glance.
  const palette = data.isInitial
    ? {
        bg: tokens.color.selection.primary,
        border: tokens.color.action.primary,
      }
    : {
        bg: tokens.color.surface.default,
        border: tokens.color.outline.static,
      };

  return (
    <Box
      sx={{
        bgcolor: palette.bg,
        color: tokens.color.type.default,
        border: `2px solid ${
          isSelected ? tokens.color.action.primary : palette.border
        }`,
        boxShadow: isSelected
          ? `0 0 0 3px ${tokens.color.selection.primary}`
          : "0 1px 2px rgba(0,0,0,0.04)",
        borderRadius: tokens.radius.md + "px",
        minWidth: 160,
        py: 1.25,
        px: 1.5,
        position: "relative",
      }}
    >
      <Handle
        id="t-left"
        type="target"
        position={Position.Left}
        style={HANDLE_STYLE}
      />
      <Handle
        id="s-right"
        type="source"
        position={Position.Right}
        style={HANDLE_STYLE}
      />
      <Handle
        id="t-top"
        type="target"
        position={Position.Top}
        style={{ ...HANDLE_STYLE, opacity: 0 }}
      />
      <Handle
        id="t-bottom"
        type="target"
        position={Position.Bottom}
        style={{ ...HANDLE_STYLE, opacity: 0 }}
      />
      <Stack spacing={0.5} alignItems="flex-start">
        {(data.isInitial || data.locked) && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {data.isInitial && (
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: tokens.color.type.muted,
                }}
              >
                Initial state
              </Typography>
            )}
            {data.locked && (
              <Typography
                sx={{ fontSize: 11, color: tokens.color.type.muted }}
                title="OOTB-locked: this state can't be renamed or deleted."
              >
                🔒
              </Typography>
            )}
          </Stack>
        )}
        <StatePill
          state={data.stateId}
          label={data.label}
          category={data.category}
        />
      </Stack>
    </Box>
  );
}
