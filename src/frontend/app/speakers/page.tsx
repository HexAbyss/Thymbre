"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { useConfig } from "@/components/ConfigProvider";
import { Dialog } from "@/components/Dialog";
import { EnrollNameForm } from "@/components/EnrollNameForm";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { RecorderPanel } from "@/components/RecorderPanel";
import { api } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";
import { friendlyError } from "@/lib/messages";
import type { Speaker } from "@/lib/types";

const HINT = "max-w-[62ch] text-[0.9375rem] text-ink-2";
const TH = "px-3 py-4 text-left text-[0.8125rem] font-medium text-ink-3 first:pl-6 last:pr-6 md:px-5 md:first:pl-8 md:last:pr-8";
const TD = "px-3 py-4 first:pl-6 last:pr-6 md:px-5 md:first:pl-8 md:last:pr-8";

export default function SpeakersPage() {
  const config = useConfig();
  const [speakers, setSpeakers] = useState<Speaker[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [toDelete, setToDelete] = useState<Speaker | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    api
      .listSpeakers()
      .then((list) => {
        if (!active) return;
        setSpeakers(list);
        setLoadError(null);
      })
      .catch((failure) => {
        if (active) setLoadError(friendlyError(failure, config));
      });
    return () => {
      active = false;
    };
  }, [version, config]);

  const enrollButton = (
    <button type="button" className="btn btn-primary" onClick={() => setEnrolling(true)}>
      <Plus size={16} aria-hidden="true" />
      Enroll a voice
    </button>
  );

  return (
    <div className="grid gap-10">
      <PageHeader
        title="Speakers"
        description="Voices Thymbre can recognize. Only a numeric voiceprint is kept for each one."
        action={enrollButton}
      />

      {notice ? (
        <p className="notice notice-ok" role="status">
          {notice}
        </p>
      ) : null}
      {loadError ? (
        <p className="notice notice-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <Panel padded={false} aria-label="Enrolled voices">
        {speakers === null && !loadError ? <p className="p-8 text-ink-3">Loading voices</p> : null}
        {speakers?.length === 0 ? (
          <div className="grid justify-items-start gap-4 p-8">
            <h2 className="text-xl font-medium">No voices enrolled yet</h2>
            <p className="max-w-[52ch] text-ink-2">
              Enroll your own voice to start. You will need a few seconds of speech and the owner&apos;s consent.
            </p>
            {enrollButton}
          </div>
        ) : null}
        {speakers && speakers.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>
                  Speaker
                </th>
                <th scope="col" className={TH}>
                  Samples
                </th>
                <th scope="col" className={`${TH} max-md:hidden`}>
                  Enrolled
                </th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {speakers.map((speaker) => (
                <tr key={speaker.id} className="transition-colors duration-200 ease-out-expo hover:bg-white/[0.02]">
                  <td className={TD}>
                    <span className="inline-flex items-center gap-4 font-medium">
                      <Avatar name={speaker.name} />
                      {speaker.name}
                    </span>
                  </td>
                  <td className={`${TD} font-mono text-ink-2`}>{speaker.sample_count}</td>
                  <td className={`${TD} text-ink-3 max-md:hidden`}>{formatDate(speaker.created_at)}</td>
                  <td className={`${TD} text-right`}>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      aria-label={`Delete ${speaker.name}`}
                      onClick={() => setToDelete(speaker)}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>

      <Dialog open={enrolling} title="Enroll a voice" onClose={() => setEnrolling(false)}>
        <EnrollBody
          onDone={(name) => {
            setEnrolling(false);
            setNotice(`${name} was enrolled.`);
            reload();
          }}
        />
      </Dialog>

      <Dialog open={toDelete !== null} title="Delete this voice?" onClose={() => setToDelete(null)}>
        {toDelete ? (
          <DeleteConfirm
            speaker={toDelete}
            onCancel={() => setToDelete(null)}
            onDeleted={() => {
              setNotice(`${toDelete.name} was deleted.`);
              setToDelete(null);
              reload();
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function DeleteConfirm({ speaker, onCancel, onDeleted }: { speaker: Speaker; onCancel: () => void; onDeleted: () => void }) {
  const config = useConfig();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    try {
      await api.deleteSpeaker(speaker.id);
      onDeleted();
    } catch (failure) {
      setError(friendlyError(failure, config));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <p className="text-ink-2">
        This removes <strong className="font-medium text-ink">{speaker.name}</strong> and all {speaker.sample_count} voice
        samples. It cannot be undone.
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
          Delete voice
        </button>
      </div>
    </div>
  );
}

function EnrollBody({ onDone }: { onDone: (name: string) => void }) {
  const config = useConfig();
  const [samples, setSamples] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const full = samples.length >= config.max_samples_per_enrollment;

  function addSample(file: File) {
    const total = samples.reduce((sum, sample) => sum + sample.size, 0) + file.size;
    if (total > config.max_request_bytes) {
      setSampleError(
        `That sample would take this enrollment over ${Math.round(config.max_request_bytes / 1048576)} MB. Remove a sample or record a shorter one.`,
      );
      return;
    }
    setSampleError(null);
    setSamples((current) => [...current, file].slice(0, config.max_samples_per_enrollment));
  }

  async function submit(name: string) {
    setBusy(true);
    setError(null);
    try {
      await api.enroll(name, samples);
      onDone(name);
    } catch (failure) {
      setError(friendlyError(failure, config));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <p className={HINT}>
        Add 1 to {config.max_samples_per_enrollment} clips of the same person, each with at least{" "}
        {config.min_speech_seconds} s of speech. Two or three different sentences work best.
      </p>

      <RecorderPanel
        config={config}
        disabled={full || busy}
        recordLabel="Record a sample"
        onClip={addSample}
      />

      {sampleError ? (
        <p className="notice notice-error" role="alert">
          {sampleError}
        </p>
      ) : null}

      {samples.length > 0 ? (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Samples to enroll">
          {samples.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-xl border border-line bg-bg py-1.5 pr-1.5 pl-4"
            >
              <span>
                Sample {index + 1}
                <span className="font-mono text-ink-3"> · {formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove sample ${index + 1}`}
                onClick={() => setSamples((current) => current.filter((_, i) => i !== index))}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <EnrollNameForm submitLabel="Enroll voice" onSubmit={submit} busy={busy} ready={samples.length > 0} error={error} />
    </div>
  );
}
