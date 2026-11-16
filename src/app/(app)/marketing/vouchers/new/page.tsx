"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { VoucherForm } from "@/marketing/VoucherForm";

export default function NewVoucherPage() {
  const t = useTranslations("vouchers");
  const { data: me } = useMe();
  if (!me) return null;
  if (
    !can(me.levels, "marketing", "full") &&
    can(me.levels, "marketing", "view")
  ) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  return (
    <Stack spacing={3}>
      <Link href="/marketing/vouchers">{t("back")}</Link>
      <Typography variant="h4" component="h1">
        {t("form.addTitle")}
      </Typography>
      <VoucherForm
        voucher={null}
        privateOnly={!can(me.levels, "marketing", "full")}
      />
    </Stack>
  );
}
