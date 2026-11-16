"use client";

import { TriangleAlert } from "lucide-react";

import { useHealth } from "@/hooks/useHealth";

/** Says nothing while the server is reachable. */
export function ServerBanner() {
  if (useHealth() !== "offline") return null;
  return (
    <div className="mx-auto w-full max-w-[960px] px-5 pt-6">
      <p className="notice notice-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" />
        Cannot reach the Thymbre server. Check that it is running.
      </p>
    </div>
  );
}
