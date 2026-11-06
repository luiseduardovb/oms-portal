"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useOptionGroupsQuery,
  useSetProductGroupsMutation,
  type Product,
} from "./catalogApi";

const MAX_GROUPS = 20;

interface GroupLinkState {
  groupId: number;
  min: string;
  max: string;
}

const WHOLE = /^\d{1,2}$/;

export function ProductOptionsTab({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const t = useTranslations("catalog.productOptions");
  const errorMessage = useErrorMessage();
  const groups = useOptionGroupsQuery();
  const [save, { isLoading, error, isSuccess, reset }] =
    useSetProductGroupsMutation();
  const [links, setLinks] = useState<GroupLinkState[]>(
    product.optionGroups.map((g) => ({
      groupId: g.id,
      min: g.minOverride === null ? "" : String(g.minOverride),
      max: g.maxOverride === null ? "" : String(g.maxOverride),
    })),
  );
  const [adding, setAdding] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const editable = canEdit && product.archivedAt === null;
  const all = groups.data ?? [];
  const available = all.filter((g) => !links.some((l) => l.groupId === g.id));

  const change = (groupId: number, patch: Partial<GroupLinkState>) => {
    reset();
    setLinks((now) =>
      now.map((l) => (l.groupId === groupId ? { ...l, ...patch } : l)),
    );
  };

  const submit = () => {
    for (const link of links) {
      const min = link.min.trim();
      const max = link.max.trim();
      if (
        (min !== "" && !WHOLE.test(min)) ||
        (max !== "" && (!WHOLE.test(max) || Number(max) < 1))
      ) {
        setProblem(t("overrideInvalid"));
        return;
      }
    }
    setProblem(null);
    save({
      id: product.id,
      groups: links.map((l) => ({
        optionGroupId: l.groupId,
        minOverride: l.min.trim() === "" ? null : Number(l.min),
        maxOverride: l.max.trim() === "" ? null : Number(l.max),
      })),
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography color="text.secondary">
          {t("help")} <Link href="/catalog/options">{t("manage")}</Link>
        </Typography>
        {groups.error && (
          <Alert severity="error">
            {errorMessage(groups.error as ApiError)}
          </Alert>
        )}
        {error && (
          <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
        )}
        {problem && <Alert severity="error">{problem}</Alert>}
        {isSuccess && <Alert severity="success">{t("saved")}</Alert>}
        {links.length === 0 && (
          <Typography color="text.secondary">{t("none")}</Typography>
        )}
        {links.length > 0 && (
          <Table size="small" aria-label={t("table")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("group")}</TableCell>
                <TableCell>{t("rule")}</TableCell>
                <TableCell>{t("minOverride")}</TableCell>
                <TableCell>{t("maxOverride")}</TableCell>
                {editable && (
                  <TableCell align="right">{t("actions")}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {links.map((link) => {
                const group = all.find((g) => g.id === link.groupId);
                const name = group?.name ?? `#${link.groupId}`;
                return (
                  <TableRow key={link.groupId}>
                    <TableCell>{name}</TableCell>
                    <TableCell>
                      {group
                        ? group.selectionType === "single"
                          ? t("single")
                          : t("multiple", {
                              min: group.minSelect,
                              max: group.maxSelect,
                            })
                        : ""}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={link.min}
                        disabled={!editable}
                        placeholder={t("groupDefault")}
                        sx={{ width: 110 }}
                        slotProps={{
                          htmlInput: {
                            "aria-label": t("minFor", { name }),
                          },
                        }}
                        onChange={(event) =>
                          change(link.groupId, { min: event.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={link.max}
                        disabled={!editable}
                        placeholder={t("groupDefault")}
                        sx={{ width: 110 }}
                        slotProps={{
                          htmlInput: {
                            "aria-label": t("maxFor", { name }),
                          },
                        }}
                        onChange={(event) =>
                          change(link.groupId, { max: event.target.value })
                        }
                      />
                    </TableCell>
                    {editable && (
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          aria-label={t("removeGroup", { name })}
                          onClick={() => {
                            reset();
                            setLinks((now) =>
                              now.filter((l) => l.groupId !== link.groupId),
                            );
                          }}
                        >
                          {t("remove")}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {editable && links.length < MAX_GROUPS && available.length > 0 && (
          <TextField
            select
            size="small"
            label={t("add")}
            value={adding}
            sx={{ maxWidth: 320 }}
            onChange={(event) => {
              const id = Number(event.target.value);
              reset();
              setLinks((now) => [...now, { groupId: id, min: "", max: "" }]);
              setAdding("");
            }}
          >
            {available.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {editable && links.length >= MAX_GROUPS && (
          <Typography variant="caption" color="text.secondary">
            {t("max", { max: MAX_GROUPS })}
          </Typography>
        )}
        {editable && (
          <div>
            <Button variant="contained" disabled={isLoading} onClick={submit}>
              {t("save")}
            </Button>
          </div>
        )}
      </Stack>
    </Paper>
  );
}
