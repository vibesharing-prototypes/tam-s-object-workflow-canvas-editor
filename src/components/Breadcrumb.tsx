import { Box, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "@/theme/tokens";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      {items.map((item, i) => (
        <Stack
          key={`${item.label}-${i}`}
          direction="row"
          spacing={1}
          alignItems="center"
        >
          {item.to ? (
            <Link
              to={item.to}
              style={{
                color: tokens.color.type.muted,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              {item.label}
            </Link>
          ) : (
            <Typography sx={{ color: tokens.color.type.muted, fontSize: 14 }}>
              {item.label}
            </Typography>
          )}
          {i < items.length - 1 && (
            <Box sx={{ color: tokens.color.type.muted, fontSize: 14 }}>›</Box>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
