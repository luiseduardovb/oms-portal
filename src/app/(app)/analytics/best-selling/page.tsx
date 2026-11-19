"use client";

import { Suspense } from "react";
import { BestSellingPage } from "@/analytics/BestSellingPage";

export default function Page() {
  return (
    <Suspense>
      <BestSellingPage />
    </Suspense>
  );
}
