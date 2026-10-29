import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "next-intl/server";
import { ApiStatus } from "@/components/ApiStatus";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <Container maxWidth="sm" component="main" sx={{ py: 8 }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1">
            {t("title")}
          </Typography>
          <Typography color="text.secondary">{t("subtitle")}</Typography>
        </Stack>
        <ApiStatus />
      </Stack>
    </Container>
  );
}
