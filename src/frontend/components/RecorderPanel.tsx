"use client";

import { Mic, Square, Upload } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";

import { useRecorder } from "@/hooks/useRecorder";
import { formatDuration } from "@/lib/format";
import type { AppConfig } from "@/lib/types";

import { VoiceTimeline } from "./VoiceTimeline";

interface Props {
  config: AppConfig;
  disabled?: boolean;
  /** Called with a recording or an uploaded file. */
  onClip: (file: File) => void;
  recordLabel?: string;
}

const RECORDER_MESSAGES = {
  denied: "Microphone access was blocked. Allow it in the browser's site settings, or upload a file instead.",
  unsupported: "This browser cannot record audio. Upload a file instead.",
  failed: "The microphone could not start. Check that it is connected, or upload a file instead.",
} as const;

export function RecorderPanel({ config, disabled = false, onClip, recordLabel = "Start recording" }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const accept = useCallback(
    (file: File) => {
      if (file.size > config.max_upload_bytes) {
        setFileError(`That file is larger than ${Math.round(config.max_upload_bytes / 1048576)} MB.`);
        return;
      }
      setFileError(null);
      onClip(file);
    },
    [config.max_upload_bytes, onClip],
  );

  const { state, seconds, analyser, start, stop } = useRecorder({
    maxSeconds: config.max_audio_seconds,
    onRecorded: accept,
  });
  const recording = state === "recording";
  const problem = state in RECORDER_MESSAGES ? RECORDER_MESSAGES[state as keyof typeof RECORDER_MESSAGES] : null;

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) accept(file);
  }

  return (
    <div className="grid gap-5">
      <VoiceTimeline analyser={analyser} label="You" />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className={`btn ${recording ? "btn-recording" : "btn-primary"}`}
          onClick={recording ? stop : start}
          disabled={disabled || state === "requesting"}
        >
          {recording ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          {recording ? "Stop and identify" : recordLabel}
        </button>
        <span className="font-mono text-lg tabular-nums text-ink-3" aria-live="off">
          {formatDuration(seconds)}
        </span>
        <span className="sr-only" role="status" aria-live="polite">
          {recording ? "Recording" : state === "requesting" ? "Waiting for microphone permission" : ""}
        </span>
      </div>

      <p className="text-[0.9375rem] text-ink-3">
        Speak for at least {config.min_speech_seconds} s, up to {config.max_audio_seconds} s.
      </p>

      <div
        data-active={dragging}
        className="flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-line-2 px-4 py-4 text-ink-2 transition-colors duration-200 ease-out-expo data-[active=true]:border-accent data-[active=true]:bg-white/[0.03]"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload size={18} aria-hidden="true" />
        <span>
          Drop an audio file here or{" "}
          <button type="button" className="link" disabled={disabled} onClick={() => fileInput.current?.click()}>
            browse
          </button>
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.ogg,.opus,.m4a"
          className="sr-only"
          tabIndex={-1}
          aria-label="Audio file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) accept(file);
            event.target.value = "";
          }}
        />
      </div>

      {problem || fileError ? (
        <p className="notice notice-error" role="alert">
          {problem ?? fileError}
        </p>
      ) : null}
    </div>
  );
}
