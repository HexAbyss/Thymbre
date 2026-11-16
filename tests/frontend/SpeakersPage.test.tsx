import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfigProvider } from "@/components/ConfigProvider";
import SpeakersPage from "@/app/speakers/page";
import { api } from "@/lib/api";
import { DEFAULT_CONFIG } from "@/lib/config";
import type { Speaker } from "@/lib/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, api: { config: vi.fn(), listSpeakers: vi.fn(), deleteSpeaker: vi.fn(), enroll: vi.fn() } };
});

const MB = 1024 * 1024;
const ana: Speaker = { id: "a1", name: "Ana", sample_count: 3, created_at: "2026-11-15T12:00:00Z" };
const bruno: Speaker = { id: "b2", name: "Bruno", sample_count: 1, created_at: "2026-11-14T12:00:00Z" };
const audio = (bytes: number) => new File([new Uint8Array(bytes)], "s.wav", { type: "audio/wav" });

function renderPage(config = DEFAULT_CONFIG) {
  vi.mocked(api.config).mockResolvedValue(config);
  return render(
    <ConfigProvider>
      <SpeakersPage />
    </ConfigProvider>,
  );
}

beforeEach(() => {
  Object.values(vi.mocked(api)).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset());
  vi.mocked(api.listSpeakers).mockResolvedValue([ana, bruno]);
});

describe("Speakers page", () => {
  it("lists every enrolled voice with its number of samples", async () => {
    renderPage();

    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]).getByText("Ana")).toBeInTheDocument();
    expect(within(rows[1]).getByText("3")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Bruno")).toBeInTheDocument();
  });

  it("invites the first enrollment when nobody is enrolled", async () => {
    vi.mocked(api.listSpeakers).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("No voices enrolled yet")).toBeInTheDocument();
  });

  it("says when the server cannot be reached", async () => {
    vi.mocked(api.listSpeakers).mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Cannot reach the Thymbre server/);
  });

  it("asks before deleting and does nothing until it is confirmed", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete Ana" }));

    expect(screen.getByText(/all 3 voice samples/)).toBeInTheDocument();
    expect(api.deleteSpeaker).not.toHaveBeenCalled();
  });

  it("deletes after confirmation and refreshes the list", async () => {
    vi.mocked(api.deleteSpeaker).mockResolvedValue(undefined);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete Ana" }));
    vi.mocked(api.listSpeakers).mockResolvedValue([bruno]);
    await user.click(screen.getByRole("button", { name: "Delete voice" }));

    expect(api.deleteSpeaker).toHaveBeenCalledWith("a1");
    expect(await screen.findByText("Ana was deleted.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Delete Ana" })).not.toBeInTheDocument());
  });

  it("does not delete when the confirmation is cancelled", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete Ana" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(api.deleteSpeaker).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete Ana" })).toBeInTheDocument();
  });

  it("enrolls a voice from a sample, a name and the consent", async () => {
    vi.mocked(api.enroll).mockResolvedValue({ ...ana, name: "Daniel" });
    renderPage();
    const user = userEvent.setup();
    const sample = audio(100);

    await user.click((await screen.findAllByRole("button", { name: /Enroll a voice/ }))[0]);
    await user.upload(screen.getByLabelText("Audio file"), sample);
    await user.type(screen.getByLabelText("Name"), "Daniel");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enroll voice" }));

    expect(api.enroll).toHaveBeenCalledWith("Daniel", [sample]);
    expect(await screen.findByText("Daniel was enrolled.")).toBeInTheDocument();
  });

  it("keeps the enroll button disabled until there is a sample", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole("button", { name: /Enroll a voice/ }))[0]);
    await user.type(screen.getByLabelText("Name"), "Daniel");
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: "Enroll voice" })).toBeDisabled();
  });

  it("refuses a sample that would take the enrollment over the total limit", async () => {
    renderPage({ ...DEFAULT_CONFIG, max_upload_bytes: 2 * MB, max_request_bytes: 3 * MB });
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole("button", { name: /Enroll a voice/ }))[0]);
    const input = screen.getByLabelText("Audio file");
    await user.upload(input, audio(2 * MB));
    await user.upload(input, audio(2 * MB));

    expect(screen.getByRole("alert")).toHaveTextContent(/over 3 MB/);
    expect(screen.getAllByText(/^Sample \d/)).toHaveLength(1);
  });
});
