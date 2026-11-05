"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useOutletsQuery } from "@/outlets/outletsApi";
import { useUpdateMemberMutation, type Member } from "./teamApi";

interface Props {
  member: Member | null;
  name: string;
  onClose: () => void;
}

/** Choose which outlets a team member can use. Mounted only while open, so
 * the outlet list is read when needed. */
export function OutletsDialog({ member, name, onClose }: Props) {
  const t = useTranslations("team.outlets");
  const errorMessage = useErrorMessage();
  const outlets = useOutletsQuery(undefined, {
    skip: member === null,
    refetchOnMountOrArgChange: true,
  });
  const [update, { isLoading, error }] = useUpdateMemberMutation();
  const [mode, setMode] = useState<"all" | "some">(
    member?.allOutlets === false ? "some" : "all",
  );
  const [chosen, setChosen] = useState<number[]>(member?.outletIds ?? []);

  if (member === null) return null;

  const save = async () => {
    const result = await update({
      id: member.id,
      changes: mode === "all" ? { allOutlets: true } : { outletIds: chosen },
    });
    if (!result.error) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("title", { name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
          )}
          {outlets.error && (
            <Alert severity="error">
              {errorMessage(outlets.error as ApiError)}
            </Alert>
          )}
          <RadioGroup
            value={mode}
            onChange={(event) => setMode(event.target.value as "all" | "some")}
          >
            <FormControlLabel
              value="all"
              control={<Radio />}
              label={t("all")}
            />
            <FormControlLabel
              value="some"
              control={<Radio />}
              label={t("some")}
            />
          </RadioGroup>
          {mode === "some" && (
            <Stack sx={{ pl: 4 }}>
              {outlets.data?.length === 0 && (
                <Typography color="text.secondary">{t("none")}</Typography>
              )}
              {outlets.data?.map((outlet) => (
                <FormControlLabel
                  key={outlet.id}
                  label={outlet.name}
                  control={
                    <Checkbox
                      checked={chosen.includes(outlet.id)}
                      onChange={(event) =>
                        setChosen((current) =>
                          event.target.checked
                            ? [...current, outlet.id]
                            : current.filter((id) => id !== outlet.id),
                        )
                      }
                    />
                  }
                />
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={isLoading}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
