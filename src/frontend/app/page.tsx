"use client";

import { LoaderCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { useConfig } from "@/components/ConfigProvider";
import { PageHeader } from "@/components/PageHeader";
import { Panel, PanelTitle } from "@/components/Panel";
import { RecorderPanel } from "@/components/RecorderPanel";
import { StatusPill } from "@/components/StatusPill";
import { Verdict } from "@/components/Verdict";
import { api } from "@/lib/api";
import { formatClock, formatScore } from "@/lib/format";
import { friendlyError } from "@/lib/messages";
import type { IdentifyResult } from "@/lib/types";

interface Attempt {
  id: number;
  at: Date;
  source: string;
  result?: IdentifyResult;
  error?: string;
  enrolledAs?: string;
}

export default function IdentifyPage() {
  const config = useConfig();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const counter = useRef(0);

  const identify = useCallback(
    async (file: File) => {
      const id = ++counter.current;
      const base: Attempt = { id, at: new Date(), source: file.name.startsWith("recording-") ? "Microphone" : file.name };
      setBusy(true);
      setSelectedId(id);
      try {
        const result = await api.identify(file);
        setAttempts((current) => [{ ...base, result }, ...current]);
      } catch (failure) {
        setAttempts((current) => [{ ...base, error: friendlyError(failure, config) }, ...current]);
      } finally {
        setBusy(false);
      }
    },
    [config],
  );

  const selected = attempts.find((attempt) => attempt.id === selectedId);

  return (
    <div className="grid gap-12">
      <PageHeader
        centered
        title="Who is speaking?"
        description="Record a clip or upload audio, and Thymbre compares it with the voices you enrolled."
      />

      <div className="grid gap-6">
        <Panel aria-label="New clip">
          <RecorderPanel config={config} disabled={busy} onClip={identify} recordLabel="Start recording" />
          {busy ? (
            <p className="notice mt-5" role="status">
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Analyzing the voice
            </p>
          ) : null}
        </Panel>

        {selected?.error ? (
          <p className="notice notice-error" role="alert">
            {selected.error}
          </p>
        ) : null}

        {selected?.result ? (
          <Panel>
            <Verdict
              key={selected.id}
              result={selected.result}
              config={config}
              enrolledAs={selected.enrolledAs}
              onEnrolled={(name) =>
                setAttempts((current) =>
                  current.map((attempt) => (attempt.id === selected.id ? { ...attempt, enrolledAs: name } : attempt)),
                )
              }
            />
          </Panel>
        ) : null}
      </div>

      <section aria-labelledby="history-title">
        <PanelTitle id="history-title">This session</PanelTitle>
        {attempts.length === 0 ? (
          <p className="text-ink-3">Clips you identify appear here until you close the tab.</p>
        ) : (
          <ul className="card m-0 grid list-none divide-y divide-line p-0">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <button
                  type="button"
                  aria-current={attempt.id === selectedId ? "true" : undefined}
                  onClick={() => setSelectedId(attempt.id)}
                  className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 bg-transparent px-5 py-4 text-left transition-colors duration-200 ease-out-expo first:rounded-t-[20px] last:rounded-b-[20px] hover:bg-white/[0.03] aria-[current=true]:bg-white/[0.05]"
                >
                  <Avatar name={attempt.result?.speaker?.name ?? "?"} />
                  <span className="grid min-w-0">
                    <span className="truncate font-medium">
                      {attempt.result?.speaker?.name ?? (attempt.result ? "Unknown voice" : "Could not read clip")}
                    </span>
                    <span className="truncate font-mono text-xs text-ink-3">
                      {formatClock(attempt.at)} · {attempt.source}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    {attempt.result ? <StatusPill status={attempt.result.status} /> : null}
                    {attempt.result ? (
                      <span className="w-10 text-right font-mono text-[0.8125rem] text-ink-2">
                        {formatScore(attempt.result.score)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
