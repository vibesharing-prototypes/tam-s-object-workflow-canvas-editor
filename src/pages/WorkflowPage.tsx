import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Breadcrumb } from "@/components/Breadcrumb";
import { templatesApi } from "@/api/client";
import { WorkflowEditor } from "@/workflow/WorkflowEditor";
import { WorkflowViewer } from "@/workflow/WorkflowViewer";
import { tokens } from "@/theme/tokens";

const TEMPLATE_KEY = "findings";

export function WorkflowPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"view" | "edit">("view");

  const latestQuery = useQuery({
    queryKey: ["latest", TEMPLATE_KEY],
    queryFn: () => templatesApi.latest(TEMPLATE_KEY),
  });
  const draftQuery = useQuery({
    queryKey: ["draft", TEMPLATE_KEY],
    queryFn: () => templatesApi.draft(TEMPLATE_KEY),
  });

  const latest = latestQuery.data;
  const draft = draftQuery.data;

  if (latestQuery.isLoading || draftQuery.isLoading) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  // Editor always works against the latest published version. If a draft
  // exists, it was made from that version, so resume it.
  const initial = draft ?? latest;
  if (!initial) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography>No template available.</Typography>
      </Box>
    );
  }

  const back = () => navigate("/findings");
  const hasDraft = Boolean(draft);

  if (mode === "edit") {
    return (
      <WorkflowEditor
        templateKey={TEMPLATE_KEY}
        initialDefinition={initial.definition}
        initialName={initial.name}
        initialService={initial.service}
        basedOnVersion={draft?.basedOnVersion ?? latest?.version ?? null}
        hasDraft={hasDraft}
        onPublished={() => setMode("view")}
        onCancel={() => setMode("view")}
      />
    );
  }

  return (
    <Box sx={{ px: 6, py: 3, maxWidth: 1380, mx: "auto" }}>
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
            onClick={back}
          >
            ←
          </Box>
          <Box>
            <Typography variant="h2">{latest?.name ?? initial.name}</Typography>
            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 0.5, color: tokens.color.type.muted, fontSize: 13 }}
            >
              <span>Audit finding workflow</span>
              <span>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  Active since:
                </Box>{" "}
                {latest?.createdAt ?? "[date]"}
              </span>
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {hasDraft && (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ color: tokens.color.type.muted, fontSize: 13 }}
            >
              <Box sx={{ fontSize: 14 }}>ⓘ</Box>
              <span>Unpublished changes</span>
            </Stack>
          )}
          <Button variant="contained" onClick={() => setMode("edit")}>
            Edit
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          border: `1px solid ${tokens.color.outline.static}`,
          borderRadius: tokens.radius.md + "px",
          overflow: "hidden",
          bgcolor: tokens.color.surface.variantSubtle,
          height: "calc(100vh - 220px)",
        }}
      >
        <WorkflowViewer definition={initial.definition} />
      </Box>
    </Box>
  );
}
