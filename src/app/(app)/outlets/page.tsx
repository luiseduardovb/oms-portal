"use client";

import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import {
  ItemCard,
  ItemGrid,
  ItemList,
  ItemRow,
  useViewMode,
  ViewToggle,
  type Tone,
} from "@/catalog/CatalogView";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useCreateOutletMutation,
  useOutletsQuery,
  useRestoreOutletMutation,
  type OutletSummary,
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
  const [view, setView] = useViewMode();

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
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
          }
          label={t("showArchived")}
        />
        <ViewToggle value={view} onChange={setView} />
      </Stack>
      {outlets.isLoading && <CircularProgress aria-label={t("loading")} />}
      {outlets.data && outlets.data.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {outlets.data && outlets.data.length > 0 && (
        <OutletItems
          outlets={outlets.data}
          view={view}
          label={t("table")}
          canEdit={canEdit}
          canAdd={canAdd}
          restoring={restoring.isLoading}
          onRestore={(id) => restore(id)}
        />
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

type OutletList = OutletSummary[];

function OutletItems({
  outlets,
  view,
  label,
  canEdit,
  canAdd,
  restoring,
  onRestore,
}: {
  outlets: OutletList;
  view: "grid" | "list";
  label: string;
  canEdit: boolean;
  canAdd: boolean;
  restoring: boolean;
  onRestore: (id: number) => void;
}) {
  const t = useTranslations("outlets");
  const items = outlets.map((outlet) => {
    const archived = outlet.archivedAt !== null;
    const status: { label: string; tone: Tone } = archived
      ? { label: t("archived"), tone: "default" }
      : outlet.isBusy
        ? { label: t("busy"), tone: "warning" }
        : outlet.isPublic
          ? { label: t("public"), tone: "success" }
          : { label: t("private"), tone: "default" };
    const service = [
      outlet.pickupEnabled ? t("pickup") : null,
      outlet.deliveryEnabled ? t("delivery") : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: outlet.id,
      address: outlet.addressText,
      shared: {
        name: outlet.name,
        href: `/outlets/${outlet.id}`,
        hidePhoto: true,
        muted: archived,
        status,
        stats: [
          { label: t("phone"), value: outlet.phone || "—" },
          { label: t("service"), value: service || "—" },
        ],
        actions: archived ? (
          canAdd && (
            <Button
              size="small"
              disabled={restoring}
              aria-label={t("restoreAria", { name: outlet.name })}
              onClick={() => onRestore(outlet.id)}
            >
              {t("restore")}
            </Button>
          )
        ) : (
          <Button
            size="small"
            component={Link}
            href={`/outlets/${outlet.id}`}
            aria-label={t("openAria", { name: outlet.name })}
          >
            {canEdit ? t("edit") : t("view")}
          </Button>
        ),
      },
    };
  });
  return view === "grid" ? (
    <ItemGrid label={label}>
      {items.map((i) => (
        <ItemCard
          key={i.id}
          {...i.shared}
          extra={
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minHeight: 40 }}
            >
              {i.address}
            </Typography>
          }
        />
      ))}
    </ItemGrid>
  ) : (
    <ItemList label={label}>
      {items.map((i) => (
        <ItemRow key={i.id} {...i.shared} subtitle={i.address ?? undefined} />
      ))}
    </ItemList>
  );
}
