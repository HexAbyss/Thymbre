"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/api";
import { formatScore } from "@/lib/format";
import { friendlyError } from "@/lib/messages";
import type { AppConfig, IdentifyResult } from "@/lib/types";

import { Avatar } from "./Avatar";
import { EnrollNameForm } from "./EnrollNameForm";
import { ScoreMeter } from "./ScoreMeter";
import { StatusPill } from "./StatusPill";

interface Props {
  result: IdentifyResult;
  config: AppConfig;
  enrolledAs?: string;
  onEnrolled: (name: string) => void;
}

const HEADLINES = {
  match: (name: string | undefined) => name ?? "Known voice",
  uncertain: () => "Not sure who this is",
  unknown: () => "Unknown voice",
} as const;

const HINT = "max-w-[62ch] text-[0.9375rem] text-ink-2";

export function Verdict({ result, config, enrolledAs, onEnrolled }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status, speaker, score, clip_id: clipId } = result;
  const ttlMinutes = Math.round(config.pending_clip_ttl_seconds / 60);

  async function enroll(name: string) {
    if (!clipId) return;
    setBusy(true);
    setError(null);
    try {
      await api.enrollFromClip(clipId, name);
      onEnrolled(name);
    } catch (failure) {
      setError(friendlyError(failure, config));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-7" aria-labelledby="verdict-title" data-status={status}>
      <div className="flex items-center gap-4">
        <Avatar name={speaker?.name ?? "?"} size={52} />
        <div className="grid justify-items-start gap-2">
          <h2 id="verdict-title" className="text-2xl font-medium">
            {HEADLINES[status](speaker?.name)}
          </h2>
          <StatusPill status={status} />
        </div>
      </div>

      {score !== null ? (
        <ScoreMeter score={score} threshold={config.identify_threshold} status={status} />
      ) : (
        <p className={HINT}>Nobody is enrolled yet, so there is nothing to compare with.</p>
      )}

      {status === "uncertain" && speaker ? (
        <p className={HINT}>
          The closest voice is {speaker.name} at <span className="font-mono tabular-nums">{formatScore(score)}</span>, but
          another enrolled voice scored within {config.identify_margin.toFixed(2)} of it. Record a longer clip to be
          sure.
        </p>
      ) : null}

      {status === "unknown" && clipId && !enrolledAs ? (
        <div className="grid gap-4 border-t border-line pt-7">
          <div className="grid gap-1.5">
            <h3 className="text-lg font-medium">Enroll this voice?</h3>
            <p className={HINT}>The sample is kept for {ttlMinutes} minutes so you can name it. No recording is stored.</p>
          </div>
          <EnrollNameForm submitLabel="Enroll this voice" onSubmit={enroll} busy={busy} error={error} />
        </div>
      ) : null}

      {enrolledAs ? (
        <p className="notice notice-ok" role="status">
          <span>
            Enrolled as {enrolledAs}. Record again to see the match, or{" "}
            <Link href="/speakers" className="link">
              open Speakers
            </Link>
            .
          </span>
        </p>
      ) : null}
    </section>
  );
}
