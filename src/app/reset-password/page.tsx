import Container from "@mui/material/Container";
import { Suspense } from "react";
import { ResetPassword } from "./ResetPassword";

export default function ResetPasswordPage() {
  return (
    <Container maxWidth="xs" component="main" sx={{ py: { xs: 4, md: 10 } }}>
      <Suspense>
        <ResetPassword />
      </Suspense>
    </Container>
  );
}
