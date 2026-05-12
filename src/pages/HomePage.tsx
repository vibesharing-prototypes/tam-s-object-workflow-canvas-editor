import { Box, Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { tokens } from "@/theme/tokens";

interface Tile {
  label: string;
  count: number;
  to?: string;
}

const TILES: Tile[] = [
  { label: "Audit findings", count: 56, to: "/findings" },
  { label: "Controls", count: 132 },
  { label: "Control assessments", count: 205 },
  { label: "Assessment methods", count: 297 },
  { label: "Processes", count: 28 },
  { label: "Evidence", count: 421 },
];

export function HomePage() {
  return (
    <Box sx={{ p: 5, maxWidth: 1280, mx: "auto" }}>
      <Breadcrumb items={[{ label: "Audit" }]} />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 4 }}
      >
        <Typography variant="h2">Object library</Typography>
        <Button
          variant="contained"
          endIcon={<Box sx={{ fontSize: 12 }}>▾</Box>}
        >
          Add object
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 2,
        }}
      >
        {TILES.map((tile) => (
          <TileCard key={tile.label} tile={tile} />
        ))}
      </Box>
    </Box>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  const interactive = Boolean(tile.to);
  const inner = (
    <Box
      sx={{
        bgcolor: tokens.color.surface.default,
        border: `1px solid ${tokens.color.outline.static}`,
        borderRadius: tokens.radius.md + "px",
        p: 3,
        cursor: interactive ? "pointer" : "default",
        transition: "border-color 120ms",
        "&:hover": interactive
          ? { borderColor: tokens.color.action.primary }
          : undefined,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            {tile.label}
          </Typography>
          <Typography
            sx={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {tile.count}
          </Typography>
        </Box>
        <Stack alignItems="flex-end" sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 12, color: tokens.color.type.muted }}>
            Last updated
          </Typography>
          <Typography sx={{ fontSize: 12, color: tokens.color.type.muted }}>
            DD-MM-YYYY HH:MM
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );

  return interactive ? (
    <Link to={tile.to!} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
