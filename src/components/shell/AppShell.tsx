"use client";

import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import GridViewIcon from "@mui/icons-material/GridView";
import GroupIcon from "@mui/icons-material/Group";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useMe } from "@/auth/useSession";
import { MerchantSwitcher } from "./MerchantSwitcher";
import { NAV_ITEMS, isActive, isOpen, visibleNav, type NavItem } from "./nav";
import { UserMenu } from "./UserMenu";

const DRAWER_WIDTH = 256;

/** Where customers see the store; {slug} is the store's address. */
const STOREFRONT = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "";

const ICONS: Record<string, ReactNode> = {
  orders: <ShoppingBagIcon />,
  catalog: <GridViewIcon />,
  team: <GroupIcon />,
  setup: <SettingsIcon />,
};

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("shell");
  const theme = useTheme();
  const permanent = useMediaQuery(theme.breakpoints.up("md"));
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const { data: me } = useMe();

  const items = visibleNav(NAV_ITEMS, me?.levels);
  const storeUrl =
    STOREFRONT && me ? STOREFRONT.replace("{slug}", me.merchant.slug) : null;

  const renderItem = (item: NavItem) => {
    const current = isOpen(item, pathname);
    const group = Boolean(item.children?.length);
    const expanded = group && (toggled[item.key] ?? current);
    return (
      <Box key={item.key}>
        <ListItemButton
          component={NextLink}
          href={item.href}
          selected={current}
          onClick={(event) => {
            if (group) {
              // The group opens or closes; it only navigates when closed.
              if (expanded) event.preventDefault();
              setToggled((prev) => ({ ...prev, [item.key]: !expanded }));
            }
            if (!group) setOpen(false);
          }}
          sx={{
            mx: 1,
            borderRadius: 1.5,
            "&.Mui-selected, &.Mui-selected:hover": {
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "& .MuiListItemIcon-root": { color: "inherit" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{ICONS[item.key]}</ListItemIcon>
          <ListItemText primary={t(`nav.${item.key}`)} />
          {group ? expanded ? <ExpandLess /> : <ExpandMore /> : null}
        </ListItemButton>
        {group && (
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <List disablePadding sx={{ py: 0.5 }}>
              {item.children?.map((child) => (
                <ListItemButton
                  key={child.key}
                  component={NextLink}
                  href={child.href}
                  selected={isActive(child, pathname)}
                  onClick={() => setOpen(false)}
                  sx={{
                    ml: 2,
                    mr: 1,
                    pl: 3,
                    py: 0.75,
                    borderRadius: 1.5,
                    "&.Mui-selected, &.Mui-selected:hover": {
                      bgcolor: "transparent",
                      color: "primary.main",
                      fontWeight: 600,
                    },
                  }}
                >
                  <ListItemText
                    primary={t(`nav.${child.key}`)}
                    slotProps={{
                      primary: {
                        sx: { fontSize: 14, fontWeight: "inherit" },
                      },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  const nav = (
    <List component="nav" aria-label={t("navigation")} sx={{ pt: 2 }}>
      {items.map(renderItem)}
    </List>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!permanent && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setOpen(true)}
              aria-label={t("openMenu")}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {me && <MerchantSwitcher me={me} />}
          </Box>
          {storeUrl && (
            <Link
              href={storeUrl}
              target="_blank"
              rel="noopener"
              underline="none"
              sx={{ fontWeight: 600, mr: 1 }}
            >
              {t("visitStore")}
            </Link>
          )}
          {me && <UserMenu me={me} />}
        </Toolbar>
      </AppBar>
      <Drawer
        variant={permanent ? "permanent" : "temporary"}
        open={permanent || open}
        onClose={() => setOpen(false)}
        sx={{
          width: permanent ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "background.default",
            borderRight: 1,
            borderColor: "divider",
          },
        }}
      >
        <Toolbar />
        {nav}
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, minWidth: 0 }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
