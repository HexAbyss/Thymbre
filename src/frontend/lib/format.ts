import type { IdentifyStatus } from "./types";

export function formatScore(score: number | null): string {
  return score === null ? "n/a" : score.toFixed(2);
}

export function formatDuration(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The interface is in English, so dates and times are too, whatever the browser language is. */
const LOCALE = "en-US";

export function formatClock(date: Date): string {
  return date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { year: "numeric", month: "short", day: "numeric" });
}

const LABELS: Record<IdentifyStatus, string> = {
  match: "Match",
  unknown: "Unknown",
  uncertain: "Uncertain",
};

export function statusLabel(status: IdentifyStatus): string {
  return LABELS[status];
}
