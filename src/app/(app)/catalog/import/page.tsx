"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { ExportSection } from "@/catalog/ExportSection";
import { ImportSection } from "@/catalog/ImportSection";

export default function ImportExportPage() {
  const t = useTranslations("catalog.importPage");
  const { data: me } = useMe();

  if (!me) return null;
  if (!can(me.levels, "catalog", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canImport = can(me.levels, "catalog", "full") && me.outlets.all;
  const canExport = me.extras.includes("export_data");

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        {t("title")}
      </Typography>
      {canExport ? (
        <ExportSection />
      ) : (
        <Alert severity="info">{t("noExport")}</Alert>
      )}
      {canImport ? (
        <ImportSection />
      ) : (
        <Alert severity="info">{t("noImport")}</Alert>
      )}
    </Stack>
  );
}
