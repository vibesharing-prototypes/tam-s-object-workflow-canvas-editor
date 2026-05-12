import { createTheme } from "@mui/material/styles";
import { tokens } from "./tokens";

declare module "@mui/material/styles" {
  interface Palette {
    surface: { default: string; variant: string };
  }
  interface PaletteOptions {
    surface?: { default: string; variant: string };
  }
}

const buttonLabel = tokens.typography.label.xl;

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: tokens.color.action.primary,
      dark: tokens.color.action.primaryHoverEnd,
      contrastText: tokens.color.action.onPrimary,
    },
    text: {
      primary: tokens.color.type.default,
      secondary: tokens.color.type.muted,
      disabled: tokens.color.type.disabled,
    },
    background: {
      default: tokens.color.background.base,
      paper: tokens.color.surface.default,
    },
    surface: {
      default: tokens.color.surface.default,
      variant: tokens.color.surface.variant,
    },
    divider: tokens.color.outline.static,
    error: { main: tokens.color.status.error.default },
    warning: { main: tokens.color.status.warning.default },
    success: { main: tokens.color.status.success.default },
    info: { main: tokens.color.status.notification.default },
  },
  typography: {
    fontFamily: tokens.typography.fontFamily,
    fontSize: tokens.typography.text.body.size,
    h1: {
      fontSize: tokens.typography.title.h1.size,
      fontWeight: tokens.typography.title.h1.weight,
      lineHeight: `${tokens.typography.title.h1.lineHeight}px`,
      letterSpacing: tokens.typography.title.h1.letterSpacing,
    },
    h2: {
      fontSize: tokens.typography.title.h2.size,
      fontWeight: tokens.typography.title.h2.weight,
      lineHeight: `${tokens.typography.title.h2.lineHeight}px`,
      letterSpacing: tokens.typography.title.h2.letterSpacing,
    },
    h3: {
      fontSize: tokens.typography.title.h3.size,
      fontWeight: tokens.typography.title.h3.weight,
      lineHeight: `${tokens.typography.title.h3.lineHeight}px`,
      letterSpacing: tokens.typography.title.h3.letterSpacing,
    },
    body1: {
      fontSize: tokens.typography.text.body.size,
      lineHeight: `${tokens.typography.text.body.lineHeight}px`,
      letterSpacing: tokens.typography.text.body.letterSpacing,
    },
    body2: {
      fontSize: tokens.typography.text.md.size,
      lineHeight: `${tokens.typography.text.md.lineHeight}px`,
      letterSpacing: tokens.typography.text.md.letterSpacing,
    },
    button: {
      textTransform: "none",
      fontFamily: tokens.typography.fontFamily,
      fontSize: buttonLabel.size,
      fontWeight: buttonLabel.weight,
      lineHeight: `${buttonLabel.lineHeight}px`,
      letterSpacing: buttonLabel.letterSpacing,
    },
  },
  shape: { borderRadius: tokens.radius.md },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          // Atlas Button: 12px radius, 8/12 padding, no text-transform.
          textTransform: "none",
          borderRadius: tokens.radius.lg,
          paddingInline: tokens.space[1.5],
          paddingBlock: tokens.space[1],
          minHeight: 40,
          minWidth: 0,
          fontFamily: tokens.typography.fontFamily,
          fontSize: buttonLabel.size,
          fontWeight: buttonLabel.weight,
          lineHeight: `${buttonLabel.lineHeight}px`,
          letterSpacing: buttonLabel.letterSpacing,
        },
        sizeSmall: {
          minHeight: 32,
          paddingInline: tokens.space[1.5],
          paddingBlock: tokens.space[0.5],
          fontSize: tokens.typography.label.sm.size,
          lineHeight: `${tokens.typography.label.sm.lineHeight}px`,
        },
        // Primary (filled) — Atlas linear gradient.
        containedPrimary: {
          color: tokens.color.action.onPrimary,
          backgroundImage: `linear-gradient(180deg, ${tokens.color.action.primaryGradientStart} 0%, ${tokens.color.action.primaryGradientEnd} 100%)`,
          backgroundColor: tokens.color.action.primaryGradientEnd,
          "&:hover": {
            backgroundImage: `linear-gradient(180deg, ${tokens.color.action.primaryHoverStart} 0%, ${tokens.color.action.primaryHoverEnd} 100%)`,
            backgroundColor: tokens.color.action.primaryHoverEnd,
          },
          "&:active": {
            backgroundImage: `linear-gradient(180deg, ${tokens.color.action.primaryActiveStart} 0%, ${tokens.color.action.primaryActiveEnd} 100%)`,
            backgroundColor: tokens.color.action.primaryActiveEnd,
          },
          "&.Mui-disabled": {
            backgroundImage: "none",
            backgroundColor: tokens.color.action.primaryDisabled,
            color: tokens.color.action.onPrimaryDisabled,
          },
        },
        // Outlined / secondary.
        outlined: {
          color: tokens.color.action.onSecondary,
          borderColor: tokens.color.action.secondaryOutline,
          borderWidth: 1,
          "&:hover": {
            borderColor: tokens.color.action.secondaryOutline,
            backgroundColor: tokens.color.action.secondaryHover,
          },
          "&.Mui-disabled": {
            color: tokens.color.type.disabled,
            borderColor: tokens.color.action.secondaryOutlineDisabled,
          },
        },
        // Tertiary / text.
        text: {
          color: tokens.color.action.onSecondary,
          "&:hover": {
            backgroundColor: tokens.color.action.secondaryHover,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${tokens.color.outline.static}`,
          fontSize: tokens.typography.text.body.size,
          letterSpacing: tokens.typography.text.body.letterSpacing,
          fontFamily: tokens.typography.fontFamily,
        },
        head: {
          color: tokens.color.type.default,
          fontWeight: 600,
          fontSize: tokens.typography.text.md.size,
          lineHeight: `${tokens.typography.text.md.lineHeight}px`,
          letterSpacing: tokens.typography.text.md.letterSpacing,
          textTransform: "none",
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontFamily: tokens.typography.fontFamily,
          borderRadius: tokens.radius.md,
        },
      },
    },
  },
});
