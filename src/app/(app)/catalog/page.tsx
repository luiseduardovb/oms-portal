"use client";

import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
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
import {
  useCategoriesQuery,
  useCreateProductMutation,
  useProductsQuery,
  useUpdateProductMutation,
} from "@/catalog/catalogApi";
import { CatalogNav } from "@/catalog/CatalogNav";
import {
  currencySymbol,
  formatMoney,
  MONEY_INPUT,
  stockLevel,
} from "@/catalog/money";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useOutletsQuery } from "@/outlets/outletsApi";

const PAGE_SIZE = 25;

export default function CatalogPage() {
  const t = useTranslations("catalog");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const { data: me } = useMe();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [outletId, setOutletId] = useState<number | "">("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const products = useProductsQuery(
    {
      page,
      itemsPerPage: PAGE_SIZE,
      search: search || undefined,
      categoryId: categoryId === "" ? undefined : categoryId,
      outletId: outletId === "" ? undefined : outletId,
      includeArchived: showArchived,
    },
    { skip: !me, refetchOnMountOrArgChange: true },
  );
  const categories = useCategoriesQuery();
  const outlets = useOutletsQuery();
  const [update, updating] = useUpdateProductMutation();

  if (!me) return null;
  if (!can(me.levels, "catalog", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "catalog", "full") && me.outlets.all;
  const currency = me.merchant.currencyCode;
  const symbol = currencySymbol(currency);
  const error = (products.error ?? updating.error) as ApiError | undefined;
  const data = products.data;

  const reset = (change: () => void) => {
    change();
    setPage(1);
  };

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
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreating(true)}
          >
            {t("new")}
          </Button>
        )}
      </Stack>
      <CatalogNav />
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        component="form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          reset(() => setSearch(searchText.trim()));
        }}
      >
        <TextField
          size="small"
          type="search"
          label={t("search")}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <TextField
          select
          size="small"
          label={t("category")}
          value={categoryId}
          sx={{ minWidth: 180 }}
          onChange={(event) =>
            reset(() =>
              setCategoryId(
                event.target.value === "" ? "" : Number(event.target.value),
              ),
            )
          }
        >
          <MenuItem value="">{t("allCategories")}</MenuItem>
          {categories.data?.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t("outlet")}
          value={outletId}
          sx={{ minWidth: 180 }}
          onChange={(event) =>
            reset(() =>
              setOutletId(
                event.target.value === "" ? "" : Number(event.target.value),
              ),
            )
          }
        >
          <MenuItem value="">{t("allOutlets")}</MenuItem>
          {outlets.data
            ?.filter((o) => o.archivedAt === null)
            .map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.name}
              </MenuItem>
            ))}
        </TextField>
        <Button type="submit" variant="outlined">
          {t("searchButton")}
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={showArchived}
              onChange={(event) =>
                reset(() => setShowArchived(event.target.checked))
              }
            />
          }
          label={t("showArchived")}
        />
      </Stack>
      {products.isLoading && <CircularProgress aria-label={t("loading")} />}
      {data && data.results.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {data && data.results.length > 0 && (
        <TableContainer>
          <Table size="small" aria-label={t("table")}>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>{t("name")}</TableCell>
                <TableCell>{t("sku")}</TableCell>
                <TableCell align="right">{t("price")}</TableCell>
                <TableCell>{t("colCategories")}</TableCell>
                <TableCell>{t("published")}</TableCell>
                {outletId !== "" && <TableCell>{t("colStock")}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.results.map((product) => {
                const here = product.outlets.find(
                  (o) => o.outletId === outletId,
                );
                const level = here ? stockLevel(here) : "in";
                return (
                  <TableRow key={product.id}>
                    <TableCell width={56}>
                      <Avatar
                        variant="rounded"
                        src={product.image?.thumbUrl ?? undefined}
                        alt=""
                        sx={{ width: 40, height: 40 }}
                      >
                        {product.name.slice(0, 1)}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Link href={`/catalog/${product.id}`}>
                        {product.name}
                      </Link>
                      {product.archivedAt && (
                        <Chip
                          size="small"
                          sx={{ ml: 1 }}
                          label={t("archived")}
                        />
                      )}
                    </TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell align="right">
                      {formatMoney(product.basePrice, currency)}
                    </TableCell>
                    <TableCell>
                      {product.categories.map((c) => c.name).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.isPublished}
                        disabled={
                          !canEdit ||
                          product.archivedAt !== null ||
                          updating.isLoading
                        }
                        slotProps={{
                          input: {
                            "aria-label": t("publish", { name: product.name }),
                          },
                        }}
                        onChange={(event) =>
                          update({
                            id: product.id,
                            changes: { isPublished: event.target.checked },
                          })
                        }
                      />
                    </TableCell>
                    {outletId !== "" && (
                      <TableCell>
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
                            quantity: here?.quantity ?? 0,
                          })}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={data.totalCount}
            page={data.page - 1}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_event, next) => setPage(next + 1)}
            labelDisplayedRows={({ from, to, count }) =>
              t("range", { from, to, count })
            }
          />
        </TableContainer>
      )}
      <NewProductDialog
        open={creating}
        currency={symbol}
        onClose={() => setCreating(false)}
        onCreated={(id) => router.push(`/catalog/${id}`)}
      />
    </Stack>
  );
}

function NewProductDialog({
  open,
  currency,
  onClose,
  onCreated,
}: {
  open: boolean;
  currency: string;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const t = useTranslations("catalog.create");
  const errorMessage = useErrorMessage();
  const [create, { isLoading, error, reset }] = useCreateProductMutation();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [problems, setProblems] = useState<Record<string, string>>({});

  const close = () => {
    onClose();
    setName("");
    setPrice("");
    setProblems({});
    reset();
  };

  const submit = async () => {
    const found: Record<string, string> = {};
    if (name.trim() === "") found.name = t("nameRequired");
    if (!MONEY_INPUT.test(price.trim())) found.price = t("priceInvalid");
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    const result = await create({
      name: name.trim(),
      basePrice: price.trim(),
      priceIncludesTax: true,
      isPublished: false,
      categoryIds: [],
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
            error={"name" in problems}
            helperText={problems.name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label={t("price", { currency })}
            value={price}
            error={"price" in problems}
            helperText={problems.price}
            onChange={(event) => setPrice(event.target.value)}
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
