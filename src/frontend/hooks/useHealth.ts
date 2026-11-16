"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

export type Health = "checking" | "online" | "offline";

/** Polls the backend so the shell can say whether it is reachable. */
export function useHealth(intervalMs = 15000): Health {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    let active = true;
    const check = () =>
      api
        .health()
        .then(() => active && setHealth("online"))
        .catch(() => active && setHealth("offline"));
    void check();
    const id = setInterval(check, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return health;
}
