"use client";

import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore, type ReactNode } from "react";

export type ViewMode = "grid" | "list";
export type Tone = "success" | "default" | "warning" | "error";

const STORAGE_KEY = "oms.catalog.view";

const listeners = new Set<() => void>();
let remembered: ViewMode | null = null;

function readMode(): ViewMode {
  if (remembered) return remembered;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "list"
      ? "list"
      : "grid";
  } catch {
    return "grid";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function chooseMode(next: ViewMode) {
  remembered = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not being able to remember the choice is harmless.
  }
  listeners.forEach((listener) => listener());
}

/** Grid or list, remembered in this browser (grid until chosen). */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore<ViewMode>(
    subscribe,
    readMode,
    () => "grid",
  );
  return [mode, chooseMode];
}

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const t = useTranslations("catalog.view");
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      aria-label={t("label")}
      onChange={(_event, next: ViewMode | null) => {
        if (next) onChange(next);
      }}
    >
      <ToggleButton value="grid" aria-label={t("grid")}>
        <GridViewOutlinedIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="list" aria-label={t("list")}>
        <ViewListOutlinedIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export interface Stat {
  label: string;
  value: ReactNode;
}

interface ItemProps {
  name: string;
  /** Link for the name (and photo); omit when the item has no page. */
  href?: string;
  image: string | null;
  subtitle?: string;
  stats: Stat[];
  status: { label: string; tone: Tone };
  /** Switch, edit button and menu, laid out by the card or the row. */
  actions: ReactNode;
  muted?: boolean;
}

function Photo({
  src,
  name,
  sx,
}: {
  src: string | null;
  name: string;
  sx: object;
}) {
  return (
    <Box
      sx={{
        bgcolor: "action.hover",
        color: "text.secondary",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        fontWeight: 600,
        ...sx,
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </Box>
  );
}

function Pill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Chip
      size="small"
      label={label}
      color={tone}
      variant={tone === "default" ? "outlined" : "filled"}
      sx={{ fontWeight: 600 }}
    />
  );
}

/** Cards in a responsive grid: two across on a phone. */
export function ItemGrid({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box
      role="list"
      aria-label={label}
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(auto-fill, minmax(210px, 1fr))",
        },
      }}
    >
      {children}
    </Box>
  );
}

/** Rows stacked as soft cards. */
export function ItemList({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Stack role="list" aria-label={label} spacing={1.25}>
      {children}
    </Stack>
  );
}

const SURFACE = {
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: 3,
  transition: "box-shadow 120ms, border-color 120ms",
  "&:hover": {
    boxShadow: "0 4px 16px rgba(24, 39, 75, 0.08)",
    borderColor: "primary.light",
  },
} as const;

export function ItemCard({
  name,
  href,
  image,
  stats,
  status,
  actions,
  muted,
}: ItemProps) {
  return (
    <Stack
      role="listitem"
      spacing={1.5}
      sx={{ ...SURFACE, p: 1.5, opacity: muted ? 0.65 : 1, minWidth: 0 }}
    >
      <Title name={name} href={href} />
      <Photo
        src={image}
        name={name}
        sx={{ aspectRatio: "4 / 3", borderRadius: 2, fontSize: 40 }}
      />
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: `repeat(${Math.max(stats.length, 1)}, minmax(0, 1fr))`,
          },
        }}
      >
        {stats.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              bgcolor: "background.default",
              borderRadius: 2,
              px: 1.25,
              py: 0.75,
              minWidth: 0,
            }}
          >
            <Typography variant="caption" color="text.secondary" noWrap>
              {stat.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: 0.5,
        }}
      >
        <Pill {...status} />
        <Stack direction="row" sx={{ alignItems: "center" }}>
          {actions}
        </Stack>
      </Stack>
    </Stack>
  );
}

export function ItemRow({
  name,
  href,
  image,
  subtitle,
  stats,
  status,
  actions,
  muted,
}: ItemProps) {
  return (
    <Stack
      role="listitem"
      direction="row"
      spacing={2}
      sx={{
        ...SURFACE,
        px: 2,
        py: 1.25,
        alignItems: "center",
        flexWrap: { xs: "wrap", md: "nowrap" },
        rowGap: 1,
        opacity: muted ? 0.65 : 1,
      }}
    >
      <Photo
        src={image}
        name={name}
        sx={{ width: 56, height: 56, borderRadius: 2, flex: "none" }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Title name={name} href={href} />
        {subtitle && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
      {stats.map((stat) => (
        <Box
          key={stat.label}
          sx={{ minWidth: 80, textAlign: "right", display: "block" }}
        >
          <Typography variant="caption" color="text.secondary" noWrap>
            {stat.label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {stat.value}
          </Typography>
        </Box>
      ))}
      <Pill {...status} />
      <Stack direction="row" sx={{ alignItems: "center", flex: "none" }}>
        {actions}
      </Stack>
    </Stack>
  );
}

function Title({ name, href }: { name: string; href?: string }) {
  const title = (
    <Typography
      component="span"
      sx={{
        fontWeight: 700,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        wordBreak: "break-word",
      }}
    >
      {name}
    </Typography>
  );
  if (!href) return title;
  return (
    <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>
      {title}
    </Link>
  );
}
