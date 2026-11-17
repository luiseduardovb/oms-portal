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
import { PromotionForm } from "@/marketing/PromotionForm";
import { usePromotionsQuery } from "@/marketing/promotionsApi";

export default function EditPromotionPage() {
  const t = useTranslations("promotions");
  const params = useParams<{ id: string }>();
  const { data: me } = useMe();
  const promotions = usePromotionsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  if (!me) return null;
  if (!can(me.levels, "marketing", "full")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const promotion = promotions.data?.find((p) => p.id === Number(params.id));
  return (
    <Stack spacing={3}>
      <Link href="/marketing/promotions">{t("back")}</Link>
      <Typography variant="h4" component="h1">
        {t("form.editTitle")}
      </Typography>
      {promotions.isLoading && <CircularProgress aria-label={t("loading")} />}
      {promotions.data && !promotion && (
        <Alert severity="warning">{t("notFound")}</Alert>
      )}
      {promotion && <PromotionForm promotion={promotion} />}
    </Stack>
  );
}
