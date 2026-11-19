"use client";

import { Suspense } from "react";
import { ReportPage } from "@/analytics/ReportPage";

export default function Page() {
  return (
    <Suspense>
      <ReportPage />
    </Suspense>
  );
}
