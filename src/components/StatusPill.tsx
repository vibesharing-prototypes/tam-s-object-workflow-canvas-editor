import { Box } from "@mui/material";
import type { StateCategory } from "@/api/types";
import { tokens } from "@/theme/tokens";

// Per Figma: pill background varies by state, text is always dark.
// The findings list and viewer use this map as a fallback when a state
// is referenced by slug only (no template metadata).
// State set follows the Confluence audit-finding workflow.
const STATE_PALETTE: Record<
  string,
  { label: string; tone: keyof typeof tokens.color.accent }
> = {
  draft: { label: "Draft", tone: "gray" },
  in_review: { label: "In review", tone: "yellow" },
  to_be_published: { label: "To be published", tone: "yellow" },
  pending_acceptance: { label: "Pending acceptance", tone: "yellow" },
  remediation_planning: { label: "Remediation planning", tone: "blue" },
  in_remediation: { label: "In remediation", tone: "blue" },
  to_be_approved: { label: "To be approved", tone: "yellow" },
  closed: { label: "Closed", tone: "green" },
  discarded: { label: "Discarded", tone: "gray" },
};

const CATEGORY_TONE: Record<StateCategory, keyof typeof tokens.color.accent> = {
  static: "gray",
  progressing: "blue",
  waiting: "yellow",
  completed: "green",
};

export const STATE_CATEGORIES: ReadonlyArray<{
  value: StateCategory;
  label: string;
}> = [
  { value: "static", label: "Static" },
  { value: "progressing", label: "Progressing" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
];

export function getStateLabel(state: string): string {
  return STATE_PALETTE[state]?.label ?? humanise(state);
}

export function StatePill({
  state,
  label,
  category,
}: {
  state: string;
  /** When provided, renders this text instead of the palette default
   * label. Used by the canvas to show user-edited state names. */
  label?: string;
  /** When provided, drives the pill color by category instead of the
   * legacy slug→tone mapping. */
  category?: StateCategory;
}) {
  const fallback = STATE_PALETTE[state] ?? {
    label: humanise(state),
    tone: "gray" as const,
  };
  const tone = category ? CATEGORY_TONE[category] : fallback.tone;
  const palette = tokens.color.accent[tone];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        bgcolor: palette.bg,
        color: palette.content,
        borderRadius: tokens.radius.full + "px",
        px: 1.5,
        py: 0.25,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        height: 24,
      }}
    >
      {label ?? fallback.label}
    </Box>
  );
}

const SEVERITY_PALETTE: Record<
  string,
  { label: string; dot: string; fg: string }
> = {
  low: { label: "Low", dot: tokens.color.severity.low.default, fg: tokens.color.type.default },
  medium: { label: "Medium", dot: tokens.color.severity.medium.default, fg: tokens.color.type.default },
  high: { label: "High", dot: tokens.color.severity.high.default, fg: tokens.color.type.default },
  critical: { label: "Critical", dot: tokens.color.severity.critical.default, fg: tokens.color.type.default },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const palette = SEVERITY_PALETTE[severity] ?? {
    label: humanise(severity),
    dot: tokens.color.type.muted,
    fg: tokens.color.type.default,
  };
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        color: palette.fg,
        fontSize: 14,
      }}
    >
      <Box
        component="span"
        sx={{
          width: 14,
          height: 14,
          borderRadius: tokens.radius.sm + "px",
          bgcolor: palette.dot,
        }}
      />
      {palette.label}
    </Box>
  );
}

function humanise(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
