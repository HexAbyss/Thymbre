import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Verdict } from "@/components/Verdict";
import { ApiError, api } from "@/lib/api";
import { DEFAULT_CONFIG } from "@/lib/config";
import type { IdentifyResult } from "@/lib/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, api: { enrollFromClip: vi.fn() } };
});

const unknown: IdentifyResult = { status: "unknown", speaker: null, score: 0.14, clip_id: "clip-1" };

beforeEach(() => {
  vi.mocked(api.enrollFromClip).mockReset();
});

async function fillAndSubmit(name: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), name);
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Enroll this voice" }));
}

describe("Verdict", () => {
  it("enrolls an unknown voice with the clip id and the name that was typed", async () => {
    vi.mocked(api.enrollFromClip).mockResolvedValue({ id: "s", name: "Daniel", sample_count: 1, created_at: "" });
    const onEnrolled = vi.fn();
    render(<Verdict result={unknown} config={DEFAULT_CONFIG} onEnrolled={onEnrolled} />);

    await fillAndSubmit("Daniel");

    expect(api.enrollFromClip).toHaveBeenCalledWith("clip-1", "Daniel");
    expect(onEnrolled).toHaveBeenCalledWith("Daniel");
  });

  it("says the sample expired when the server no longer has the clip", async () => {
    vi.mocked(api.enrollFromClip).mockRejectedValue(new ApiError(404, "clip not found or expired"));
    const onEnrolled = vi.fn();
    render(<Verdict result={unknown} config={DEFAULT_CONFIG} onEnrolled={onEnrolled} />);

    await fillAndSubmit("Daniel");

    expect(await screen.findByRole("alert")).toHaveTextContent(/expired/);
    expect(onEnrolled).not.toHaveBeenCalled();
  });

  it("states how long the sample is kept and that no recording is stored", () => {
    render(<Verdict result={unknown} config={DEFAULT_CONFIG} onEnrolled={vi.fn()} />);

    expect(screen.getByText(/kept for 10 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/No recording is stored/)).toBeInTheDocument();
  });

  it("shows the speaker and no enroll offer for a match", () => {
    const match: IdentifyResult = { status: "match", speaker: { id: "1", name: "Ana" }, score: 0.9, clip_id: null };
    render(<Verdict result={match} config={DEFAULT_CONFIG} onEnrolled={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Ana" })).toBeInTheDocument();
    expect(screen.queryByText("Enroll this voice?")).not.toBeInTheDocument();
  });

  it("explains an uncertain result and names the closest voice", () => {
    const uncertain: IdentifyResult = { status: "uncertain", speaker: { id: "1", name: "Ana" }, score: 0.6, clip_id: null };
    render(<Verdict result={uncertain} config={DEFAULT_CONFIG} onEnrolled={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Not sure who this is" })).toBeInTheDocument();
    expect(screen.getByText(/closest voice is Ana/)).toBeInTheDocument();
    expect(screen.queryByText("Enroll this voice?")).not.toBeInTheDocument();
  });

  it("says nobody is enrolled when there is no score", () => {
    const empty: IdentifyResult = { status: "unknown", speaker: null, score: null, clip_id: "c" };
    render(<Verdict result={empty} config={DEFAULT_CONFIG} onEnrolled={vi.fn()} />);

    expect(screen.getByText(/Nobody is enrolled yet/)).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });

  it("hides the form and confirms once the voice is enrolled", () => {
    render(<Verdict result={unknown} config={DEFAULT_CONFIG} enrolledAs="Daniel" onEnrolled={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Enrolled as Daniel");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });
});
