"use client";

import { Suspense } from "react";
import { DeliveryPage } from "@/delivery/DeliveryPage";

export default function Page() {
  return (
    <Suspense>
      <DeliveryPage />
    </Suspense>
  );
}
