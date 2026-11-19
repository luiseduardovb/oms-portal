"use client";

import { Suspense } from "react";
import { SalesPage } from "@/analytics/SalesPage";

export default function Page() {
  return (
    <Suspense>
      <SalesPage />
    </Suspense>
  );
}
