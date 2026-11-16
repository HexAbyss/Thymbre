import { describe, expect, it, vi } from "vitest";

import { formatBytes, formatClock, formatDate, formatDuration, formatScore, statusLabel } from "@/lib/format";

describe("format", () => {
  it("shows scores with two decimals", () => {
    expect(formatScore(0.9014742)).toBe("0.90");
    expect(formatScore(0.1)).toBe("0.10");
  });

  it("shows a dash when there is no score", () => {
    expect(formatScore(null)).toBe("n/a");
  });

  it("formats durations as m:ss", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65.4)).toBe("1:05");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats dates in English whatever the browser language is", () => {
    const spy = vi.spyOn(Date.prototype, "toLocaleDateString");

    expect(formatDate("2026-11-15T12:00:00Z")).toBe("Nov 15, 2026");
    expect(spy.mock.calls[0][0]).toBe("en-US");
    spy.mockRestore();
  });

  it("formats clock times in English whatever the browser language is", () => {
    const spy = vi.spyOn(Date.prototype, "toLocaleTimeString");

    formatClock(new Date("2026-11-15T15:04:05Z"));

    expect(spy.mock.calls[0][0]).toBe("en-US");
    spy.mockRestore();
  });

  it("labels every identification status", () => {
    expect(statusLabel("match")).toBe("Match");
    expect(statusLabel("unknown")).toBe("Unknown");
    expect(statusLabel("uncertain")).toBe("Uncertain");
  });
});
