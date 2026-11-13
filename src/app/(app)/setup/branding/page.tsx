"use client";

import Stack from "@mui/material/Stack";
import { BannersPanel } from "@/setup/BannersPanel";
import { BrandImages } from "@/setup/BrandImages";
import { OrdersTab } from "@/setup/OrdersTab";
import { SetupPage } from "@/setup/SetupPage";

export default function BrandingPage() {
  return (
    <SetupPage page="branding">
      {({ setup, canEdit }) => (
        <Stack spacing={3}>
          <OrdersTab setup={setup} canEdit={canEdit} part="branding" />
          <BrandImages setup={setup} canEdit={canEdit} />
          <BannersPanel setup={setup} canEdit={canEdit} />
        </Stack>
      )}
    </SetupPage>
  );
}
