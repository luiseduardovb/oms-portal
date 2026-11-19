"use client";

import { Suspense } from "react";
import { FeedbackPage } from "@/analytics/FeedbackPage";

export default function Page() {
  return (
    <Suspense>
      <FeedbackPage />
    </Suspense>
  );
}
