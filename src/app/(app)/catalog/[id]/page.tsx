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
import {
  useProductQuery,
  useRestoreProductMutation,
} from "@/catalog/catalogApi";
import { currencySymbol } from "@/catalog/money";
import { ProductAvailabilityTab } from "@/catalog/ProductAvailabilityTab";
import { ProductCategoriesTab } from "@/catalog/ProductCategoriesTab";
import { ProductDataTab } from "@/catalog/ProductDataTab";
import { ProductOptionsTab } from "@/catalog/ProductOptionsTab";
import { useErrorMessage } from "@/lib/useErrorMessage";

type TabKey = "data" | "categories" | "options" | "availability";

export default function ProductPage() {
  const t = useTranslations("catalog");
  const errorMessage = useErrorMessage();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: me } = useMe();
  const product = useProductQuery(id, { refetchOnMountOrArgChange: true });
  const [restore, restoring] = useRestoreProductMutation();
  const [tab, setTab] = useState<TabKey>("data");

  if (!me) return null;
  if (!can(me.levels, "catalog", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  // Product details are shared by every outlet, so a member limited to some
  // outlets can look but not change them (the server enforces the same).
  const full = can(me.levels, "catalog", "full");
  const canEdit = full && me.outlets.all;
  const data = product.data;
  const archived = data?.archivedAt != null;

  return (
    <Stack spacing={3}>
      <Link href="/catalog">{t("back")}</Link>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h4" component="h1">
          {data?.name ?? t("title")}
        </Typography>
        {archived && canEdit && (
          <Button
            variant="outlined"
            disabled={restoring.isLoading}
            onClick={() => restore(id)}
          >
            {t("restore")}
          </Button>
        )}
      </Stack>
      {product.error && (
        <Alert severity="error">
          {errorMessage(product.error as ApiError)}
        </Alert>
      )}
      {restoring.error && (
        <Alert severity="error">
          {errorMessage(restoring.error as ApiError)}
        </Alert>
      )}
      {product.isLoading && <CircularProgress aria-label={t("loading")} />}
      {data && (
        <>
          <Tabs
            value={tab}
            onChange={(_event, value) => setTab(value)}
            variant="scrollable"
          >
            <Tab value="data" label={t("tabs.data")} />
            <Tab value="categories" label={t("tabs.categories")} />
            <Tab value="options" label={t("tabs.options")} />
            <Tab value="availability" label={t("tabs.availability")} />
          </Tabs>
          {tab === "data" && (
            <ProductDataTab
              key={`data-${data.archivedAt}`}
              product={data}
              canEdit={canEdit}
              currency={currencySymbol(me.merchant.currencyCode)}
            />
          )}
          {tab === "categories" && (
            <ProductCategoriesTab
              key={`cat-${data.archivedAt}`}
              product={data}
              canEdit={canEdit}
            />
          )}
          {tab === "options" && (
            <ProductOptionsTab
              key={`opt-${data.archivedAt}`}
              product={data}
              canEdit={canEdit}
            />
          )}
          {tab === "availability" && (
            <ProductAvailabilityTab
              product={data}
              canManage={full}
              canToggle={me.extras.includes("availability_toggle")}
            />
          )}
        </>
      )}
    </Stack>
  );
}
