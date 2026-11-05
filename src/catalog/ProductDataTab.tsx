"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useArchiveProductMutation,
  useUpdateProductMutation,
  type Product,
  type ProductChanges,
} from "./catalogApi";
import { MONEY_INPUT } from "./money";
import { PhotoUpload } from "./PhotoUpload";

interface Props {
  product: Product;
  canEdit: boolean;
  currency: string;
}

export function ProductDataTab({ product, canEdit, currency }: Props) {
  const t = useTranslations("catalog.data");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useUpdateProductMutation();
  const [archive, archiving] = useArchiveProductMutation();
  const archiveError = archiving.error as ApiError | undefined;
  const editable = canEdit && product.archivedAt === null;

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(product.basePrice);
  const [taxIncluded, setTaxIncluded] = useState(product.priceIncludesTax);
  const [sku, setSku] = useState(product.sku ?? "");
  const [prep, setPrep] = useState(
    product.prepTimeMinutes === null ? "" : String(product.prepTimeMinutes),
  );
  const [problems, setProblems] = useState<Record<string, string>>({});

  const submit = async () => {
    const found: Record<string, string> = {};
    if (name.trim() === "") found.name = t("nameRequired");
    if (!MONEY_INPUT.test(price.trim())) found.price = t("priceInvalid");
    const prepText = prep.trim();
    if (
      prepText !== "" &&
      (!/^\d{1,3}$/.test(prepText) || Number(prepText) > 600)
    ) {
      found.prep = t("prepInvalid");
    }
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    const changes: ProductChanges = {
      name: name.trim(),
      description: description.trim() === "" ? null : description.trim(),
      basePrice: price.trim(),
      priceIncludesTax: taxIncluded,
      sku: sku.trim() === "" ? null : sku.trim(),
      prepTimeMinutes: prepText === "" ? null : Number(prepText),
    };
    await save({ id: product.id, changes });
  };

  const field = (key: string) => ({
    error: key in problems,
    helperText: problems[key],
  });
  const touched = () => {
    if (isSuccess || error) reset();
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={3} sx={{ maxWidth: 560 }}>
        {product.archivedAt !== null && (
          <Alert severity="info">{t("archivedNote")}</Alert>
        )}
        {error && (
          <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
        )}
        {archiveError && (
          <Alert severity="error">{errorMessage(archiveError)}</Alert>
        )}
        {isSuccess && <Alert severity="success">{t("saved")}</Alert>}
        <TextField
          label={t("name")}
          value={name}
          disabled={!editable}
          onChange={(event) => {
            setName(event.target.value);
            touched();
          }}
          {...field("name")}
        />
        <TextField
          label={t("description")}
          value={description}
          disabled={!editable}
          multiline
          minRows={2}
          onChange={(event) => {
            setDescription(event.target.value);
            touched();
          }}
        />
        <TextField
          label={t("price", { currency })}
          value={price}
          disabled={!editable}
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          onChange={(event) => {
            setPrice(event.target.value);
            touched();
          }}
          {...field("price")}
        />
        <FormControlLabel
          control={
            <Switch
              checked={taxIncluded}
              disabled={!editable}
              onChange={(event) => {
                setTaxIncluded(event.target.checked);
                touched();
              }}
            />
          }
          label={t("taxIncluded")}
        />
        <TextField
          label={t("sku")}
          value={sku}
          disabled={!editable}
          onChange={(event) => {
            setSku(event.target.value);
            touched();
          }}
        />
        <TextField
          label={t("prep")}
          value={prep}
          disabled={!editable}
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
          onChange={(event) => {
            setPrep(event.target.value);
            touched();
          }}
          {...field("prep")}
        />
        <PhotoUpload
          thumbUrl={product.image?.thumbUrl ?? null}
          disabled={!editable}
          onReady={(mediaId) =>
            save({ id: product.id, changes: { imageMediaId: mediaId } })
          }
          onRemove={() =>
            save({ id: product.id, changes: { imageMediaId: null } })
          }
        />
        {editable && (
          <Stack direction="row" spacing={2}>
            <Button variant="contained" disabled={isLoading} onClick={submit}>
              {t("save")}
            </Button>
            <Button
              color="error"
              disabled={archiving.isLoading}
              onClick={() => archive(product.id)}
            >
              {t("archive")}
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
