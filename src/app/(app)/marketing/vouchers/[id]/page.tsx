"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { VoucherForm } from "@/marketing/VoucherForm";
import { useVouchersQuery } from "@/marketing/vouchersApi";

export default function EditVoucherPage() {
  const t = useTranslations("vouchers");
  const params = useParams<{ id: string }>();
  const { data: me } = useMe();
  const vouchers = useVouchersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  if (!me) return null;
  const full = can(me.levels, "marketing", "full");
  const voucher = vouchers.data?.find((v) => v.id === Number(params.id));
  // A role with only the private-voucher extra may open private ones.
  const allowed =
    full ||
    (voucher?.visibility === "private" && !can(me.levels, "marketing", "view"));
  return (
    <Stack spacing={3}>
      <Link href="/marketing/vouchers">{t("back")}</Link>
      <Typography variant="h4" component="h1">
        {t("form.editTitle")}
      </Typography>
      {vouchers.isLoading && <CircularProgress aria-label={t("loading")} />}
      {vouchers.data && !voucher && (
        <Alert severity="warning">{t("notFound")}</Alert>
      )}
      {voucher && !allowed && <Alert severity="warning">{t("noAccess")}</Alert>}
      {voucher && allowed && (
        <VoucherForm voucher={voucher} privateOnly={!full} />
      )}
    </Stack>
  );
}
