"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useStoreSetupQuery, type StoreSetup } from "./setupApi";

export type SetupPageName =
  "business" | "branding" | "layout" | "orders" | "payments" | "links";

/** One page of the Setup section: access check, loading, the page frame and
 * a read-only notice, around a form that receives the store's setup. */
export function SetupPage({
  page,
  children,
}: {
  page: SetupPageName;
  children: (ctx: {
    setup: StoreSetup;
    canEdit: boolean;
    isOwner: boolean;
  }) => ReactNode;
}) {
  const t = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const setup = useStoreSetupQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  if (!me) return null;
  if (!can(me.levels, "setup", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "setup", "full");

  return (
    <PageFrame section={t("title")} title={t(`pages.${page}`)}>
      <Stack spacing={3}>
        {!canEdit && <Alert severity="info">{t("readOnly")}</Alert>}
        {setup.error && (
          <Alert severity="error">
            {errorMessage(setup.error as ApiError)}
          </Alert>
        )}
        {setup.isLoading && <CircularProgress aria-label={t("loading")} />}
        {setup.data &&
          children({ setup: setup.data, canEdit, isOwner: me.isOwner })}
      </Stack>
    </PageFrame>
  );
}
