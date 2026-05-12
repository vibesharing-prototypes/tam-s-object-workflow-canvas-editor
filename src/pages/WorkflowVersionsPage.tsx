import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Breadcrumb } from "@/components/Breadcrumb";
import { templatesApi } from "@/api/client";
import { tokens } from "@/theme/tokens";

const TEMPLATE_KEY = "findings";

export function WorkflowVersionsPage() {
  const navigate = useNavigate();

  const versionsQuery = useQuery({
    queryKey: ["versions", TEMPLATE_KEY],
    queryFn: () => templatesApi.versions(TEMPLATE_KEY),
  });

  const versions = versionsQuery.data ?? [];
  const latestVersion = versions[0]?.version ?? null;

  return (
    <Box sx={{ p: 5, maxWidth: 1280, mx: "auto" }}>
      <Breadcrumb
        items={[
          { label: "Audit", to: "/" },
          { label: "Object library", to: "/" },
          { label: "Audit findings", to: "/findings" },
          { label: "Workflow", to: "/findings/workflow" },
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
            onClick={() => navigate("/findings/workflow")}
          >
            ←
          </Box>
          <Box>
            <Typography variant="h2">Versions</Typography>
            <Typography sx={{ fontSize: 14, color: tokens.color.type.muted }}>
              Audit finding workflow
            </Typography>
          </Box>
        </Stack>
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
              <TableCell sx={{ width: 80 }}>Version</TableCell>
              <TableCell>Name</TableCell>
              <TableCell sx={{ width: 220 }}>Created</TableCell>
              <TableCell sx={{ width: 100 }}>Status</TableCell>
              <TableCell sx={{ width: 160 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {versionsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!versionsQuery.isLoading && versions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                  No versions published yet.
                </TableCell>
              </TableRow>
            )}
            {versions.map((v) => {
              const isLatest = v.version === latestVersion;
              return (
                <TableRow key={v.version}>
                  <TableCell>
                    <RouterLink
                      to={`/findings/workflow/versions/${v.version}`}
                      style={{
                        color: tokens.color.action.link,
                        textDecoration: "underline",
                      }}
                    >
                      v{v.version}
                    </RouterLink>
                  </TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell sx={{ color: tokens.color.type.muted }}>
                    {v.createdAt ?? "—"}
                  </TableCell>
                  <TableCell>
                    {isLatest ? (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          bgcolor: tokens.color.status.success.bg,
                          color: tokens.color.status.success.content,
                          borderRadius: tokens.radius.full + "px",
                          px: 1.25,
                          py: 0.25,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Latest
                      </Box>
                    ) : (
                      <Typography
                        sx={{ color: tokens.color.type.muted, fontSize: 13 }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/findings/workflow/versions/${v.version}`}
                      size="small"
                      variant="text"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
