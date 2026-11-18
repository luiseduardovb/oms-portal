"use client";

import { Suspense } from "react";
import { ZonePage } from "@/delivery/ZonePage";

export default function Page() {
  return (
    <Suspense>
      <ZonePage />
    </Suspense>
  );
}
