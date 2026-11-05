"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { ContactsTab } from "@/outlets/ContactsTab";
import { DataTab } from "@/outlets/DataTab";
import { ExceptionsTab } from "@/outlets/ExceptionsTab";
import { HoursTab } from "@/outlets/HoursTab";
import { useOutletQuery, useRestoreOutletMutation } from "@/outlets/outletsApi";

type TabKey = "data" | "hours" | "exceptions" | "contacts";

export default function OutletPage() {
  const t = useTranslations("outlets");
  const errorMessage = useErrorMessage();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: me } = useMe();
  const outlet = useOutletQuery(id, { refetchOnMountOrArgChange: true });
  const [restore, restoring] = useRestoreOutletMutation();
  const [tab, setTab] = useState<TabKey>("data");

  if (!me) return null;
  if (!can(me.levels, "setup", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "setup", "full");
  const data = outlet.data;
  const archived = data?.archivedAt != null;

  return (
    <Stack spacing={3}>
      <Link href="/outlets">{t("back")}</Link>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h4" component="h1">
          {data?.name ?? t("title")}
        </Typography>
        {archived && canEdit && me.outlets.all && (
          <Button
            variant="outlined"
            disabled={restoring.isLoading}
            onClick={() => restore(id)}
          >
            {t("restore")}
          </Button>
        )}
      </Stack>
      {outlet.error && (
        <Alert severity="error">{errorMessage(outlet.error as ApiError)}</Alert>
      )}
      {restoring.error && (
        <Alert severity="error">
          {errorMessage(restoring.error as ApiError)}
        </Alert>
      )}
      {outlet.isLoading && <CircularProgress aria-label={t("loading")} />}
      {data && (
        <>
          <Tabs
            value={tab}
            onChange={(_event, value) => setTab(value)}
            variant="scrollable"
          >
            <Tab value="data" label={t("tabs.data")} />
            <Tab value="hours" label={t("tabs.hours")} />
            <Tab value="exceptions" label={t("tabs.exceptions")} />
            <Tab value="contacts" label={t("tabs.contacts")} />
          </Tabs>
          {tab === "data" && (
            <DataTab
              key={`data-${data.archivedAt}`}
              outlet={data}
              canEdit={canEdit}
              canArchive
            />
          )}
          {tab === "hours" && (
            <HoursTab
              key={`hours-${data.archivedAt}`}
              outlet={data}
              canEdit={canEdit}
            />
          )}
          {tab === "exceptions" && (
            <ExceptionsTab
              key={`exceptions-${data.archivedAt}`}
              outlet={data}
              canEdit={canEdit}
            />
          )}
          {tab === "contacts" && (
            <ContactsTab
              key={`contacts-${data.archivedAt}`}
              outlet={data}
              canEdit={canEdit}
            />
          )}
        </>
      )}
    </Stack>
  );
}
