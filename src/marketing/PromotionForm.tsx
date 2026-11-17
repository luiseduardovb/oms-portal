"use client";

import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useCategoriesQuery, useProductsQuery } from "@/catalog/catalogApi";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useOutletsQuery } from "@/outlets/outletsApi";
import {
  useCreatePromotionMutation,
  useReplacePromotionMutation,
  type Promotion,
  type PromotionIn,
} from "./promotionsApi";

/** An ISO time as the value of a datetime-local field (the browser's zone). */
function local(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function iso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function number(value: string): number | null {
  const n = Number(value.replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

interface ProductChoice {
  id: number;
  name: string;
}

/** The form of the add and edit pages of promotions. */
export function PromotionForm({ promotion }: { promotion: Promotion | null }) {
  return <Form key={promotion?.id ?? "new"} promotion={promotion} />;
}

function Form({ promotion }: { promotion: Promotion | null }) {
  const t = useTranslations("promotions.form");
  const types = useTranslations("promotions.types");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const outlets = useOutletsQuery();
  const categories = useCategoriesQuery();
  const [search, setSearch] = useState("");
  const found = useProductsQuery({
    page: 1,
    itemsPerPage: 20,
    search: search.trim() || undefined,
  });
  const [create, creating] = useCreatePromotionMutation();
  const [replace, replacing] = useReplacePromotionMutation();
  const [name, setName] = useState(promotion?.name ?? "");
  const [description, setDescription] = useState(promotion?.description ?? "");
  const [type, setType] = useState<Promotion["type"]>(
    promotion?.type ?? "percentage",
  );
  const [value, setValue] = useState(promotion?.value ?? "");
  const [maxDiscount, setMaxDiscount] = useState(promotion?.maxDiscount ?? "");
  const [scope, setScope] = useState<Promotion["scope"]>(
    promotion?.scope ?? "entire_order",
  );
  const [categoryIds, setCategoryIds] = useState<number[]>(
    promotion?.categoryIds ?? [],
  );
  const [chosen, setChosen] = useState<ProductChoice[]>(
    promotion?.products ?? [],
  );
  const [appliesTo, setAppliesTo] = useState<Promotion["appliesTo"]>(
    promotion?.appliesTo ?? "entire_order",
  );
  const [minOrder, setMinOrder] = useState(promotion?.minOrderAmount ?? "0");
  const [hours, setHours] = useState(promotion?.happyHourStart != null);
  const [hourStart, setHourStart] = useState(promotion?.happyHourStart ?? "");
  const [hourEnd, setHourEnd] = useState(promotion?.happyHourEnd ?? "");
  const [starts, setStarts] = useState(local(promotion?.startsAt));
  const [ends, setEnds] = useState(local(promotion?.endsAt));
  const [allOutlets, setAllOutlets] = useState(promotion?.allOutlets ?? true);
  const [outletIds, setOutletIds] = useState<number[]>(
    promotion?.outletIds ?? [],
  );
  const [active, setActive] = useState(promotion?.isActive ?? true);
  const [tried, setTried] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const free = type === "free_delivery";
  const problems: Record<string, string> = {};
  if (name.trim() === "") problems.name = t("required");
  const amount = number(value);
  if (
    !free &&
    (amount === null || amount <= 0 || (type === "percentage" && amount > 100))
  ) {
    problems.value = t("invalidValue");
  }
  if (maxDiscount !== "" && (number(maxDiscount) ?? 0) <= 0) {
    problems.maxDiscount = t("invalidNumber");
  }
  if (number(minOrder) === null || (number(minOrder) ?? 0) < 0) {
    problems.minOrder = t("invalidNumber");
  }
  if (hours && (!hourStart || !hourEnd)) problems.hours = t("required");
  if (starts && ends && new Date(starts) >= new Date(ends)) {
    problems.dates = t("badDates");
  }
  if (!free && scope === "categories" && categoryIds.length === 0) {
    problems.scope = t("noCategories");
  }
  if (!free && scope === "products" && chosen.length === 0) {
    problems.scope = t("noProducts");
  }
  if (!allOutlets && outletIds.length === 0) problems.outlets = t("noOutlets");
  const bad = Object.keys(problems).length > 0;

  const submit = async () => {
    setTried(true);
    setFailure(null);
    if (bad) return;
    const kind = free ? "entire_order" : scope;
    const body: PromotionIn = {
      name: name.trim(),
      description: description.trim(),
      type,
      value: free ? null : String(amount),
      maxDiscount:
        free || maxDiscount === "" ? null : String(number(maxDiscount)),
      scope: kind,
      categoryIds: kind === "categories" ? categoryIds : [],
      productIds: kind === "products" ? chosen.map((p) => p.id) : [],
      appliesTo:
        free && appliesTo === "pickup_orders" ? "entire_order" : appliesTo,
      minOrderAmount: String(number(minOrder) ?? 0),
      happyHourStart: hours ? hourStart : null,
      happyHourEnd: hours ? hourEnd : null,
      startsAt: iso(starts),
      endsAt: iso(ends),
      allOutlets,
      outletIds: allOutlets ? [] : outletIds,
      isActive: active,
    };
    const result = promotion
      ? await replace({ id: promotion.id, body })
      : await create(body);
    if ("error" in result && result.error) {
      setFailure(errorMessage(result.error as ApiError));
      return;
    }
    router.push("/marketing/promotions");
  };

  const shown = (key: string) => (tried ? problems[key] : undefined);
  const options = [
    ...chosen,
    ...(found.data?.results ?? [])
      .filter((p) => !chosen.some((c) => c.id === p.id))
      .map((p) => ({ id: p.id, name: p.name })),
  ];

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, maxWidth: 900 }}>
      <Stack spacing={3}>
        {failure && <Alert severity="error">{failure}</Alert>}
        <TextField
          label={t("name")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={Boolean(shown("name"))}
          helperText={shown("name") ?? t("nameHelp")}
          slotProps={{ htmlInput: { maxLength: 80 } }}
          fullWidth
        />
        <TextField
          label={t("description")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          helperText={t("descriptionHelp")}
          slotProps={{ htmlInput: { maxLength: 300 } }}
          multiline
          minRows={2}
          fullWidth
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label={t("type")}
            value={type}
            onChange={(event) => {
              const next = event.target.value as Promotion["type"];
              setType(next);
              if (next === "free_delivery") setValue("");
            }}
            fullWidth
          >
            {(["percentage", "amount", "free_delivery"] as const).map(
              (option) => (
                <MenuItem key={option} value={option}>
                  {types(option)}
                </MenuItem>
              ),
            )}
          </TextField>
          {!free && (
            <TextField
              label={
                type === "percentage" ? t("valuePercent") : t("valueAmount")
              }
              value={value}
              onChange={(event) => setValue(event.target.value)}
              error={Boolean(shown("value"))}
              helperText={shown("value")}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
              fullWidth
            />
          )}
          {!free && (
            <TextField
              label={t("maxDiscount")}
              value={maxDiscount}
              onChange={(event) => setMaxDiscount(event.target.value)}
              error={Boolean(shown("maxDiscount"))}
              helperText={shown("maxDiscount")}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
              fullWidth
            />
          )}
        </Stack>
        {!free && (
          <FormControl error={Boolean(shown("scope"))}>
            <FormLabel>{t("scope")}</FormLabel>
            <RadioGroup
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as Promotion["scope"])
              }
            >
              {(["entire_order", "categories", "products"] as const).map(
                (option) => (
                  <FormControlLabel
                    key={option}
                    value={option}
                    control={<Radio />}
                    label={t(`scopes.${option}`)}
                  />
                ),
              )}
            </RadioGroup>
            {scope === "categories" &&
              (categories.data ?? [])
                .filter((c) => c.archivedAt === null)
                .map((c) => (
                  <FormControlLabel
                    key={c.id}
                    sx={{ ml: 3 }}
                    control={
                      <Checkbox
                        checked={categoryIds.includes(c.id)}
                        onChange={(event) =>
                          setCategoryIds((ids) =>
                            event.target.checked
                              ? [...ids, c.id]
                              : ids.filter((id) => id !== c.id),
                          )
                        }
                      />
                    }
                    label={c.name}
                  />
                ))}
            {scope === "products" && (
              <Autocomplete
                multiple
                sx={{ ml: 3, mt: 1 }}
                options={options}
                value={chosen}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                filterOptions={(all) => all}
                onInputChange={(_, text, reason) => {
                  if (reason === "input") setSearch(text);
                }}
                onChange={(_, next) => setChosen(next)}
                noOptionsText={t("noProductsFound")}
                renderInput={(params) => (
                  <TextField {...params} label={t("products")} />
                )}
              />
            )}
            {shown("scope") && (
              <FormHelperText>{shown("scope")}</FormHelperText>
            )}
          </FormControl>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label={t("appliesTo")}
            value={
              free && appliesTo === "pickup_orders" ? "entire_order" : appliesTo
            }
            onChange={(event) =>
              setAppliesTo(event.target.value as Promotion["appliesTo"])
            }
            fullWidth
          >
            {(["entire_order", "delivery_orders", "pickup_orders"] as const)
              .filter((option) => !(free && option === "pickup_orders"))
              .map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`applies.${option}`)}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            label={t("minOrder")}
            value={minOrder}
            onChange={(event) => setMinOrder(event.target.value)}
            error={Boolean(shown("minOrder"))}
            helperText={shown("minOrder")}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
            fullWidth
          />
        </Stack>
        <FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={hours}
                onChange={(event) => setHours(event.target.checked)}
              />
            }
            label={t("happyHourOn")}
          />
          {hours && (
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField
                type="time"
                label={t("happyHourStart")}
                value={hourStart}
                onChange={(event) => setHourStart(event.target.value)}
                error={Boolean(shown("hours")) && !hourStart}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                type="time"
                label={t("happyHourEnd")}
                value={hourEnd}
                onChange={(event) => setHourEnd(event.target.value)}
                error={Boolean(shown("hours")) && !hourEnd}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}
          <FormHelperText>{t("happyHourHelp")}</FormHelperText>
        </FormControl>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            type="datetime-local"
            label={t("starts")}
            value={starts}
            onChange={(event) => setStarts(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            type="datetime-local"
            label={t("ends")}
            value={ends}
            onChange={(event) => setEnds(event.target.value)}
            error={Boolean(shown("dates"))}
            helperText={shown("dates") ?? t("datesHelp")}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </Stack>
        <FormControl error={Boolean(shown("outlets"))}>
          <FormLabel>{t("outlets")}</FormLabel>
          <RadioGroup
            value={allOutlets ? "all" : "some"}
            onChange={(event) => setAllOutlets(event.target.value === "all")}
          >
            <FormControlLabel
              value="all"
              control={<Radio />}
              label={t("allOutlets")}
            />
            <FormControlLabel
              value="some"
              control={<Radio />}
              label={t("someOutlets")}
            />
          </RadioGroup>
          {!allOutlets &&
            (outlets.data ?? []).map((outlet) => (
              <FormControlLabel
                key={outlet.id}
                sx={{ ml: 3 }}
                control={
                  <Checkbox
                    checked={outletIds.includes(outlet.id)}
                    onChange={(event) =>
                      setOutletIds((ids) =>
                        event.target.checked
                          ? [...ids, outlet.id]
                          : ids.filter((id) => id !== outlet.id),
                      )
                    }
                  />
                }
                label={outlet.name}
              />
            ))}
          {shown("outlets") && (
            <FormHelperText>{shown("outlets")}</FormHelperText>
          )}
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
          }
          label={t("active")}
        />
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ justifyContent: "flex-end" }}
        >
          <Button onClick={() => router.push("/marketing/promotions")}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={creating.isLoading || replacing.isLoading}
          >
            {t("save")}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
