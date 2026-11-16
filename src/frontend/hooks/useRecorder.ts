"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "denied" | "unsupported" | "failed";

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMimeType(): string | undefined {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

interface Options {
  maxSeconds: number;
  onRecorded: (file: File, seconds: number) => void;
}

/** Records from the microphone and exposes an analyser node for the live timeline. */
export function useRecorder({ maxSeconds, onRecorded }: Options) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const callback = useRef(onRecorded);

  useEffect(() => {
    callback.current = onRecorded;
  }, [onRecorded]);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void audioContext.current?.close();
    audioContext.current = null;
    setAnalyser(null);
  }, []);

  useEffect(() => release, [release]);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("unsupported");
      return;
    }
    setState("requesting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setState(denied ? "denied" : "failed");
      return;
    }

    const mimeType = pickMimeType();
    const media = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    media.onstop = () => {
      const type = media.mimeType || mimeType || "audio/webm";
      const elapsed = (Date.now() - startedAt.current) / 1000;
      release();
      setState("idle");
      setSeconds(0);
      const file = new File(chunks, `recording-${Date.now()}.${extensionFor(type)}`, { type });
      callback.current(file, elapsed);
    };

    const context = new AudioContext();
    const node = context.createAnalyser();
    node.fftSize = 1024;
    context.createMediaStreamSource(stream.current).connect(node);
    audioContext.current = context;
    setAnalyser(node);

    recorder.current = media;
    startedAt.current = Date.now();
    setSeconds(0);
    media.start();
    setState("recording");
    timer.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) stop();
    }, 100);
  }, [maxSeconds, release, stop]);

  return { state, seconds, analyser, start, stop };
}
