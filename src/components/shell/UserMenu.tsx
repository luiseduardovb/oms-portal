"use client";

import LogoutIcon from "@mui/icons-material/Logout";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useLogoutMutation, type Me } from "@/auth/authApi";

export function displayName(user: Me["user"]): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email || "";
}

export function UserMenu({ me }: { me: Me }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [logout] = useLogoutMutation();
  const name = displayName(me.user);

  const signOut = async () => {
    setAnchor(null);
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={t("userMenu")}
        aria-haspopup="menu"
      >
        <Avatar sx={{ width: 32, height: 32 }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        <MenuItem disabled sx={{ opacity: "1 !important", display: "block" }}>
          <Typography variant="subtitle2">{name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {me.role.name}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => void signOut()}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t("logout")}
        </MenuItem>
      </Menu>
    </>
  );
}
