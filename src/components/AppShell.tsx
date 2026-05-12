import type { ReactNode } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { tokens } from "@/theme/tokens";

interface NavItem {
  label: string;
  active?: boolean;
  caret?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Audit" },
  { label: "Home" },
  { label: "Audit universe" },
  { label: "Audit risk assessment" },
  { label: "Audit planning", caret: true },
  { label: "Object library", active: true },
  { label: "App settings" },
];

const ICONS: Record<string, string> = {
  Audit: "‹",
  Home: "⌂",
  "Audit universe": "◐",
  "Audit risk assessment": "📌",
  "Audit planning": "🔍",
  "Object library": "▦",
  "App settings": "⚙",
};

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: `${tokens.shape.sideNavWidth}px 1fr`,
        gridTemplateRows: `${tokens.shape.headerHeight}px 1fr`,
        gridTemplateAreas: `
          "logo header"
          "nav main"
        `,
        bgcolor: tokens.color.surface.default,
      }}
    >
      <Box
        sx={{
          gridArea: "logo",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2.5,
          borderRight: `1px solid ${tokens.color.outline.static}`,
          borderBottom: `1px solid ${tokens.color.outline.static}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              bgcolor: "#E5304D",
              borderRadius: tokens.radius.sm + "px",
              display: "grid",
              placeItems: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            D
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
            Diligent
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          borderBottom: `1px solid ${tokens.color.outline.static}`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 28,
              height: 28,
              bgcolor: tokens.color.surface.variant,
              borderRadius: tokens.radius.sm + "px",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
            }}
          >
            🏢
          </Box>
          <Typography sx={{ fontWeight: 600 }}>Acme Corporation</Typography>
          <Box sx={{ color: tokens.color.type.muted }}>▾</Box>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton size="small" disabled>
            <Box sx={{ fontSize: 16 }}>⌨</Box>
          </IconButton>
          <Box sx={{ position: "relative" }}>
            <IconButton size="small" disabled>
              <Box sx={{ fontSize: 18 }}>🔔</Box>
            </IconButton>
            <Box
              sx={{
                position: "absolute",
                top: -2,
                right: -2,
                bgcolor: tokens.color.type.default,
                color: "white",
                borderRadius: tokens.radius.full + "px",
                fontSize: 10,
                fontWeight: 700,
                px: 0.75,
                py: 0.25,
                minWidth: 18,
                textAlign: "center",
              }}
            >
              35
            </Box>
          </Box>
          <Avatar sx={{ width: 28, height: 28, bgcolor: tokens.color.surface.variant }}>
            <Box sx={{ fontSize: 14 }}>👤</Box>
          </Avatar>
        </Stack>
      </Box>

      <Box
        sx={{
          gridArea: "nav",
          borderRight: `1px solid ${tokens.color.outline.static}`,
          py: 2,
        }}
      >
        <Stack spacing={0.25} sx={{ px: 1 }}>
          {NAV_ITEMS.map((item) => (
            <Box
              key={item.label}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: tokens.radius.sm + "px",
                bgcolor: item.active ? tokens.color.selection.primary : "transparent",
                color: item.active
                  ? tokens.color.action.primary
                  : tokens.color.type.default,
                cursor: "default",
                userSelect: "none",
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box sx={{ width: 20, textAlign: "center", fontSize: 14 }}>
                  {ICONS[item.label] ?? "•"}
                </Box>
                <Typography
                  sx={{
                    fontWeight: item.active ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  {item.label}
                </Typography>
              </Stack>
              {item.caret && <Box sx={{ color: tokens.color.type.muted }}>▾</Box>}
            </Box>
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          gridArea: "main",
          overflow: "auto",
          bgcolor: tokens.color.surface.default,
          color: theme.palette.text.primary,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
