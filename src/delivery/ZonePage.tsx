"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useOutletQuery } from "@/outlets/outletsApi";
import { useStoreSetupQuery } from "@/setup/setupApi";
import { useZonesQuery } from "./deliveryApi";
import { ZoneForm } from "./ZoneForm";

/** The add and edit pages of a delivery zone (``/zones/new`` and
 * ``/zones/[id]``); the branch comes in the ``outlet`` query. */
export function ZonePage() {
  const t = useTranslations("delivery");
  const errorMessage = useErrorMessage();
  const params = useParams<{ id?: string }>();
  const outletId = Number(useSearchParams().get("outlet"));
  const { data: me } = useMe();
  const outlet = useOutletQuery(outletId, {
    skip: !outletId,
    refetchOnMountOrArgChange: true,
  });
  const zones = useZonesQuery(outletId, {
    skip: !outletId,
    refetchOnMountOrArgChange: true,
  });
  const setup = useStoreSetupQuery();
  if (!me) return null;
  if (!can(me.levels, "setup", "full")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const editing = params.id != null;
  const zone = editing
    ? zones.data?.find((z) => z.id === Number(params.id))
    : null;
  const ready = outlet.data && zones.data && (!editing || zone);

  return (
    <Stack spacing={3}>
      <Link href={`/setup/delivery?outlet=${outletId}`}>{t("back")}</Link>
      <Typography variant="h4" component="h1">
        {editing ? t("form.editTitle") : t("form.addTitle")}
      </Typography>
      {(outlet.error || zones.error) && (
        <Alert severity="error">
          {errorMessage((outlet.error ?? zones.error) as ApiError)}
        </Alert>
      )}
      {zones.data && editing && !zone && (
        <Alert severity="error">{t("form.notFound")}</Alert>
      )}
      {!ready && !outlet.error && !zones.error && (
        <CircularProgress aria-label={t("loading")} />
      )}
      {ready && outlet.data && zones.data && (
        <ZoneForm
          outlet={outlet.data}
          zone={zone ?? null}
          others={zones.data}
          currency={setup.data?.country.currencyCode ?? "HNL"}
        />
      )}
    </Stack>
  );
}
