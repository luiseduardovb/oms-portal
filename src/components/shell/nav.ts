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
  { key: "team", href: "/team", area: "team" },
];

export function visibleNav(
  items: NavItem[],
  levels: Record<string, string> | undefined,
): NavItem[] {
  return items.filter(
    (item) => !item.area || can(levels, item.area, item.level ?? "view"),
  );
}
