"use client";

import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { InvitationsTable } from "@/team/InvitationsTable";
import { InviteDialog } from "@/team/InviteDialog";
import { MembersTable } from "@/team/MembersTable";
import {
  useInvitationsQuery,
  useMembersQuery,
  useRolesQuery,
} from "@/team/teamApi";

export default function TeamPage() {
  const t = useTranslations("team");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  // The team changes from other places (someone accepts an invitation), so
  // opening the page always reads it again.
  const fresh = { refetchOnMountOrArgChange: true };
  const members = useMembersQuery(undefined, fresh);
  const roles = useRolesQuery(undefined, fresh);
  const invitations = useInvitationsQuery(undefined, fresh);
  const [tab, setTab] = useState<"members" | "invitations">("members");
  const [inviting, setInviting] = useState(false);
  const [roleId, setRoleId] = useState<number | "">("");

  if (!me) return null;
  if (!can(me.levels, "team", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canManage = can(me.levels, "team", "full");
  const failed = members.error ?? roles.error ?? invitations.error;
  const loading = members.isLoading || roles.isLoading || invitations.isLoading;
  const pending = invitations.data?.length ?? 0;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h4" component="h1">
          {t("title")}
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviting(true)}
            disabled={!roles.data}
          >
            {t("invite.open")}
          </Button>
        )}
      </Stack>
      {failed && (
        <Alert severity="error">{errorMessage(failed as ApiError)}</Alert>
      )}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={tab}
          aria-label={t("tabs.label")}
          onChange={(_event, value: "members" | "invitations" | null) => {
            if (value) setTab(value);
          }}
        >
          <ToggleButton value="members">{t("tabs.members")}</ToggleButton>
          <ToggleButton value="invitations">
            {t("tabs.invitations")}
            {pending > 0 ? ` (${pending})` : ""}
          </ToggleButton>
        </ToggleButtonGroup>
        {tab === "members" && roles.data && (
          <TextField
            select
            size="small"
            label={t("roleFilter")}
            value={roleId}
            sx={{ minWidth: 200 }}
            onChange={(event) =>
              setRoleId(
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
          >
            <MenuItem value="">{t("allRoles")}</MenuItem>
            {roles.data.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
      {loading && <CircularProgress aria-label={t("loading")} />}
      {tab === "members" && members.data && roles.data && (
        <MembersTable
          me={me}
          members={
            roleId === ""
              ? members.data
              : members.data.filter((m) => m.roleId === roleId)
          }
          roles={roles.data}
          canManage={canManage}
        />
      )}
      {tab === "invitations" && invitations.data && (
        <InvitationsTable
          invitations={invitations.data}
          canManage={canManage}
        />
      )}
      {roles.data && (
        <InviteDialog
          open={inviting}
          onClose={() => setInviting(false)}
          roles={
            me.isOwner
              ? roles.data
              : roles.data.filter((role) => role.templateKey !== "owner")
          }
        />
      )}
    </Stack>
  );
}
