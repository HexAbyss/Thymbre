"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import { DEFAULT_CONFIG } from "@/lib/config";
import type { AppConfig } from "@/lib/types";

const ConfigContext = createContext<AppConfig>(DEFAULT_CONFIG);

/** Loads the server's thresholds and limits once. Defaults apply until it answers. */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    api
      .config()
      .then(setConfig)
      .catch(() => undefined);
  }, []);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);
