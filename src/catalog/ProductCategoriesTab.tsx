"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useCategoriesQuery,
  useReplaceProductCategoriesMutation,
  type Product,
} from "./catalogApi";

const MAX = 20;

export function ProductCategoriesTab({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const t = useTranslations("catalog.categories");
  const errorMessage = useErrorMessage();
  const categories = useCategoriesQuery();
  const [save, { isLoading, error, isSuccess, reset }] =
    useReplaceProductCategoriesMutation();
  const [chosen, setChosen] = useState<number[]>(
    product.categories.map((c) => c.id),
  );
  const editable = canEdit && product.archivedAt === null;

  const toggle = (id: number, on: boolean) => {
    reset();
    setChosen((now) => (on ? [...now, id] : now.filter((x) => x !== id)));
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        {categories.error && (
          <Alert severity="error">
            {errorMessage(categories.error as ApiError)}
          </Alert>
        )}
        {error && (
          <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
        )}
        {isSuccess && <Alert severity="success">{t("saved")}</Alert>}
        {categories.data?.length === 0 && (
          <Typography color="text.secondary">{t("none")}</Typography>
        )}
        <Stack role="group" aria-label={t("title")}>
          {categories.data?.map((category) => (
            <FormControlLabel
              key={category.id}
              label={category.name}
              control={
                <Checkbox
                  checked={chosen.includes(category.id)}
                  disabled={
                    !editable ||
                    (!chosen.includes(category.id) && chosen.length >= MAX)
                  }
                  onChange={(event) =>
                    toggle(category.id, event.target.checked)
                  }
                />
              }
            />
          ))}
        </Stack>
        {chosen.length >= MAX && (
          <Typography variant="caption" color="text.secondary">
            {t("max", { max: MAX })}
          </Typography>
        )}
        {editable && (
          <div>
            <Button
              variant="contained"
              disabled={isLoading}
              onClick={() => save({ id: product.id, categoryIds: chosen })}
            >
              {t("save")}
            </Button>
          </div>
        )}
      </Stack>
    </Paper>
  );
}
