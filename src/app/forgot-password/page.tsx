import Container from "@mui/material/Container";
import { ForgotPassword } from "./ForgotPassword";

export default function ForgotPasswordPage() {
  return (
    <Container maxWidth="xs" component="main" sx={{ py: { xs: 4, md: 10 } }}>
      <ForgotPassword />
    </Container>
  );
}
