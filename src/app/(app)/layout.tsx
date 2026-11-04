import type { ReactNode } from "react";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppShell } from "@/components/shell/AppShell";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
