import { can } from "@/auth/permissions";

export interface NavItem {
  key: string;
  href: string;
  /** Hidden unless the role reaches this level in this area. */
  area?: string;
  level?: "view" | "full";
}

/** Sidebar order follows Zyda's dashboard. Items are added here as their
 * screens are built: Orders, Product Catalog, Marketing, Analytics, Setup. */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/" },
  { key: "catalog", href: "/catalog", area: "catalog" },
  { key: "team", href: "/team", area: "team" },
  { key: "outlets", href: "/outlets", area: "setup" },
  { key: "setup", href: "/setup", area: "setup" },
];

export function visibleNav(
  items: NavItem[],
  levels: Record<string, string> | undefined,
): NavItem[] {
  return items.filter(
    (item) => !item.area || can(levels, item.area, item.level ?? "view"),
  );
}
