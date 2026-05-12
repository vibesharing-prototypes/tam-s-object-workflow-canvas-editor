import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SeverityBadge, StatePill } from "@/components/StatusPill";
import { findingsApi } from "@/api/client";
import { WorkflowViewer } from "@/workflow/WorkflowViewer";
import { tokens } from "@/theme/tokens";

export function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const findingId = Number(id);

  const { data: finding, isLoading } = useQuery({
    queryKey: ["finding", findingId],
    queryFn: () => findingsApi.detail(findingId),
    enabled: Number.isFinite(findingId),
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography>Loading…</Typography>
      </Box>
    );
  }
  if (!finding) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography>Finding not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 5, maxWidth: 1280, mx: "auto" }}>
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
            onClick={() => navigate("/findings")}
          >
            ←
          </Box>
          <Box>
            <Typography
              sx={{ fontSize: 12, color: tokens.color.type.muted, mb: 0.25 }}
            >
              {finding.externalId}
            </Typography>
            <Typography variant="h2">{finding.title}</Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          onClick={() => navigate("/findings/workflow")}
        >
          ✎ Edit workflow
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 3,
          mb: 4,
          p: 3,
          bgcolor: tokens.color.surface.variantSubtle,
          border: `1px solid ${tokens.color.outline.static}`,
          borderRadius: tokens.radius.md + "px",
        }}
      >
        <DetailField label="Severity">
          <SeverityBadge severity={finding.severity} />
        </DetailField>
        <DetailField label="Status">
          <StatePill state={finding.currentState} />
        </DetailField>
        <DetailField label="Owner">
          <PersonInline person={finding.owner} />
        </DetailField>
        <DetailField label="Approver">
          <PersonInline person={finding.approver} />
        </DetailField>
      </Box>

      <Box
        sx={{
          border: `1px solid ${tokens.color.outline.static}`,
          borderRadius: tokens.radius.md + "px",
          overflow: "hidden",
          bgcolor: tokens.color.surface.default,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${tokens.color.outline.static}`,
          }}
        >
          <Typography sx={{ fontWeight: 600 }}>Workflow</Typography>
          <Typography sx={{ fontSize: 12, color: tokens.color.type.muted }}>
            {finding.template?.name}
            {finding.template ? ` · v${finding.template.version}` : ""}
          </Typography>
        </Box>
        <Box sx={{ height: 480 }}>
          {finding.template ? (
            <WorkflowViewer
              definition={finding.template.definition}
              currentState={finding.currentState}
            />
          ) : (
            <Box sx={{ p: 4, color: tokens.color.type.muted }}>
              No template.
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          color: tokens.color.type.muted,
          letterSpacing: 0.5,
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function PersonInline({
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
