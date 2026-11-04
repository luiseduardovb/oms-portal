"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { OrdersTab } from "@/setup/OrdersTab";
import { PaymentsTab } from "@/setup/PaymentsTab";
import { StoreTab } from "@/setup/StoreTab";
import { useStoreSetupQuery } from "@/setup/setupApi";

type TabKey = "store" | "payments" | "orders";

export default function SetupPage() {
  const t = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const setup = useStoreSetupQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [tab, setTab] = useState<TabKey>("store");

  if (!me) return null;
  if (!can(me.levels, "setup", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "setup", "full");

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        {t("title")}
      </Typography>
      {!canEdit && <Alert severity="info">{t("readOnly")}</Alert>}
      {setup.error && (
        <Alert severity="error">{errorMessage(setup.error as ApiError)}</Alert>
      )}
      <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
        <Tab value="store" label={t("tabs.store")} />
        <Tab value="payments" label={t("tabs.payments")} />
        <Tab value="orders" label={t("tabs.orders")} />
      </Tabs>
      {setup.isLoading && <CircularProgress aria-label={t("loading")} />}
      {setup.data && tab === "store" && (
        <StoreTab setup={setup.data} canEdit={canEdit} isOwner={me.isOwner} />
      )}
      {setup.data && tab === "payments" && (
        <PaymentsTab setup={setup.data} canEdit={canEdit} />
      )}
      {setup.data && tab === "orders" && (
        <OrdersTab setup={setup.data} canEdit={canEdit} />
      )}
    </Stack>
  );
}
