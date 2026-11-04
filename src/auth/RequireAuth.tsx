"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { useSessionStatus } from "./useSession";

/** Pages inside the portal need a session. The refresh cookie is not sent
 * to page requests, so this check happens in the browser: a short loading
 * state while the session is restored, then the page or the login screen. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const t = useTranslations("session");
  const status = useSessionStatus();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      const next =
        pathname && pathname !== "/"
          ? `?next=${encodeURIComponent(pathname)}`
          : "";
      router.replace(`/login${next}`);
    }
  }, [status, pathname, router]);

  if (status !== "authenticated") {
    return (
      <Box
        role="status"
        sx={{
          display: "grid",
          placeItems: "center",
          minHeight: "60vh",
          gap: 2,
        }}
      >
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t("loading")}</Typography>
      </Box>
    );
  }
  return children;
}
