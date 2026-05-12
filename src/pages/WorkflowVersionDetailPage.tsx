import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Breadcrumb } from "@/components/Breadcrumb";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { templatesApi } from "@/api/client";
import { WorkflowViewer } from "@/workflow/WorkflowViewer";
import { tokens } from "@/theme/tokens";

const TEMPLATE_KEY = "findings";

export function WorkflowVersionDetailPage() {
  const { version: versionParam } = useParams<{ version: string }>();
  const version = Number(versionParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const versionQuery = useQuery({
    queryKey: ["version", TEMPLATE_KEY, version],
    queryFn: () => templatesApi.version(TEMPLATE_KEY, version),
    enabled: Number.isFinite(version),
  });
  const latestQuery = useQuery({
    queryKey: ["latest", TEMPLATE_KEY],
    queryFn: () => templatesApi.latest(TEMPLATE_KEY),
  });

  const revert = useMutation({
    mutationFn: () => templatesApi.revert(TEMPLATE_KEY, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["latest", TEMPLATE_KEY] });
      void queryClient.invalidateQueries({
        queryKey: ["versions", TEMPLATE_KEY],
      });
      void queryClient.invalidateQueries({ queryKey: ["draft", TEMPLATE_KEY] });
      navigate("/findings/workflow/versions");
    },
  });

  if (versionQuery.isLoading || latestQuery.isLoading) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  if (!versionQuery.data) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography>Version not found.</Typography>
      </Box>
    );
  }

  const tpl = versionQuery.data;
  const isLatest = latestQuery.data?.version === tpl.version;

  return (
    <Box sx={{ p: 5, maxWidth: 1280, mx: "auto" }}>
      <Breadcrumb
        items={[
          { label: "Audit", to: "/" },
          { label: "Object library", to: "/" },
          { label: "Audit findings", to: "/findings" },
          { label: "Workflow", to: "/findings/workflow" },
          { label: "Versions", to: "/findings/workflow/versions" },
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
            onClick={() => navigate("/findings/workflow/versions")}
          >
            ←
          </Box>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h2">v{tpl.version}</Typography>
              {isLatest && (
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    bgcolor: tokens.color.status.success.bg,
                    color: tokens.color.status.success.content,
                    borderRadius: tokens.radius.full + "px",
                    px: 1.5,
                    py: 0.5,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Latest
                </Box>
              )}
            </Stack>
            <Typography sx={{ fontSize: 14, color: tokens.color.type.muted }}>
              {tpl.name}
              {tpl.createdAt ? ` · ${tpl.createdAt}` : ""}
            </Typography>
          </Box>
        </Stack>
        {!isLatest && (
          <Button
            variant="contained"
            disabled={revert.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {revert.isPending ? "Reverting…" : "Revert to this version"}
          </Button>
        )}
      </Stack>

      <Box
        sx={{
          border: `1px solid ${tokens.color.outline.static}`,
          borderRadius: tokens.radius.md + "px",
          overflow: "hidden",
          bgcolor: tokens.color.surface.default,
          height: "70vh",
        }}
      >
        <WorkflowViewer definition={tpl.definition} />
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title={`Revert to v${tpl.version}?`}
        message="This publishes a copy of this version as the new latest version. Any unsaved draft will be discarded."
        confirmLabel="Revert"
        onConfirm={() => revert.mutate()}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
