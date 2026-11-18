"use client";

import { Suspense } from "react";
import { CustomerPage } from "@/customers/CustomerPage";

export default function Page() {
  return (
    <Suspense>
      <CustomerPage />
    </Suspense>
  );
}
