"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
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
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useOutletsQuery, type OutletSummary } from "@/outlets/outletsApi";
import {
  useAdjustStockMutation,
  useMovementsQuery,
  usePublishAtOutletMutation,
  useSetStockMutation,
  type Product,
  type ProductOutlet,
} from "./catalogApi";
import { stockLevel } from "./money";

interface Props {
  product: Product;
  /** `catalog` full: set stock, adjust, see movements. */
  canManage: boolean;
  /** The `availability_toggle` extra: publish and sold-out switches. */
  canToggle: boolean;
}

const DEFAULT: Omit<ProductOutlet, "outletId"> = {
  isPublished: false,
  stockStatus: "in_stock",
  quantity: null,
  lowStockThreshold: null,
  isSoldOut: false,
  version: 1,
};

export function ProductAvailabilityTab({
  product,
  canManage,
  canToggle,
}: Props) {
  const t = useTranslations("catalog.availability");
  const errorMessage = useErrorMessage();
  const outlets = useOutletsQuery();
  const [publish, publishing] = usePublishAtOutletMutation();
  const [setStock, stocking] = useSetStockMutation();
  const [dialog, setDialog] = useState<{
    kind: "stock" | "adjust" | "movements";
    outlet: OutletSummary;
  } | null>(null);
  const live = product.archivedAt === null;
  const mayToggle = live && (canManage || canToggle);

  const error = (outlets.error ?? publishing.error ?? stocking.error) as
    ApiError | undefined;
  const rows = (outlets.data ?? []).filter((o) => o.archivedAt === null);

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      {outlets.data && rows.length === 0 && (
        <Typography color="text.secondary">{t("none")}</Typography>
      )}
      {rows.length > 0 && (
        <TableContainer>
          <Table size="small" aria-label={t("table")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("outlet")}</TableCell>
                <TableCell>{t("published")}</TableCell>
                <TableCell>{t("stock")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((outlet) => {
                const state: ProductOutlet = {
                  outletId: outlet.id,
                  ...DEFAULT,
                  ...product.outlets.find((o) => o.outletId === outlet.id),
                };
                const level = stockLevel(state);
                const untracked = state.stockStatus !== "tracked";
                return (
                  <TableRow key={outlet.id}>
                    <TableCell>{outlet.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={state.isPublished}
                        disabled={!mayToggle || publishing.isLoading}
                        slotProps={{
                          input: {
                            "aria-label": t("publishAt", { name: outlet.name }),
                          },
                        }}
                        onChange={(event) =>
                          publish({
                            id: product.id,
                            outletId: outlet.id,
                            isPublished: event.target.checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          size="small"
                          color={
                            level === "out"
                              ? "error"
                              : level === "low"
                                ? "warning"
                                : "default"
                          }
                          label={t(`level.${level}`, {
                            quantity: state.quantity ?? 0,
                          })}
                        />
                        {mayToggle && !canManage && untracked && (
                          <Switch
                            checked={state.isSoldOut}
                            disabled={stocking.isLoading}
                            slotProps={{
                              input: {
                                "aria-label": t("soldOutAt", {
                                  name: outlet.name,
                                }),
                              },
                            }}
                            onChange={(event) =>
                              setStock({
                                id: product.id,
                                outletId: outlet.id,
                                stock: {
                                  status: event.target.checked
                                    ? "out_of_stock"
                                    : "in_stock",
                                },
                              })
                            }
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {canManage && live && (
                        <>
                          <Button
                            size="small"
                            onClick={() => setDialog({ kind: "stock", outlet })}
                          >
                            {t("setStock")}
                          </Button>
                          {state.stockStatus === "tracked" && (
                            <Button
                              size="small"
                              onClick={() =>
                                setDialog({ kind: "adjust", outlet })
                              }
                            >
                              {t("adjust")}
                            </Button>
                          )}
                        </>
                      )}
                      {canManage && (
                        <Button
                          size="small"
                          onClick={() =>
                            setDialog({ kind: "movements", outlet })
                          }
                        >
                          {t("movements")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {dialog?.kind === "stock" && (
        <StockDialog
          product={product}
          outlet={dialog.outlet}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "adjust" && (
        <AdjustDialog
          product={product}
          outlet={dialog.outlet}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "movements" && (
        <MovementsDialog
          product={product}
          outlet={dialog.outlet}
          onClose={() => setDialog(null)}
        />
      )}
    </Stack>
  );
}

interface DialogProps {
  product: Product;
  outlet: OutletSummary;
  onClose: () => void;
}

function current(product: Product, outletId: number): ProductOutlet {
  return {
    outletId,
    ...DEFAULT,
    ...product.outlets.find((o) => o.outletId === outletId),
  };
}

const COUNT = /^\d{1,7}$/;

function StockDialog({ product, outlet, onClose }: DialogProps) {
  const t = useTranslations("catalog.stock");
  const errorMessage = useErrorMessage();
  const state = current(product, outlet.id);
  const [save, { isLoading, error }] = useSetStockMutation();
  const [status, setStatus] = useState(state.stockStatus);
  const [quantity, setQuantity] = useState(String(state.quantity ?? ""));
  const [threshold, setThreshold] = useState(
    String(state.lowStockThreshold ?? ""),
  );
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const tracked = status === "tracked";

  const submit = async () => {
    if (tracked && !COUNT.test(quantity.trim())) {
      setProblem(t("quantityInvalid"));
      return;
    }
    if (tracked && threshold.trim() !== "" && !COUNT.test(threshold.trim())) {
      setProblem(t("thresholdInvalid"));
      return;
    }
    setProblem(null);
    const result = await save({
      id: product.id,
      outletId: outlet.id,
      stock: {
        status: status as "in_stock" | "out_of_stock" | "tracked",
        quantity: tracked ? Number(quantity) : null,
        lowStockThreshold:
          tracked && threshold.trim() !== "" ? Number(threshold) : null,
        version: state.version,
        reason: reason.trim() === "" ? null : reason.trim(),
      },
    });
    if (result.data) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("title", { name: outlet.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
          )}
          {problem && <Alert severity="error">{problem}</Alert>}
          <TextField
            select
            label={t("status")}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <MenuItem value="in_stock">{t("inStock")}</MenuItem>
            <MenuItem value="out_of_stock">{t("outOfStock")}</MenuItem>
            <MenuItem value="tracked">{t("tracked")}</MenuItem>
          </TextField>
          {tracked && (
            <>
              <TextField
                label={t("quantity")}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <TextField
                label={t("threshold")}
                helperText={t("thresholdHelp")}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </>
          )}
          <TextField
            label={t("reason")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button variant="contained" disabled={isLoading} onClick={submit}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AdjustDialog({ product, outlet, onClose }: DialogProps) {
  const t = useTranslations("catalog.adjust");
  const errorMessage = useErrorMessage();
  const [adjust, { isLoading, error }] = useAdjustStockMutation();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    if (!/^-?\d{1,7}$/.test(delta.trim()) || Number(delta) === 0) {
      setProblem(t("deltaInvalid"));
      return;
    }
    if (reason.trim() === "") {
      setProblem(t("reasonRequired"));
      return;
    }
    setProblem(null);
    const result = await adjust({
      id: product.id,
      outletId: outlet.id,
      delta: Number(delta),
      reason: reason.trim(),
    });
    if (result.data) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("title", { name: outlet.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{t("help")}</Typography>
          {error && (
            <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
          )}
          {problem && <Alert severity="error">{problem}</Alert>}
          <TextField
            label={t("delta")}
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
          />
          <TextField
            label={t("reason")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button variant="contained" disabled={isLoading} onClick={submit}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MovementsDialog({ product, outlet, onClose }: DialogProps) {
  const t = useTranslations("catalog.movements");
  const errorMessage = useErrorMessage();
  const [page, setPage] = useState(1);
  const movements = useMovementsQuery(
    { id: product.id, outletId: outlet.id, page },
    { refetchOnMountOrArgChange: true },
  );
  const data = movements.data;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("title", { name: outlet.name })}</DialogTitle>
      <DialogContent>
        {movements.error && (
          <Alert severity="error">
            {errorMessage(movements.error as ApiError)}
          </Alert>
        )}
        {data && data.results.length === 0 && (
          <Typography color="text.secondary">{t("empty")}</Typography>
        )}
        {data && data.results.length > 0 && (
          <Table size="small" aria-label={t("table")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("date")}</TableCell>
                <TableCell align="right">{t("change")}</TableCell>
                <TableCell align="right">{t("after")}</TableCell>
                <TableCell>{t("reason")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.results.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {new Date(m.createdAt).toLocaleString("es-HN")}
                  </TableCell>
                  <TableCell align="right">
                    {m.delta === null
                      ? "—"
                      : m.delta > 0
                        ? `+${m.delta}`
                        : m.delta}
                  </TableCell>
                  <TableCell align="right">{m.quantityAfter ?? "—"}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        {data && data.totalPages > 1 && (
          <>
            <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t("previous")}
            </Button>
            <Button
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t("next")}
            </Button>
          </>
        )}
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
