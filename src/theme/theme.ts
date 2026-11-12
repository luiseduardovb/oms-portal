import { createTheme } from "@mui/material/styles";
import { esES } from "@mui/material/locale";

/**
 * The one place that defines how the portal looks. Components use theme
 * tokens (`color="primary"`, `sx={{ p: 2 }}`), never hard-coded colours.
 * The look follows the Zyda merchant panel: white surfaces, a strong blue,
 * thin borders and square-ish buttons. The primary colour is a placeholder;
 * merchants get their own later.
 */
export const theme = createTheme(
  {
    cssVariables: true,
    palette: {
      primary: { main: "#2f45e0" },
      secondary: { main: "#5b6b7f" },
      background: { default: "#f9fafc", paper: "#ffffff" },
      divider: "#e4e7ee",
      text: { primary: "#14171f", secondary: "#667085" },
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily:
        "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiPaper: { styleOverrides: { outlined: { borderColor: "#e4e7ee" } } },
    },
  },
  esES,
);
