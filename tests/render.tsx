import { ThemeProvider } from "@mui/material/styles";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import messages from "../messages/es.json";
import { StoreProvider } from "@/store/StoreProvider";
import { theme } from "@/theme/theme";

/** Render a component with the same providers as the real app. */
export function renderWithProviders(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ThemeProvider theme={theme}>
        <StoreProvider>{ui}</StoreProvider>
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}
