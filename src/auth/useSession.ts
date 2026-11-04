"use client";

import { useAppSelector } from "@/store/hooks";
import { useMeQuery } from "./authApi";

export function useSessionStatus() {
  return useAppSelector((state) => state.session.status);
}

/** The signed-in member's profile, once the session is known. */
export function useMe() {
  const status = useSessionStatus();
  return useMeQuery(undefined, { skip: status !== "authenticated" });
}
