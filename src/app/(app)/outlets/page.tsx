"use client";

import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useCreateOutletMutation,
  useOutletsQuery,
  useRestoreOutletMutation,
} from "@/outlets/outletsApi";

export default function OutletsPage() {
  const t = useTranslations("outlets");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const { data: me } = useMe();
  const [showArchived, setShowArchived] = useState(false);
  const outlets = useOutletsQuery(showArchived, {
    refetchOnMountOrArgChange: true,
  });
  const [restore, restoring] = useRestoreOutletMutation();
  const [creating, setCreating] = useState(false);

  if (!me) return null;
  if (!can(me.levels, "setup", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "setup", "full");
  // Only members with every outlet can add or restore one: a limited member
  // could not open what they just made.
  const canAdd = canEdit && me.outlets.all;

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
        {canAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreating(true)}
          >
            {t("new")}
          </Button>
        )}
      </Stack>
      {outlets.error && (
        <Alert severity="error">
          {errorMessage(outlets.error as ApiError)}
        </Alert>
      )}
      {restoring.error && (
        <Alert severity="error">
          {errorMessage(restoring.error as ApiError)}
        </Alert>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
        }
        label={t("showArchived")}
      />
      {outlets.isLoading && <CircularProgress aria-label={t("loading")} />}
      {outlets.data && outlets.data.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {outlets.data && outlets.data.length > 0 && (
        <TableContainer>
          <Table size="small" aria-label={t("table")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("name")}</TableCell>
                <TableCell>{t("address")}</TableCell>
                <TableCell>{t("phone")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outlets.data.map((outlet) => (
                <TableRow key={outlet.id}>
                  <TableCell>
                    <Link href={`/outlets/${outlet.id}`}>{outlet.name}</Link>
                  </TableCell>
                  <TableCell>{outlet.addressText}</TableCell>
                  <TableCell>{outlet.phone}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {outlet.archivedAt ? (
                        <Chip size="small" label={t("archived")} />
                      ) : (
                        <>
                          <Chip
                            size="small"
                            color={outlet.isPublic ? "success" : "default"}
                            label={outlet.isPublic ? t("public") : t("private")}
                          />
                          {outlet.isBusy && (
                            <Chip
                              size="small"
                              color="warning"
                              label={t("busy")}
                            />
                          )}
                        </>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {outlet.archivedAt && canAdd && (
                      <Button
                        size="small"
                        disabled={restoring.isLoading}
                        onClick={() => restore(outlet.id)}
                      >
                        {t("restore")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <NewOutletDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => router.push(`/outlets/${id}`)}
      />
    </Stack>
  );
}

function NewOutletDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const t = useTranslations("outlets.create");
  const errorMessage = useErrorMessage();
  const [create, { isLoading, error, reset }] = useCreateOutletMutation();
  const [name, setName] = useState("");
  const [missing, setMissing] = useState(false);

  const close = () => {
    onClose();
    setName("");
    setMissing(false);
    reset();
  };

  const submit = async () => {
    if (name.trim() === "") {
      setMissing(true);
      return;
    }
    setMissing(false);
    const result = await create({
      name: name.trim(),
      pickupEnabled: true,
      deliveryEnabled: true,
      prepTimeMinutes: 20,
      acceptAlertMinutes: 3,
      expireUnacceptedMinutes: 15,
      autoAccept: false,
      deliveryFee: 0,
      deliveryMinOrder: 0,
      deliveryEtaMinutes: 40,
    });
    if (result.data) {
      onCreated(result.data.id);
      close();
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{t("help")}</Typography>
          {error && (
            <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
          )}
          <TextField
            label={t("name")}
            value={name}
            autoFocus
            error={missing}
            helperText={missing ? t("nameRequired") : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t("cancel")}</Button>
        <Button variant="contained" onClick={submit} disabled={isLoading}>
          {t("submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
