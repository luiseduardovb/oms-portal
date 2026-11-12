"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ButtonBase from "@mui/material/ButtonBase";
import Radio from "@mui/material/Radio";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { StickySave } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useUpdateSettingsMutation, type StoreSetup } from "./setupApi";

type Home = StoreSetup["settings"]["menuHome"];
type Products = StoreSetup["settings"]["menuProducts"];
type Kind = "sections" | "tiles" | "list" | "grid" | "carousel";

/** Where the storefront lives, e.g. https://{slug}.example.com (build-time). */
const STOREFRONT = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "";

const G = "#dfe3ea";
const B = "#c5cbe8";

/** A small wireframe of a phone showing one layout, in the Zyda style. */
function Wire({ kind }: { kind: Kind }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 96,
        height: 168,
        mx: "auto",
        borderRadius: "16px",
        bgcolor: G,
        p: "8px 6px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 3,
          bgcolor: "#fff",
          mx: "auto",
          borderRadius: 2,
        }}
      />
      <Box
        sx={{
          flex: 1,
          bgcolor: "#fff",
          borderRadius: "6px",
          p: "5px",
          overflow: "hidden",
        }}
      >
        {kind === "sections" && (
          <>
            <Box sx={{ display: "flex", gap: "3px", mb: "6px" }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    height: 7,
                    flex: 1,
                    bgcolor: i === 0 ? B : G,
                    borderRadius: 4,
                  }}
                />
              ))}
            </Box>
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: "flex", gap: "4px", mb: "5px" }}>
                <Box sx={{ flex: 1, pt: "3px" }}>
                  <Box
                    sx={{ height: 3, bgcolor: G, mb: "3px", width: "60%" }}
                  />
                  <Box sx={{ height: 3, bgcolor: G, width: "85%" }} />
                </Box>
                <Box
                  sx={{
                    width: 26,
                    height: 22,
                    bgcolor: G,
                    borderRadius: "3px",
                  }}
                />
              </Box>
            ))}
          </>
        )}
        {kind === "tiles" && (
          <Box
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Box key={i}>
                <Box
                  sx={{
                    height: 26,
                    bgcolor: i === 0 ? B : G,
                    borderRadius: "3px",
                  }}
                />
                <Box sx={{ height: 3, bgcolor: G, mt: "3px", width: "70%" }} />
              </Box>
            ))}
          </Box>
        )}
        {kind === "list" && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ display: "flex", gap: "4px", mb: "5px" }}>
                <Box sx={{ flex: 1, pt: "3px" }}>
                  <Box
                    sx={{ height: 3, bgcolor: G, mb: "3px", width: "60%" }}
                  />
                  <Box sx={{ height: 3, bgcolor: G, width: "85%" }} />
                </Box>
                <Box
                  sx={{
                    width: 26,
                    height: 22,
                    bgcolor: B,
                    borderRadius: "3px",
                  }}
                />
              </Box>
            ))}
          </>
        )}
        {kind === "carousel" && (
          <>
            {[0, 1].map((r) => (
              <Box key={r} sx={{ mb: "7px" }}>
                <Box sx={{ height: 3, bgcolor: G, mb: "4px", width: "40%" }} />
                <Box sx={{ display: "flex", gap: "4px", overflow: "hidden" }}>
                  {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ flex: "0 0 62%" }}>
                      <Box
                        sx={{ height: 30, bgcolor: B, borderRadius: "3px" }}
                      />
                      <Box
                        sx={{ height: 3, bgcolor: G, mt: "3px", width: "70%" }}
                      />
                      <Box
                        sx={{ height: 3, bgcolor: G, mt: "2px", width: "50%" }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </>
        )}
        {kind === "grid" && (
          <Box
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}
          >
            {[0, 1, 2, 3].map((i) => (
              <Box key={i}>
                <Box sx={{ height: 30, bgcolor: B, borderRadius: "3px" }} />
                <Box sx={{ height: 3, bgcolor: G, mt: "3px", width: "70%" }} />
                <Box sx={{ height: 3, bgcolor: G, mt: "2px", width: "50%" }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function Choice({
  kind,
  title,
  hint,
  selected,
  disabled,
  onSelect,
}: {
  kind: Kind;
  title: string;
  hint: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      aria-label={title}
      disabled={disabled}
      onClick={onSelect}
      sx={{
        flex: 1,
        minWidth: 150,
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "center",
        p: 2,
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        borderRadius: 2,
        gap: 1,
      }}
    >
      <Wire kind={kind} />
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
      <Radio
        checked={selected}
        tabIndex={-1}
        disableRipple
        sx={{ mx: "auto", p: 0 }}
      />
    </ButtonBase>
  );
}

interface Props {
  setup: StoreSetup;
  canEdit: boolean;
}

export function LayoutTab({ setup, canEdit }: Props) {
  const t = useTranslations("setup.layout");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useUpdateSettingsMutation();
  const [home, setHome] = useState<Home>(setup.settings.menuHome);
  const [products, setProducts] = useState<Products>(
    setup.settings.menuProducts,
  );
  const [tabs, setTabs] = useState(setup.settings.menuTabs);
  const [collapsible, setCollapsible] = useState(
    setup.settings.menuCollapsible,
  );
  const [recommend, setRecommend] = useState(
    setup.settings.showRecommendations,
  );
  const flags = `${tabs ? 1 : 0}-${collapsible ? 1 : 0}`;
  const previewUrl = STOREFRONT
    ? `${STOREFRONT.replace("{slug}", setup.slug)}/?preview=${home}-${products}-${flags}`
    : null;
  const dirty =
    home !== setup.settings.menuHome ||
    products !== setup.settings.menuProducts ||
    tabs !== setup.settings.menuTabs ||
    collapsible !== setup.settings.menuCollapsible ||
    recommend !== setup.settings.showRecommendations;
  // Tabs and collapsing belong to stacked sections; a carousel has its own
  // "View all" instead of collapsing.
  const tabsOff = !canEdit || home === "tiles";
  const collapseOff = !canEdit || home === "tiles" || products === "carousel";

  return (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      spacing={4}
      sx={{ alignItems: "flex-start" }}
    >
      <Stack spacing={4} sx={{ flex: 1, minWidth: 0 }}>
        <Box>
          <Typography variant="h6">{t("homeTitle")}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t("homeHelp")}
          </Typography>
          <Stack
            direction="row"
            role="radiogroup"
            aria-label={t("homeTitle")}
            spacing={2}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Choice
              kind="sections"
              title={t("homeSections")}
              hint={t("homeSectionsHint")}
              selected={home === "sections"}
              disabled={!canEdit}
              onSelect={() => {
                reset();
                setHome("sections");
              }}
            />
            <Choice
              kind="tiles"
              title={t("homeTiles")}
              hint={t("homeTilesHint")}
              selected={home === "tiles"}
              disabled={!canEdit}
              onSelect={() => {
                reset();
                setHome("tiles");
              }}
            />
          </Stack>
        </Box>
        <Box>
          <Typography variant="h6">{t("productsTitle")}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t("productsHelp")}
          </Typography>
          <Stack
            direction="row"
            role="radiogroup"
            aria-label={t("productsTitle")}
            spacing={2}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Choice
              kind="list"
              title={t("productsList")}
              hint={t("productsListHint")}
              selected={products === "list"}
              disabled={!canEdit}
              onSelect={() => {
                reset();
                setProducts("list");
              }}
            />
            <Choice
              kind="grid"
              title={t("productsGrid")}
              hint={t("productsGridHint")}
              selected={products === "grid"}
              disabled={!canEdit}
              onSelect={() => {
                reset();
                setProducts("grid");
              }}
            />
            <Choice
              kind="carousel"
              title={t("productsCarousel")}
              hint={t("productsCarouselHint")}
              selected={products === "carousel"}
              disabled={!canEdit}
              onSelect={() => {
                reset();
                setProducts("carousel");
              }}
            />
          </Stack>
        </Box>
        <Box>
          <Typography variant="h6">{t("optionsTitle")}</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={tabs && home !== "tiles"}
                disabled={tabsOff}
                onChange={(event) => {
                  reset();
                  setTabs(event.target.checked);
                }}
              />
            }
            label={t("tabs")}
            sx={{ display: "flex" }}
          />
          <Typography variant="caption" color="text.secondary">
            {t("tabsHelp")}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={collapsible && !collapseOff}
                disabled={collapseOff}
                onChange={(event) => {
                  reset();
                  setCollapsible(event.target.checked);
                }}
              />
            }
            label={t("collapsible")}
            sx={{ display: "flex", mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {t("collapsibleHelp")}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={recommend}
                disabled={!canEdit}
                onChange={(event) => {
                  reset();
                  setRecommend(event.target.checked);
                }}
              />
            }
            label={t("recommendations")}
            sx={{ display: "flex", mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {t("recommendationsHelp")}
          </Typography>
        </Box>
        {error && (
          <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
        )}
        {isSuccess && <Alert severity="success">{t("saved")}</Alert>}
        {canEdit && (
          <StickySave>
            <Button
              variant="contained"
              disabled={isLoading || !dirty}
              onClick={() =>
                save({
                  menuHome: home,
                  menuProducts: products,
                  menuTabs: tabs,
                  menuCollapsible: collapsible,
                  showRecommendations: recommend,
                })
              }
            >
              {t("save")}
            </Button>
          </StickySave>
        )}
      </Stack>
      <Box
        sx={{
          alignSelf: { lg: "flex-start" },
          position: { lg: "sticky" },
          top: { lg: 88 },
          mx: { xs: "auto", lg: 0 },
        }}
      >
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1, textAlign: "center" }}
        >
          {t("preview")}
        </Typography>
        <Box
          sx={{
            width: 320,
            height: 640,
            border: "10px solid #1f2330",
            borderRadius: "40px",
            overflow: "hidden",
            bgcolor: "#fff",
          }}
        >
          {previewUrl ? (
            <Box
              component="iframe"
              title={t("preview")}
              src={previewUrl}
              sx={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            <Typography
              color="text.secondary"
              sx={{ p: 3, textAlign: "center" }}
            >
              {t("previewOff")}
            </Typography>
          )}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1, textAlign: "center", maxWidth: 320 }}
        >
          {t("previewNote")}
        </Typography>
      </Box>
    </Stack>
  );
}
