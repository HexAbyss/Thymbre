import { statusLabel } from "@/lib/format";
import type { IdentifyStatus } from "@/lib/types";

/** The status in words, with a small dot as a secondary cue. */
export function StatusPill({ status }: { status: IdentifyStatus }) {
  return (
    <span className="pill" data-status={status}>
      <span className="pill-dot" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
