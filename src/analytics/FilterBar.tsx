"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTranslations } from "next-intl";
import { useOutletsQuery } from "@/outlets/outletsApi";
import type { Filters } from "./analyticsApi";
import { matchPreset, presetRange, PRESETS, type Preset } from "./range";

const CUSTOM = "custom";

/** Period, branch and (where money is shown) with or without tax. */
export function FilterBar({
  filters,
  onChange,
  tax = true,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  tax?: boolean;
}) {
  const t = useTranslations("analytics");
  const outlets = useOutletsQuery();
  const list = outlets.data ?? [];
  const preset = matchPreset(filters.from, filters.to, new Date());
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        alignItems: "center",
        mb: 2.5,
      }}
    >
      <TextField
        select
        size="small"
        label={t("filters.period")}
        value={preset ?? CUSTOM}
        onChange={(e) => {
          const value = e.target.value;
          if (value !== CUSTOM) {
            onChange(presetRange(value as Preset, new Date()));
          }
        }}
        sx={{ minWidth: 170 }}
      >
        {PRESETS.map((p) => (
          <MenuItem key={p} value={p}>
            {t(`filters.presets.${p}`)}
          </MenuItem>
        ))}
        <MenuItem value={CUSTOM}>{t("filters.presets.custom")}</MenuItem>
      </TextField>
      <TextField
        size="small"
        type="date"
        label={t("filters.from")}
        value={filters.from}
        onChange={(e) => e.target.value && onChange({ from: e.target.value })}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { max: filters.to },
        }}
      />
      <TextField
        size="small"
        type="date"
        label={t("filters.to")}
        value={filters.to}
        onChange={(e) => e.target.value && onChange({ to: e.target.value })}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { min: filters.from },
        }}
      />
      {list.length > 1 && (
        <TextField
          select
          size="small"
          label={t("filters.outlet")}
          value={filters.outletId ?? 0}
          onChange={(e) => {
            const id = Number(e.target.value);
            onChange({ outletId: id || null });
          }}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value={0}>{t("filters.allOutlets")}</MenuItem>
          {list.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      {tax && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filters.tax}
          aria-label={t("filters.taxLabel")}
          onChange={(_e, value) => value && onChange({ tax: value })}
        >
          <ToggleButton value="with">{t("filters.withTax")}</ToggleButton>
          <ToggleButton value="without">{t("filters.withoutTax")}</ToggleButton>
        </ToggleButtonGroup>
      )}
    </Box>
  );
}
