import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecorderPanel } from "@/components/RecorderPanel";
import { DEFAULT_CONFIG } from "@/lib/config";

const MB = 1024 * 1024;
const audio = (bytes: number, name = "clip.wav") =>
  new File([new Uint8Array(bytes)], name, { type: "audio/wav" });

class FakeRecorder {
  static isTypeSupported = () => true;
  mimeType = "audio/webm";
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

class FakeAudioContext {
  createAnalyser = () => ({ fftSize: 1024, getByteTimeDomainData: () => undefined });
  createMediaStreamSource = () => ({ connect: () => undefined });
  close = () => Promise.resolve();
}

function stubMicrophone(getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
}

describe("RecorderPanel", () => {
  beforeEach(() => vi.stubGlobal("requestAnimationFrame", () => 0));
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("passes a chosen file on", async () => {
    const onClip = vi.fn();
    render(<RecorderPanel config={DEFAULT_CONFIG} onClip={onClip} />);
    const file = audio(100);

    await userEvent.setup().upload(screen.getByLabelText("Audio file"), file);

    expect(onClip).toHaveBeenCalledWith(file);
  });

  it("refuses a file over the server limit and says so, without sending it", async () => {
    const onClip = vi.fn();
    render(<RecorderPanel config={{ ...DEFAULT_CONFIG, max_upload_bytes: 2 * MB }} onClip={onClip} />);

    await userEvent.setup().upload(screen.getByLabelText("Audio file"), audio(3 * MB));

    expect(screen.getByRole("alert")).toHaveTextContent("That file is larger than 2 MB.");
    expect(onClip).not.toHaveBeenCalled();
  });

  it("accepts a file dropped on the zone", () => {
    const onClip = vi.fn();
    render(<RecorderPanel config={DEFAULT_CONFIG} onClip={onClip} />);
    const file = audio(100);

    fireEvent.drop(screen.getByText(/Drop an audio file here/).closest("div")!, { dataTransfer: { files: [file] } });

    expect(onClip).toHaveBeenCalledWith(file);
  });

  it("ignores a dropped file while it is disabled", () => {
    const onClip = vi.fn();
    render(<RecorderPanel config={DEFAULT_CONFIG} disabled onClip={onClip} />);

    fireEvent.drop(screen.getByText(/Drop an audio file here/).closest("div")!, { dataTransfer: { files: [audio(100)] } });

    expect(onClip).not.toHaveBeenCalled();
  });

  it("explains a blocked microphone and keeps the upload available", async () => {
    stubMicrophone(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    render(<RecorderPanel config={DEFAULT_CONFIG} onClip={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Start recording" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Microphone access was blocked/);
    expect(screen.getByLabelText("Audio file")).toBeInTheDocument();
  });

  it("explains a microphone that could not start", async () => {
    stubMicrophone(() => Promise.reject(new DOMException("none", "NotFoundError")));
    render(<RecorderPanel config={DEFAULT_CONFIG} onClip={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Start recording" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not start/);
  });

  it("says when the browser cannot record at all", async () => {
    render(<RecorderPanel config={DEFAULT_CONFIG} onClip={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Start recording" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot record audio/);
  });

  it("records, then hands over a file named as a recording when stopped", async () => {
    stubMicrophone(() => Promise.resolve({ getTracks: () => [] }));
    const onClip = vi.fn();
    render(<RecorderPanel config={DEFAULT_CONFIG} onClip={onClip} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await user.click(await screen.findByRole("button", { name: "Stop and identify" }));

    await waitFor(() => expect(onClip).toHaveBeenCalledOnce());
    const file = onClip.mock.calls[0][0] as File;
    expect(file.name).toMatch(/^recording-\d+\.webm$/);
    expect(file.type).toBe("audio/webm");
  });
});
