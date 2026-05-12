/**
 * Atlas design tokens — surfacing the values we use in the fake app.
 * Source: design-tokens/atlas-light.tokens.json (vendored), reconciled
 * with the values that appear on the new high-fidelity Figma frames.
 *
 * We don't load the JSON dynamically; we hand-pick the leaves we need.
 * Mirrors the upstream package shape closely enough to make a future
 * swap straightforward.
 */

export const tokens = {
  color: {
    type: {
      // Newer Atlas spec (`color/type/...`) — what the high-fi screens use.
      default: "#282E37",
      muted: "#6F7377",
      disabled: "#AAABAE",
    },
    surface: {
      default: "#FFFFFF",
      variant: "#F3F3F3",
      variantSubtle: "#F9F9FC",
    },
    background: {
      base: "#FFFFFF",
      backdrop: "rgba(40, 46, 55, 0.55)",
    },
    outline: {
      static: "#E2E2E5",
      default: "#8F9193",
      hover: "#515255",
    },
    action: {
      // Atlas Action/Primary uses a vertical gradient (#1C4EE4 → #0040D5).
      // We expose both ends and a `gradient` shorthand for buttons.
      primary: "#0040D5",
      primaryGradientStart: "#1C4EE4",
      primaryGradientEnd: "#0040D5",
      primaryHoverStart: "#4069FE",
      primaryHoverEnd: "#1C4EE4",
      primaryActiveStart: "#002585",
      primaryActiveEnd: "#001C6C",
      primaryDisabled: "#E2E2E5",
      onPrimary: "#FFFFFF",
      onPrimaryDisabled: "#AAABAE",
      // Secondary (used by outlined/tertiary buttons).
      secondaryHover: "#F0F0F3",
      secondaryOutline: "#76777A",
      secondaryOutlineDisabled: "#E2E2E5",
      onSecondary: "#282E37",
      // Convenience.
      link: "#0040D5",
    },
    selection: {
      primary: "#E5EDFE",
      secondary: "#F2F5FE",
    },
    status: {
      success: { default: "#2EC377", bg: "#C2FFD2", content: "#005F35" },
      warning: { default: "#FEE400", bg: "#FFF8B0", content: "#665B00" },
      error: { default: "#E5304D", bg: "#FFD3D9", content: "#7A0F22" },
      notification: { default: "#1C4EE4", bg: "#D9E3FE", content: "#001D6F" },
      neutral: { default: "#5D5E61", bg: "#E2E2E5", content: "#242628" },
      new: { default: "#7A1FA2", bg: "#F1D7FB", content: "#3F0E55" },
    },
    // Atlas accent palette — used by status pills.
    // Text color is the same dark grey across all variants; only the
    // background changes.
    accent: {
      blue: { bg: "#D7F6FF", content: "#282E37" },
      green: { bg: "#D2FF9C", content: "#282E37" },
      yellow: { bg: "#FFF2AA", content: "#282E37" },
      gray: { bg: "#E2E2E5", content: "#282E37" },
      highlighted: { bg: "#FFEDEB", content: "#282E37" },
    },
    severity: {
      // Aliases used in the findings table; chosen from Atlas status palette.
      low: { default: "#2EC377", bg: "#C2FFD2", content: "#005F35" },
      medium: { default: "#F7A020", bg: "#FFE7BD", content: "#5C3A00" },
      high: { default: "#E5304D", bg: "#FFD3D9", content: "#7A0F22" },
      critical: { default: "#7A1FA2", bg: "#F1D7FB", content: "#3F0E55" },
    },
  },
  // Atlas Spacing scale (Mode 1 / desktop). Matches `Spacing/N` from the JSON.
  space: {
    0: 0,
    px: 1,
    0.25: 2,
    0.5: 4,
    1: 8,
    1.5: 12,
    2: 16,
    2.5: 20,
    3: 24,
    4: 32,
    4.5: 36,
    5: 40,
    6: 48,
    7: 56,
  },
  // Atlas Radius scale.
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 24,
    xxl: 36,
    full: 9999,
  },
  typography: {
    fontFamily:
      '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    title: {
      // Per Figma: h1Billboard 30/38, h2Display 24/30, h3Lg 20/24
      h1: { size: 30, weight: 600, lineHeight: 38, letterSpacing: 0 },
      h2: { size: 24, weight: 600, lineHeight: 30, letterSpacing: 0 },
      h3: { size: 20, weight: 600, lineHeight: 24, letterSpacing: 0 },
    },
    text: {
      body: { size: 14, weight: 400, lineHeight: 20, letterSpacing: 0.2 },
      bodyEmphasis: { size: 14, weight: 600, lineHeight: 20, letterSpacing: 0.2 },
      md: { size: 12, weight: 400, lineHeight: 16, letterSpacing: 0.3 },
      sm: { size: 10, weight: 400, lineHeight: 12, letterSpacing: 0.3 },
    },
    label: {
      // Button labels: Label/Xl = 14/20 SemiBold; Label/Lg = 14/20;
      // Label/Sm = 12/16; Label/Xs = 11/16.
      xl: { size: 14, weight: 600, lineHeight: 20, letterSpacing: 0.2 },
      lg: { size: 14, weight: 600, lineHeight: 20, letterSpacing: 0.2 },
      sm: { size: 12, weight: 600, lineHeight: 16, letterSpacing: 0.3 },
      xs: { size: 11, weight: 600, lineHeight: 16, letterSpacing: 0.4 },
    },
  },
  shape: {
    sideNavWidth: 240,
    headerHeight: 56,
  },
} as const;

export type Tokens = typeof tokens;
