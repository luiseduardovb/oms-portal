"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { ApiStatus } from "@/components/ApiStatus";
import { displayName } from "@/components/shell/UserMenu";

export default function HomePage() {
  const t = useTranslations("home");
  const { data: me } = useMe();
  const router = useRouter();
  // As in Zyda, the dashboard opens on the orders.
  const toOrders = me ? can(me.levels, "orders", "view") : false;
  useEffect(() => {
    if (toOrders) router.replace("/orders");
  }, [toOrders, router]);
  if (toOrders) return null;
  return (
    <Stack spacing={4} sx={{ maxWidth: 640 }}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1">
          {me ? t("welcome", { name: displayName(me.user) }) : t("title")}
        </Typography>
        <Typography color="text.secondary">
          {me
            ? t("merchantLine", {
                merchant: me.merchant.name,
                role: me.role.name,
              })
            : t("subtitle")}
        </Typography>
      </Stack>
      <ApiStatus />
    </Stack>
  );
}
