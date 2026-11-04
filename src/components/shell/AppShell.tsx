"use client";

import HomeIcon from "@mui/icons-material/Home";
import GroupIcon from "@mui/icons-material/Group";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useMe } from "@/auth/useSession";
import { MerchantSwitcher } from "./MerchantSwitcher";
import { NAV_ITEMS, visibleNav } from "./nav";
import { UserMenu } from "./UserMenu";

const DRAWER_WIDTH = 232;

const ICONS: Record<string, ReactNode> = {
  home: <HomeIcon />,
  team: <GroupIcon />,
  setup: <SettingsIcon />,
};

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("shell");
  const theme = useTheme();
  const permanent = useMediaQuery(theme.breakpoints.up("md"));
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: me } = useMe();

  const items = visibleNav(NAV_ITEMS, me?.levels);
  const nav = (
    <List component="nav" aria-label={t("navigation")}>
      {items.map((item) => (
        <ListItemButton
          key={item.key}
          component={Link}
          href={item.href}
          selected={
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          }
          onClick={() => setOpen(false)}
        >
          <ListItemIcon>{ICONS[item.key]}</ListItemIcon>
          <ListItemText primary={t(`nav.${item.key}`)} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
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
          <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
            {t("title")}
          </Typography>
          {me && <MerchantSwitcher me={me} />}
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
          },
        }}
      >
        <Toolbar />
        {nav}
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, minWidth: 0 }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
