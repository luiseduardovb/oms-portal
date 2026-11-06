"use client";

import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const SECTIONS = [
  { key: "products", href: "/catalog" },
  { key: "categories", href: "/catalog/categories" },
  { key: "options", href: "/catalog/options" },
  { key: "import", href: "/catalog/import" },
] as const;

/** The screens of the catalog area, shown above each of them. */
export function CatalogNav() {
  const t = useTranslations("catalog.sections");
  const pathname = usePathname();
  const current =
    SECTIONS.find((s) => s.href !== "/catalog" && pathname.startsWith(s.href))
      ?.key ?? "products";
  return (
    <Tabs value={current} variant="scrollable" aria-label={t("label")}>
      {SECTIONS.map((section) => (
        <Tab
          key={section.key}
          value={section.key}
          label={t(section.key)}
          component={Link}
          href={section.href}
        />
      ))}
    </Tabs>
  );
}
