import { formatScore } from "@/lib/format";
import type { IdentifyStatus } from "@/lib/types";

const percent = (value: number) => `${Number((Math.min(1, Math.max(0, value)) * 100).toFixed(2))}%`;

interface Props {
  score: number;
  threshold: number;
  status: IdentifyStatus;
}

/** The score drawn against the decision threshold. The caption repeats it in words. */
export function ScoreMeter({ score, threshold, status }: Props) {
  const above = score >= threshold;
  return (
    <div className="group grid gap-3" data-status={status}>
      <div
        className="relative h-1.5 rounded-full bg-white/10"
        role="meter"
        aria-label="Similarity score"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={score}
        aria-valuetext={`${formatScore(score)} against a threshold of ${formatScore(threshold)}`}
      >
        <div
          data-part="fill"
          className="h-full rounded-full bg-ink-3 transition-[width] duration-700 ease-out-expo group-data-[status=match]:bg-ink group-data-[status=uncertain]:bg-uncertain"
          style={{ width: percent(score) }}
        />
        <div
          data-part="threshold"
          className="absolute -top-2 -bottom-2 w-0 -translate-x-px border-l border-dashed border-ink-2"
          style={{ left: percent(threshold) }}
        />
      </div>
      <div aria-hidden="true" className="relative flex h-4 justify-between font-mono text-xs text-ink-3">
        <span>0</span>
        <span className="absolute -translate-x-1/2" style={{ left: percent(threshold) }}>
          {formatScore(threshold)}
        </span>
        <span>1</span>
      </div>
      <p className="text-[0.9375rem] text-ink-2">
        <span className="font-mono tabular-nums text-ink">{formatScore(score)}</span>{" "}
        {above ? "is above the threshold" : "is below the threshold"} of{" "}
        <span className="font-mono tabular-nums">{formatScore(threshold)}</span>
      </p>
    </div>
  );
}
