"use client";

import Alert from "@mui/material/Alert";
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
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useOutletsQuery } from "@/outlets/outletsApi";
import {
  useCreateVoucherMutation,
  useReplaceVoucherMutation,
  type Voucher,
  type VoucherIn,
} from "./vouchersApi";

const CODE = /^[A-Za-z0-9_-]{3,40}$/;
const PHONE = /^\+[1-9][0-9]{7,14}$/;

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

interface Props {
  /** The voucher being edited; null for a new one. */
  voucher: Voucher | null;
  /** A role that may only issue private vouchers. */
  privateOnly: boolean;
}

/** The form of the add and edit pages. */
export function VoucherForm(props: Props) {
  return <Form key={props.voucher?.id ?? "new"} {...props} />;
}

function Form({ voucher, privateOnly }: Props) {
  const router = useRouter();
  const onClose = () => router.push("/marketing/vouchers");
  const t = useTranslations("vouchers.form");
  const types = useTranslations("vouchers.types");
  const errorMessage = useErrorMessage();
  const outlets = useOutletsQuery();
  const [create, creating] = useCreateVoucherMutation();
  const [replace, replacing] = useReplaceVoucherMutation();
  const [code, setCode] = useState(voucher?.code ?? "");
  const [description, setDescription] = useState(voucher?.description ?? "");
  const [type, setType] = useState<Voucher["type"]>(
    voucher?.type ?? "percentage",
  );
  const [value, setValue] = useState(voucher?.value ?? "");
  const [maxDiscount, setMaxDiscount] = useState(voucher?.maxDiscount ?? "");
  const [appliesTo, setAppliesTo] = useState<Voucher["appliesTo"]>(
    voucher?.appliesTo ?? "entire_order",
  );
  const [minOrder, setMinOrder] = useState(voucher?.minOrderAmount ?? "0");
  const [totalLimit, setTotalLimit] = useState(
    voucher?.totalUsageLimit?.toString() ?? "",
  );
  const [perCustomer, setPerCustomer] = useState(
    voucher?.perCustomerLimit?.toString() ?? "",
  );
  const [hours, setHours] = useState(voucher?.happyHourStart != null);
  const [hourStart, setHourStart] = useState(voucher?.happyHourStart ?? "");
  const [hourEnd, setHourEnd] = useState(voucher?.happyHourEnd ?? "");
  const [starts, setStarts] = useState(local(voucher?.startsAt));
  const [ends, setEnds] = useState(local(voucher?.endsAt));
  const [visibility, setVisibility] = useState<Voucher["visibility"]>(
    privateOnly ? "private" : (voucher?.visibility ?? "public"),
  );
  const [phone, setPhone] = useState(voucher?.assignedPhone ?? "");
  const [allOutlets, setAllOutlets] = useState(voucher?.allOutlets ?? true);
  const [outletIds, setOutletIds] = useState<number[]>(
    voucher?.outletIds ?? [],
  );
  const [active, setActive] = useState(voucher?.isActive ?? true);
  const [tried, setTried] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const locked = (voucher?.redeemedCount ?? 0) > 0;
  const free = type === "free_delivery";
  const problems: Record<string, string> = {};
  if (!CODE.test(code.trim())) problems.code = t("invalidCode");
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
  for (const [key, raw] of [
    ["totalLimit", totalLimit],
    ["perCustomer", perCustomer],
  ] as const) {
    if (raw !== "" && !(Number.isInteger(Number(raw)) && Number(raw) >= 1)) {
      problems[key] = t("invalidNumber");
    }
  }
  if (hours && (!hourStart || !hourEnd)) problems.hours = t("required");
  if (starts && ends && new Date(starts) >= new Date(ends)) {
    problems.dates = t("badDates");
  }
  if (phone !== "" && !PHONE.test(phone)) problems.phone = t("invalidPhone");
  if (!allOutlets && outletIds.length === 0) problems.outlets = t("noOutlets");
  const bad = Object.keys(problems).length > 0;

  const submit = async () => {
    setTried(true);
    setFailure(null);
    if (bad) return;
    const body: VoucherIn = {
      code: code.trim(),
      description: description.trim(),
      type,
      value: free ? null : String(amount),
      maxDiscount:
        free || maxDiscount === "" ? null : String(number(maxDiscount)),
      appliesTo:
        free && appliesTo === "pickup_orders" ? "entire_order" : appliesTo,
      minOrderAmount: String(number(minOrder) ?? 0),
      totalUsageLimit: totalLimit === "" ? null : Number(totalLimit),
      perCustomerLimit: perCustomer === "" ? null : Number(perCustomer),
      happyHourStart: hours ? hourStart : null,
      happyHourEnd: hours ? hourEnd : null,
      startsAt: iso(starts),
      endsAt: iso(ends),
      visibility,
      assignedPhone: visibility === "private" && phone !== "" ? phone : null,
      allOutlets,
      outletIds: allOutlets ? [] : outletIds,
      isActive: active,
    };
    const result = voucher
      ? await replace({ id: voucher.id, body })
      : await create(body);
    if ("error" in result && result.error) {
      setFailure(errorMessage(result.error as ApiError));
      return;
    }
    onClose();
  };

  const shown = (key: string) => (tried ? problems[key] : undefined);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, maxWidth: 900 }}>
      <Stack spacing={3}>
        {failure && <Alert severity="error">{failure}</Alert>}
        <TextField
          label={t("code")}
          value={code}
          disabled={locked}
          onChange={(event) => setCode(event.target.value)}
          error={Boolean(shown("code"))}
          helperText={
            shown("code") ?? (locked ? t("codeLocked") : t("codeHelp"))
          }
          slotProps={{ htmlInput: { maxLength: 40 } }}
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
              const next = event.target.value as Voucher["type"];
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label={t("appliesTo")}
            value={
              free && appliesTo === "pickup_orders" ? "entire_order" : appliesTo
            }
            onChange={(event) =>
              setAppliesTo(event.target.value as Voucher["appliesTo"])
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={t("totalLimit")}
            value={totalLimit}
            onChange={(event) => setTotalLimit(event.target.value)}
            error={Boolean(shown("totalLimit"))}
            helperText={shown("totalLimit")}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            fullWidth
          />
          <TextField
            label={t("perCustomerLimit")}
            value={perCustomer}
            onChange={(event) => setPerCustomer(event.target.value)}
            error={Boolean(shown("perCustomer"))}
            helperText={shown("perCustomer")}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            fullWidth
          />
        </Stack>
        <FormHelperText sx={{ mt: "-16px !important" }}>
          {t("limitsHelp")}
        </FormHelperText>
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
        <FormControl>
          <FormLabel>{t("visibility")}</FormLabel>
          <RadioGroup
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as Voucher["visibility"])
            }
          >
            <FormControlLabel
              value="public"
              disabled={privateOnly}
              control={<Radio />}
              label={t("publicHelp")}
            />
            <FormControlLabel
              value="private"
              control={<Radio />}
              label={t("privateHelp")}
            />
          </RadioGroup>
        </FormControl>
        {visibility === "private" && (
          <TextField
            label={t("assignedPhone")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={Boolean(shown("phone"))}
            helperText={shown("phone") ?? t("assignedPhoneHelp")}
            slotProps={{ htmlInput: { inputMode: "tel" } }}
            fullWidth
          />
        )}
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
          <Button onClick={onClose}>{t("cancel")}</Button>
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
