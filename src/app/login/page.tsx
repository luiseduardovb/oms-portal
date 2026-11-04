import Container from "@mui/material/Container";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Container maxWidth="xs" component="main" sx={{ py: { xs: 4, md: 10 } }}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </Container>
  );
}
