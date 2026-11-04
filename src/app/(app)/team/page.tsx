"use client";

import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
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
      <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
        <Tab value="members" label={t("tabs.members")} />
        <Tab
          value="invitations"
          label={
            <Badge badgeContent={pending} color="primary" sx={{ pr: 2 }}>
              {t("tabs.invitations")}
            </Badge>
          }
        />
      </Tabs>
      {loading && <CircularProgress aria-label={t("loading")} />}
      {tab === "members" && members.data && roles.data && (
        <MembersTable
          me={me}
          members={members.data}
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
