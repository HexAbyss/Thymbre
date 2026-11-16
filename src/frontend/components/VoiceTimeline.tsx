"use client";

import { useEffect, useRef } from "react";

const BARS = 96;

/** One audio lane: the live level of the microphone while recording, a flat baseline otherwise. */
export function VoiceTimeline({ analyser, label }: { analyser: AnalyserNode | null; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = element.clientWidth;
    const height = element.clientHeight;
    element.width = width * ratio;
    element.height = height * ratio;
    context.scale(ratio, ratio);

    const levels: number[] = new Array(BARS).fill(0);
    const gap = 3;
    const barWidth = Math.max(2, width / BARS - gap);
    const samples = new Uint8Array(analyser?.fftSize ?? 1024);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      levels.forEach((level, index) => {
        const barHeight = Math.max(2, level * height);
        context.fillStyle = level > 0.02 ? "#e4e4e7" : "rgba(255,255,255,0.14)";
        context.beginPath();
        context.roundRect(index * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight, 2);
        context.fill();
      });
    };

    const tick = () => {
      if (analyser) {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
        levels.push(Math.min(1, Math.sqrt(sum / samples.length) * 3));
        levels.shift();
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    if (analyser && !reduceMotion) frame = requestAnimationFrame(tick);
    else draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser]);

  return (
    <div className="flex h-24 items-center gap-4 rounded-2xl border border-line bg-bg px-5">
      <span className="w-8 flex-none text-[0.8125rem] text-ink-3">{label}</span>
      <canvas ref={canvas} className="h-14 min-w-0 flex-1" aria-hidden="true" />
    </div>
  );
}
