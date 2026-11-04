import Container from "@mui/material/Container";
import { Suspense } from "react";
import { AcceptInvitation } from "./AcceptInvitation";

export default function AcceptInvitationPage() {
  return (
    <Container maxWidth="xs" component="main" sx={{ py: { xs: 4, md: 10 } }}>
      <Suspense>
        <AcceptInvitation />
      </Suspense>
    </Container>
  );
}
