"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { PromotionForm } from "@/marketing/PromotionForm";

export default function NewPromotionPage() {
  const t = useTranslations("promotions");
  const { data: me } = useMe();
  if (!me) return null;
  if (!can(me.levels, "marketing", "full")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  return (
    <Stack spacing={3}>
      <Link href="/marketing/promotions">{t("back")}</Link>
      <Typography variant="h4" component="h1">
        {t("form.addTitle")}
      </Typography>
      <PromotionForm promotion={null} />
    </Stack>
  );
}
