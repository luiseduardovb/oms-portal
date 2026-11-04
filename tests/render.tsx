import { ThemeProvider } from "@mui/material/styles";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import messages from "../messages/es.json";
import { makeStore, type AppStore } from "@/store";
import { theme } from "@/theme/theme";

/** Render a component with the same providers as the real app. Pass a store
 * to start from a known session state. */
export function renderWithProviders(
  ui: ReactElement,
  store: AppStore = makeStore(),
) {
  return {
    store,
    ...render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ThemeProvider theme={theme}>
          <Provider store={store}>{ui}</Provider>
        </ThemeProvider>
      </NextIntlClientProvider>,
    ),
  };
}
