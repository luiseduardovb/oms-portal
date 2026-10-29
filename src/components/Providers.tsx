"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { StoreProvider } from "@/store/StoreProvider";
import { theme } from "@/theme/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StoreProvider>{children}</StoreProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
