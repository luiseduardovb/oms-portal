"use client";

import { OrdersTab } from "@/setup/OrdersTab";
import { SetupPage } from "@/setup/SetupPage";

export default function LinksPage() {
  return (
    <SetupPage page="links">
      {({ setup, canEdit }) => (
        <OrdersTab setup={setup} canEdit={canEdit} part="links" />
      )}
    </SetupPage>
  );
}
