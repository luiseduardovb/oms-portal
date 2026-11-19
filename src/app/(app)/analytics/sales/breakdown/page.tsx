"use client";

import { Suspense } from "react";
import { BreakdownPage } from "@/analytics/BreakdownPage";

export default function Page() {
  return (
    <Suspense>
      <BreakdownPage />
    </Suspense>
  );
}
