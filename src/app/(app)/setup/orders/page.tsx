"use client";

import { OrdersTab } from "@/setup/OrdersTab";
import { SetupPage } from "@/setup/SetupPage";

export default function OrdersPage() {
  return (
    <SetupPage page="orders">
      {({ setup, canEdit }) => (
        <OrdersTab setup={setup} canEdit={canEdit} part="orders" />
      )}
    </SetupPage>
  );
}
