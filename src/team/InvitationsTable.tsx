"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useRevokeInvitationMutation, type Invitation } from "./teamApi";

interface Props {
  invitations: Invitation[];
  canManage: boolean;
}

export function InvitationsTable({ invitations, canManage }: Props) {
  const t = useTranslations("team.invitations");
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const [revoke] = useRevokeInvitationMutation();
  const [failure, setFailure] = useState<string | null>(null);

  if (invitations.length === 0) {
    return <Typography color="text.secondary">{t("empty")}</Typography>;
  }
  return (
    <Stack spacing={2}>
      {failure && <Alert severity="error">{failure}</Alert>}
      <TableContainer>
        <Table size="small" aria-label={t("table")}>
          <TableHead>
            <TableRow>
              <TableCell>{t("email")}</TableCell>
              <TableCell>{t("role")}</TableCell>
              <TableCell>{t("expires")}</TableCell>
              {canManage && <TableCell align="right">{t("actions")}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>{invitation.roleName}</TableCell>
                <TableCell>
                  {format.dateTime(new Date(invitation.expiresAt), {
                    dateStyle: "medium",
                  })}
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={async () => {
                        const result = await revoke(invitation.id);
                        setFailure(
                          result.error
                            ? errorMessage(result.error as ApiError)
                            : null,
                        );
                      }}
                    >
                      {t("revoke")}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
