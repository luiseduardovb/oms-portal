"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Filters } from "./analyticsApi";
import { filtersToQuery, parseFilters } from "./range";

/** The page's filters live in the address, so a link keeps them and "view
 * the full report" opens with the same period. */
export function useFilters(): {
  filters: Filters;
  change: (patch: Partial<Filters>) => void;
  query: string;
} {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.toString();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(key), new Date()),
    [key],
  );
  const change = useCallback(
    (patch: Partial<Filters>) => {
      router.replace(`${pathname}?${filtersToQuery({ ...filters, ...patch })}`);
    },
    [filters, pathname, router],
  );
  return { filters, change, query: filtersToQuery(filters) };
}
