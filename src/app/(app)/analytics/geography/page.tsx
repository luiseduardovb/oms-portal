"use client";

import { Suspense } from "react";
import { GeographyPage } from "@/analytics/GeographyPage";

export default function Page() {
  return (
    <Suspense>
      <GeographyPage />
    </Suspense>
  );
}
