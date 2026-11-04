"use client";

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Button from "@mui/material/Button";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSwitchMerchantMutation, type Me } from "@/auth/authApi";

export function MerchantSwitcher({ me }: { me: Me }) {
  const t = useTranslations("shell");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [switchMerchant, { isLoading }] = useSwitchMerchantMutation();

  if (me.memberships.length < 2) {
    return (
      <Typography noWrap sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <StorefrontIcon fontSize="small" />
        {me.merchant.name}
      </Typography>
    );
  }

  const choose = async (merchantId: number) => {
    setAnchor(null);
    if (merchantId !== me.merchant.id) await switchMerchant(merchantId);
  };

  return (
    <>
      <Button
        color="inherit"
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={<StorefrontIcon />}
        endIcon={<ArrowDropDownIcon />}
        disabled={isLoading}
        aria-label={t("switchMerchant")}
        aria-haspopup="menu"
      >
        {me.merchant.name}
      </Button>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        {me.memberships.map((membership) => (
          <MenuItem
            key={membership.merchantId}
            selected={membership.merchantId === me.merchant.id}
            onClick={() => void choose(membership.merchantId)}
          >
            <ListItemText>{membership.merchantName}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
