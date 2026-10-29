import { createTheme } from "@mui/material/styles";
import { esES } from "@mui/material/locale";

/**
 * The one place that defines how the portal looks. Components use theme
 * tokens (`color="primary"`, `sx={{ p: 2 }}`), never hard-coded colours.
 * The primary colour is a placeholder; merchants get their own later.
 */
export const theme = createTheme(
  {
    cssVariables: true,
    palette: {
      primary: { main: "#1f5fbf" },
      secondary: { main: "#5b6b7f" },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    },
  },
  esES,
);
