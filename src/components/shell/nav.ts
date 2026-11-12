import { can } from "@/auth/permissions";

export interface NavItem {
  key: string;
  href: string;
  /** Hidden unless the role reaches this level in this area. */
  area?: string;
  level?: "view" | "full";
  /** The pages of a group; the group opens to them. */
  children?: NavItem[];
  /** Matches only these paths (a regular expression) instead of a prefix. */
  match?: RegExp;
}

/** Sidebar order follows Zyda's dashboard: Orders, Product Catalog, Setup and
 * Team. Analytics, Marketing and Billing join when their screens exist. */
export const NAV_ITEMS: NavItem[] = [
  { key: "orders", href: "/orders", area: "orders" },
  {
    key: "catalog",
    href: "/catalog",
    area: "catalog",
    children: [
      {
        key: "catalogProducts",
        href: "/catalog",
        match: /^\/catalog(\/\d+.*)?$/,
      },
      { key: "catalogCategories", href: "/catalog/categories" },
      { key: "catalogOptions", href: "/catalog/options" },
      { key: "catalogImport", href: "/catalog/import" },
    ],
  },
  {
    key: "setup",
    href: "/setup/business",
    area: "setup",
    children: [
      { key: "setupBusiness", href: "/setup/business" },
      { key: "setupBranding", href: "/setup/branding" },
      { key: "setupLayout", href: "/setup/layout" },
      { key: "outlets", href: "/outlets" },
      { key: "setupOrders", href: "/setup/orders" },
      { key: "setupPayments", href: "/setup/payments" },
      { key: "setupLinks", href: "/setup/links" },
    ],
  },
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

/** Whether this page of the sidebar is the one open at `pathname`. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match.test(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Whether a top-level item, or any page inside it, is open. */
export function isOpen(item: NavItem, pathname: string): boolean {
  return (
    isActive(item, pathname) ||
    (item.children ?? []).some((child) => isActive(child, pathname))
  );
}
