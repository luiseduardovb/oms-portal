"use client";

import { SetupPage } from "@/setup/SetupPage";
import { StoreTab } from "@/setup/StoreTab";

export default function BusinessPage() {
  return (
    <SetupPage page="business">
      {({ setup, canEdit, isOwner }) => (
        <StoreTab setup={setup} canEdit={canEdit} isOwner={isOwner} />
      )}
    </SetupPage>
  );
}
