"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

interface Props {
  submitLabel: string;
  onSubmit: (name: string) => void;
  busy?: boolean;
  /** Extra readiness from the parent, such as having at least one sample. */
  ready?: boolean;
  error?: string | null;
  children?: ReactNode;
}

/** Name and the consent confirmation. Enrolling a voice is not possible without both. */
export function EnrollNameForm({ submitLabel, onSubmit, busy = false, ready = true, error, children }: Props) {
  const nameId = useId();
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && consent && ready && !busy;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) onSubmit(trimmed);
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="grid gap-2">
        <label htmlFor={nameId} className="text-sm font-medium text-ink-2">
          Name
        </label>
        <input
          id={nameId}
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          autoComplete="off"
          placeholder="Who is this?"
        />
      </div>
      {children}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-bg px-4 py-3.5 text-ink-2">
        <input
          type="checkbox"
          className="mt-0.5 size-[18px] flex-none accent-white"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>The owner of this voice agreed to be enrolled.</span>
      </label>
      {error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={!canSubmit} aria-busy={busy}>
        {submitLabel}
      </button>
    </form>
  );
}
