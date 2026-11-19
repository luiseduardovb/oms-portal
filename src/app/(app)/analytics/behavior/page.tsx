"use client";

import { Suspense } from "react";
import { BehaviorPage } from "@/analytics/BehaviorPage";

export default function Page() {
  return (
    <Suspense>
      <BehaviorPage />
    </Suspense>
  );
}
