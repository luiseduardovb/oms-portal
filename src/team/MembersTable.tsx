"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import type { Me } from "@/auth/authApi";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useRemoveMemberMutation,
  useUpdateMemberMutation,
  type Member,
  type Role,
} from "./teamApi";

interface Props {
  me: Me;
  members: Member[];
  roles: Role[];
  canManage: boolean;
}

function memberName(member: Member): string {
  return (
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    member.email ||
    ""
  );
}

export function MembersTable({ me, members, roles, canManage }: Props) {
  const t = useTranslations("team.members");
  const errorMessage = useErrorMessage();
  const [update] = useUpdateMemberMutation();
  const [remove] = useRemoveMemberMutation();
  const [failure, setFailure] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  const run = async (action: Promise<{ error?: unknown }>) => {
    const result = await action;
    setFailure(result.error ? errorMessage(result.error as ApiError) : null);
  };

  // Only an owner may touch an owner; nobody changes themselves.
  const editable = (member: Member) =>
    canManage &&
    member.id !== me.memberId &&
    (me.isOwner || member.templateKey !== "owner");

  const rolesFor = () =>
    me.isOwner ? roles : roles.filter((role) => role.templateKey !== "owner");

  return (
    <Stack spacing={2}>
      {failure && (
        <Alert severity="error" onClose={() => setFailure(null)}>
          {failure}
        </Alert>
      )}
      <TableContainer>
        <Table size="small" aria-label={t("table")}>
          <TableHead>
            <TableRow>
              <TableCell>{t("name")}</TableCell>
              <TableCell>{t("email")}</TableCell>
              <TableCell>{t("role")}</TableCell>
              <TableCell>{t("status")}</TableCell>
              {canManage && <TableCell align="right">{t("actions")}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => {
              const name = memberName(member);
              const suspended = member.status === "suspended";
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    {name}
                    {member.id === me.memberId && (
                      <Chip label={t("you")} size="small" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {editable(member) ? (
                      <Select
                        size="small"
                        value={member.roleId}
                        inputProps={{
                          "aria-label": t("changeRole", { name }),
                        }}
                        onChange={(event) =>
                          run(
                            update({
                              id: member.id,
                              changes: { roleId: Number(event.target.value) },
                            }),
                          )
                        }
                      >
                        {rolesFor().map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            {role.name}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      member.roleName
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={suspended ? "warning" : "success"}
                      label={suspended ? t("suspended") : t("active")}
                    />
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      {editable(member) && (
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ justifyContent: "flex-end" }}
                        >
                          <Button
                            size="small"
                            onClick={() =>
                              run(
                                update({
                                  id: member.id,
                                  changes: {
                                    status: suspended ? "active" : "suspended",
                                  },
                                }),
                              )
                            }
                          >
                            {suspended ? t("reactivate") : t("suspend")}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => setRemoving(member)}
                          >
                            {t("remove")}
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={removing !== null} onClose={() => setRemoving(null)}>
        <DialogTitle>{t("removeTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {removing && t("removeBody", { name: memberName(removing) })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>{t("cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              const target = removing;
              setRemoving(null);
              if (target) await run(remove(target.id));
            }}
          >
            {t("confirmRemove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
