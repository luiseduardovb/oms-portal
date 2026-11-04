"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  invitationLink,
  useCreateInvitationMutation,
  whatsappLink,
  type CreatedInvitation,
  type Role,
} from "./teamApi";

interface Props {
  open: boolean;
  onClose: () => void;
  roles: Role[];
}

export function InviteDialog({ open, onClose, roles }: Props) {
  const t = useTranslations("team.invite");
  const errorMessage = useErrorMessage();
  const [create, { isLoading, error, reset }] = useCreateInvitationMutation();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<number | "">("");
  const [allOutlets, setAllOutlets] = useState(true);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    onClose();
    // Reset after the closing animation so the form does not flash.
    setTimeout(() => {
      setEmail("");
      setRoleId("");
      setAllOutlets(true);
      setCreated(null);
      setCopied(false);
      reset();
    }, 200);
  };

  const submit = async () => {
    if (roleId === "") return;
    const result = await create({ email: email.trim(), roleId, allOutlets });
    if (result.data) setCreated(result.data);
  };

  const link = created
    ? invitationLink(window.location.origin, created.token)
    : "";
  const message = created
    ? t("whatsappText", { link, role: created.roleName })
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // The field below is selectable, so the link can still be copied by hand.
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{created ? t("readyTitle") : t("title")}</DialogTitle>
      {created ? (
        <>
          <DialogContent>
            <Stack spacing={2}>
              <Alert severity="info">
                {t("readyNote", { email: created.email })}
              </Alert>
              <TextField
                label={t("link")}
                value={link}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
                onFocus={(event) => event.target.select()}
              />
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap" }}
              >
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={copy}
                >
                  {copied ? t("copied") : t("copy")}
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  href={whatsappLink(message)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("whatsapp")}
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>{t("done")}</Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && (
                <Alert severity="error">
                  {errorMessage(error as ApiError)}
                </Alert>
              )}
              <TextField
                label={t("email")}
                type="email"
                value={email}
                autoFocus
                onChange={(event) => setEmail(event.target.value)}
              />
              <TextField
                select
                label={t("role")}
                value={roleId}
                onChange={(event) => setRoleId(Number(event.target.value))}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allOutlets}
                    onChange={(event) => setAllOutlets(event.target.checked)}
                  />
                }
                label={t("allOutlets")}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>{t("cancel")}</Button>
            <Button
              variant="contained"
              onClick={submit}
              disabled={isLoading || email.trim() === "" || roleId === ""}
            >
              {t("submit")}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
