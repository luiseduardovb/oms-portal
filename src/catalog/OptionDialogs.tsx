"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useOutletsQuery } from "@/outlets/outletsApi";
import {
  useCreateOptionGroupMutation,
  useCreateOptionMutation,
  useSetOptionAvailabilityMutation,
  useUpdateOptionGroupMutation,
  useUpdateOptionMutation,
  type Option,
  type OptionGroup,
} from "./catalogApi";

const WHOLE = /^\d{1,2}$/;
const SIGNED_MONEY = /^-?\d{1,10}(\.\d{1,2})?$/;

export function GroupDialog({
  group,
  onClose,
}: {
  group: OptionGroup | null;
  onClose: () => void;
}) {
  const t = useTranslations("catalog.groupDialog");
  const errorMessage = useErrorMessage();
  const [create, creating] = useCreateOptionGroupMutation();
  const [update, updating] = useUpdateOptionGroupMutation();
  const [name, setName] = useState(group?.name ?? "");
  const [type, setType] = useState(group?.selectionType ?? "single");
  const [required, setRequired] = useState(
    group ? group.minSelect >= 1 : false,
  );
  const [min, setMin] = useState(String(group?.minSelect ?? 0));
  const [max, setMax] = useState(String(group?.maxSelect ?? 3));
  const [problems, setProblems] = useState<Record<string, string>>({});
  const error = (creating.error ?? updating.error) as ApiError | undefined;
  const single = type === "single";

  const submit = async () => {
    const found: Record<string, string> = {};
    if (name.trim() === "") found.name = t("nameRequired");
    let minSelect = required ? 1 : 0;
    let maxSelect = 1;
    if (!single) {
      if (!WHOLE.test(min.trim())) found.min = t("minInvalid");
      if (!WHOLE.test(max.trim()) || Number(max) < 1) {
        found.max = t("maxInvalid");
      } else if (WHOLE.test(min.trim()) && Number(min) > Number(max)) {
        found.min = t("minAboveMax");
      }
      minSelect = Number(min);
      maxSelect = Number(max);
    }
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    const result = group
      ? await update({
          id: group.id,
          changes: {
            name: name.trim(),
            selectionType: type as "single" | "multiple",
            minSelect,
            maxSelect,
          },
        })
      : await create({
          name: name.trim(),
          selectionType: type as "single" | "multiple",
          minSelect,
          maxSelect,
        });
    if ("data" in result && result.data) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{group ? t("editTitle") : t("newTitle")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{errorMessage(error)}</Alert>}
          <TextField
            label={t("name")}
            value={name}
            autoFocus
            error={"name" in problems}
            helperText={problems.name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            select
            label={t("type")}
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <MenuItem value="single">{t("single")}</MenuItem>
            <MenuItem value="multiple">{t("multiple")}</MenuItem>
          </TextField>
          {single ? (
            <FormControlLabel
              control={
                <Switch
                  checked={required}
                  onChange={(event) => setRequired(event.target.checked)}
                />
              }
              label={t("required")}
            />
          ) : (
            <>
              <TextField
                label={t("min")}
                value={min}
                error={"min" in problems}
                helperText={problems.min ?? t("minHelp")}
                onChange={(event) => setMin(event.target.value)}
              />
              <TextField
                label={t("max")}
                value={max}
                error={"max" in problems}
                helperText={problems.max}
                onChange={(event) => setMax(event.target.value)}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button
          variant="contained"
          disabled={creating.isLoading || updating.isLoading}
          onClick={submit}
        >
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function OptionDialog({
  groupId,
  option,
  currency,
  onClose,
}: {
  groupId: number;
  option: Option | null;
  currency: string;
  onClose: () => void;
}) {
  const t = useTranslations("catalog.optionDialog");
  const errorMessage = useErrorMessage();
  const [create, creating] = useCreateOptionMutation();
  const [update, updating] = useUpdateOptionMutation();
  const [name, setName] = useState(option?.name ?? "");
  const [price, setPrice] = useState(option?.priceDelta ?? "0");
  const [isDefault, setIsDefault] = useState(option?.isDefault ?? false);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const error = (creating.error ?? updating.error) as ApiError | undefined;

  const submit = async () => {
    const found: Record<string, string> = {};
    if (name.trim() === "") found.name = t("nameRequired");
    if (!SIGNED_MONEY.test(price.trim())) found.price = t("priceInvalid");
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    const result = option
      ? await update({
          id: option.id,
          changes: {
            name: name.trim(),
            priceDelta: price.trim(),
            isDefault,
          },
        })
      : await create({
          groupId,
          option: { name: name.trim(), priceDelta: price.trim(), isDefault },
        });
    if ("data" in result && result.data) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{option ? t("editTitle") : t("newTitle")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{errorMessage(error)}</Alert>}
          <TextField
            label={t("name")}
            value={name}
            autoFocus
            error={"name" in problems}
            helperText={problems.name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label={t("price", { currency })}
            value={price}
            error={"price" in problems}
            helperText={problems.price ?? t("priceHelp")}
            onChange={(event) => setPrice(event.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
              />
            }
            label={t("default")}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button
          variant="contained"
          disabled={creating.isLoading || updating.isLoading}
          onClick={submit}
        >
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AvailabilityDialog({
  option,
  onClose,
}: {
  option: Option;
  onClose: () => void;
}) {
  const t = useTranslations("catalog.optionAvailability");
  const errorMessage = useErrorMessage();
  const outlets = useOutletsQuery();
  const [set, { isLoading, error }] = useSetOptionAvailabilityMutation();
  // The list refreshes after each change; read the latest from it.
  const [unavailable, setUnavailable] = useState(option.unavailableOutletIds);
  const rows = (outlets.data ?? []).filter((o) => o.archivedAt === null);
  const failure = (error ?? outlets.error) as ApiError | undefined;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("title", { name: option.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{t("help")}</Typography>
          {failure && <Alert severity="error">{errorMessage(failure)}</Alert>}
          {outlets.data && rows.length === 0 && (
            <Typography color="text.secondary">{t("none")}</Typography>
          )}
          {rows.map((outlet) => (
            <FormControlLabel
              key={outlet.id}
              label={outlet.name}
              control={
                <Switch
                  checked={!unavailable.includes(outlet.id)}
                  disabled={isLoading}
                  onChange={async (event) => {
                    // Read it now: a controlled input resets after the await.
                    const available = event.target.checked;
                    const result = await set({
                      id: option.id,
                      outletId: outlet.id,
                      isAvailable: available,
                    });
                    if ("data" in result && result.data) {
                      setUnavailable(
                        available
                          ? unavailable.filter((id) => id !== outlet.id)
                          : [...unavailable, outlet.id],
                      );
                    }
                  }}
                />
              }
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
