"use client";

import { LayoutTab } from "@/setup/LayoutTab";
import { SetupPage } from "@/setup/SetupPage";

export default function LayoutPage() {
  return (
    <SetupPage page="layout">
      {({ setup, canEdit }) => <LayoutTab setup={setup} canEdit={canEdit} />}
    </SetupPage>
  );
}
