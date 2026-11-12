"use client";

import { PaymentsTab } from "@/setup/PaymentsTab";
import { SetupPage } from "@/setup/SetupPage";

export default function PaymentsPage() {
  return (
    <SetupPage page="payments">
      {({ setup, canEdit }) => <PaymentsTab setup={setup} canEdit={canEdit} />}
    </SetupPage>
  );
}
