"use client";

import { OrdersTab } from "@/setup/OrdersTab";
import { SetupPage } from "@/setup/SetupPage";

export default function BrandingPage() {
  return (
    <SetupPage page="branding">
      {({ setup, canEdit }) => (
        <OrdersTab setup={setup} canEdit={canEdit} part="branding" />
      )}
    </SetupPage>
  );
}
