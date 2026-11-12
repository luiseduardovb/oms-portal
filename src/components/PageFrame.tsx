"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** The frame every portal page shares, as in Zyda: a small section name
 * above a large title, with the page's main action on the right. */
export function PageFrame({
  section,
  title,
  actions,
  maxWidth = 960,
  children,
}: {
  section?: string;
  title: string;
  actions?: ReactNode;
  maxWidth?: number | string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ maxWidth }}>
      <Stack
        direction="row"
        sx={{ alignItems: "flex-end", justifyContent: "space-between", mb: 3 }}
      >
        <Box>
          {section ? (
            <Typography variant="body2" color="text.secondary">
              {section}
            </Typography>
          ) : null}
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, fontSize: { xs: 24, md: 30 } }}
          >
            {title}
          </Typography>
        </Box>
        {actions}
      </Stack>
      {children}
    </Box>
  );
}

/** A bar that stays at the bottom of the screen with the page's save button. */
export function StickySave({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 5,
        display: "flex",
        justifyContent: "flex-end",
        py: 2,
        mt: 3,
        bgcolor: "background.default",
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      {children}
    </Box>
  );
}
