import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SeverityBadge, StatePill } from "@/components/StatusPill";
import { findingsApi, templatesApi } from "@/api/client";
import { tokens } from "@/theme/tokens";

const TEMPLATE_KEY = "findings";

export function FindingsListPage() {
  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["findings"],
    queryFn: () => findingsApi.list(),
  });
  const { data: latest } = useQuery({
    queryKey: ["latest", TEMPLATE_KEY],
    queryFn: () => templatesApi.latest(TEMPLATE_KEY),
  });
  const [manageAnchor, setManageAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  return (
    <Box sx={{ px: 6, py: 3, maxWidth: 1380, mx: "auto" }}>
      <Breadcrumb
        items={[
          { label: "Audit", to: "/" },
          { label: "Object library", to: "/" },
        ]}
      />

      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <Box
            sx={{
              color: tokens.color.type.muted,
              fontSize: 22,
              cursor: "pointer",
              mt: 0.25,
            }}
            onClick={() => navigate("/")}
          >
            ←
          </Box>
          <Box>
            <Typography variant="h2">Audit findings</Typography>
            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 0.5, color: tokens.color.type.muted, fontSize: 13 }}
            >
              <span>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  Workflow:
                </Box>{" "}
                {latest?.name ?? "—"}
              </span>
              <span>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  Schema:
                </Box>{" "}
                AF EMEA
              </span>
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            onClick={(e) => setManageAnchor(e.currentTarget)}
            endIcon={<Box sx={{ fontSize: 12 }}>▾</Box>}
          >
            Manage
          </Button>
          <Menu
            anchorEl={manageAnchor}
            open={Boolean(manageAnchor)}
            onClose={() => setManageAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Box
              sx={{ px: 2, py: 1, fontSize: 12, color: tokens.color.type.muted }}
            >
              Manage Audit findings
            </Box>
            <MenuItem disabled>
              <Box sx={{ mr: 1.5, fontSize: 14 }}>☑</Box>
              Open schema
            </MenuItem>
            <MenuItem
              onClick={() => {
                setManageAnchor(null);
                navigate("/findings/workflow");
              }}
            >
              <Box sx={{ mr: 1.5, fontSize: 14 }}>🛡</Box>
              Open workflow
            </MenuItem>
          </Menu>
          <Button
            variant="contained"
            startIcon={<Box sx={{ fontSize: 14 }}>+</Box>}
          >
            Add
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={3}
        alignItems="flex-end"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              mb: 0.5,
              color: tokens.color.type.default,
            }}
          >
            Search
          </Typography>
          <TextField
            size="small"
            placeholder="Search by"
            disabled
            sx={{ minWidth: 320 }}
          />
        </Box>
        <Box sx={{ pb: 1 }}>
          <ToolbarButton icon="⌕" label="Filter" />
        </Box>
        <Box sx={{ pb: 1 }}>
          <ToolbarButton icon="▦" label="Columns" />
        </Box>
      </Stack>

      <Box
        sx={{
          border: `1px solid ${tokens.color.outline.static}`,
          borderRadius: tokens.radius.md + "px",
          overflow: "hidden",
          bgcolor: tokens.color.surface.default,
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 100 }}>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell sx={{ width: 130 }}>Severity</TableCell>
              <TableCell sx={{ width: 140 }}>Status</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Reporter</TableCell>
              <TableCell>Added at</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && findings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                  No findings.
                </TableCell>
              </TableRow>
            )}
            {findings.map((f) => (
              <TableRow
                key={f.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => navigate(`/findings/${f.id}`)}
              >
                <TableCell sx={{ color: tokens.color.type.muted }}>
                  {f.externalId}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/findings/${f.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: tokens.color.action.link,
                      textDecoration: "underline",
                    }}
                  >
                    {f.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={f.severity} />
                </TableCell>
                <TableCell>
                  <StatePill state={f.currentState} />
                </TableCell>
                <TableCell>
                  <PersonCell person={f.owner} />
                </TableCell>
                <TableCell>
                  <PersonCell person={f.approver} />
                </TableCell>
                <TableCell>
                  <Box>
                    <Box
                      sx={{
                        color: tokens.color.action.link,
                        textDecoration: "underline",
                      }}
                    >
                      Control test name
                    </Box>
                    <Box sx={{ fontSize: 12, color: tokens.color.type.muted }}>
                      Control test • CT-12
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 2, color: tokens.color.type.muted, fontSize: 13 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <span>Rows</span>
          <Box
            sx={{
              border: `1px solid ${tokens.color.outline.static}`,
              borderRadius: tokens.radius.sm + "px",
              px: 1.25,
              py: 0.5,
              fontSize: 13,
              color: tokens.color.type.default,
            }}
          >
            15 ▾
          </Box>
          <span>1–{findings.length} of 1,437</span>
        </Stack>
        <Stack direction="row" spacing={1}>
          <PageBtn>‹</PageBtn>
          <PageBtn>›</PageBtn>
        </Stack>
      </Stack>
    </Box>
  );
}

function ToolbarButton({ icon, label }: { icon: string; label: string }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        color: tokens.color.type.default,
        fontSize: 14,
        userSelect: "none",
      }}
    >
      <Box sx={{ fontSize: 14, color: tokens.color.type.muted }}>{icon}</Box>
      <span>{label}</span>
    </Stack>
  );
}

function PersonCell({
  person,
}: {
  person: { name: string; initials: string } | null;
}) {
  if (!person) return <span>—</span>;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Avatar
        sx={{
          width: 24,
          height: 24,
          fontSize: 11,
          bgcolor: tokens.color.surface.variant,
          color: tokens.color.type.default,
        }}
      >
        {person.initials}
      </Avatar>
      <span>{person.name}</span>
    </Stack>
  );
}

function PageBtn({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        display: "grid",
        placeItems: "center",
        border: `1px solid ${tokens.color.outline.static}`,
        borderRadius: tokens.radius.sm + "px",
        color: tokens.color.type.muted,
        fontSize: 14,
      }}
    >
      {children}
    </Box>
  );
}
