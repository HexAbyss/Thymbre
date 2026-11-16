import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IdentifyPage from "@/app/page";
import { ApiError, api } from "@/lib/api";
import type { IdentifyResult } from "@/lib/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, api: { identify: vi.fn(), enrollFromClip: vi.fn() } };
});

const match: IdentifyResult = { status: "match", speaker: { id: "a1", name: "Ana" }, score: 0.91, clip_id: null };
const unknown: IdentifyResult = { status: "unknown", speaker: null, score: 0.14, clip_id: "clip-1" };
const clip = (name: string) => new File([new Uint8Array(10)], name, { type: "audio/wav" });

beforeEach(() => {
  vi.mocked(api.identify).mockReset();
});

async function upload(name: string) {
  await userEvent.setup().upload(screen.getByLabelText("Audio file"), clip(name));
}

describe("Identify page", () => {
  it("explains the empty history", () => {
    render(<IdentifyPage />);

    expect(screen.getByText(/appear here until you close the tab/)).toBeInTheDocument();
  });

  it("identifies an uploaded file and lists the attempt with its score", async () => {
    vi.mocked(api.identify).mockResolvedValue(match);
    render(<IdentifyPage />);

    await upload("voice.wav");

    const history = await screen.findByRole("list");
    expect(within(history).getByText("Ana")).toBeInTheDocument();
    expect(within(history).getByText("0.91")).toBeInTheDocument();
    expect(within(history).getByText(/voice\.wav/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ana" })).toBeInTheDocument();
  });

  it("offers to enroll an unknown voice", async () => {
    vi.mocked(api.identify).mockResolvedValue(unknown);
    render(<IdentifyPage />);

    await upload("stranger.wav");

    expect(await screen.findByRole("heading", { name: "Unknown voice" })).toBeInTheDocument();
    expect(screen.getByText("Enroll this voice?")).toBeInTheDocument();
  });

  it("shows a readable error and keeps the failed attempt in the list", async () => {
    vi.mocked(api.identify).mockRejectedValue(new ApiError(422, "0.4s of speech found, 3.0s needed"));
    render(<IdentifyPage />);

    await upload("short.wav");

    expect(await screen.findByRole("alert")).toHaveTextContent("Only 0.4 s of speech was heard");
    expect(within(screen.getByRole("list")).getByText("Could not read clip")).toBeInTheDocument();
  });

  it("shows the result of the attempt that is selected", async () => {
    vi.mocked(api.identify).mockResolvedValueOnce(match).mockResolvedValueOnce(unknown);
    render(<IdentifyPage />);
    const user = userEvent.setup();

    await upload("first.wav");
    await screen.findByRole("heading", { name: "Ana" });
    await upload("second.wav");
    await screen.findByRole("heading", { name: "Unknown voice" });
    await user.click(within(screen.getByRole("list")).getByText("Ana"));

    expect(screen.getByRole("heading", { name: "Ana" })).toBeInTheDocument();
  });

  it("lists the newest attempt first", async () => {
    vi.mocked(api.identify).mockResolvedValueOnce(match).mockResolvedValueOnce(unknown);
    render(<IdentifyPage />);

    await upload("first.wav");
    await screen.findByRole("heading", { name: "Ana" });
    await upload("second.wav");
    await screen.findByRole("heading", { name: "Unknown voice" });

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Unknown voice");
    expect(items[1]).toHaveTextContent("Ana");
  });
});
