"use client";

import { useEffect, type ReactNode } from "react";
import { useAppDispatch } from "@/store/hooks";
import { refreshSession } from "./refresh";
import { sessionEnded, sessionStarted } from "./sessionSlice";
import { onSessionLost } from "./tokenStore";

/** Restores the session on page load from the refresh cookie, and signs the
 * user out of the page when the server ends the session. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    void refreshSession().then((tokens) => {
      if (!active) return;
      dispatch(tokens ? sessionStarted() : sessionEnded());
    });
    const stop = onSessionLost(() => dispatch(sessionEnded()));
    return () => {
      active = false;
      stop();
    };
  }, [dispatch]);

  return children;
}
