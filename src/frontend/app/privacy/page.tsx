import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Privacy" };

const SECTIONS = [
  {
    title: "What is kept",
    text: "Recordings are analyzed and discarded. Thymbre keeps a numeric voiceprint for each enrolled voice, never the audio itself.",
  },
  {
    title: "Voices it does not recognize",
    text: "When a clip matches nobody, its voiceprint is held for a few minutes so you can enroll it. If you do nothing, it expires and is deleted.",
  },
  {
    title: "Consent",
    text: "Enroll only people who agreed to it. The enroll form asks you to confirm this before it lets you continue.",
  },
  {
    title: "Deleting a voice",
    text: "Any enrolled voice can be deleted from the Speakers page. Deleting removes the voice and all of its samples.",
  },
  {
    title: "This session",
    text: "The list of clips on the Identify page lives only in your browser tab and disappears when you close it.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="grid gap-12">
      <PageHeader centered title="Privacy" description="A voice identifies a person, so Thymbre keeps as little of it as possible." />

      <dl className="card m-0 grid divide-y divide-line">
        {SECTIONS.map(({ title, text }) => (
          <div key={title} className="grid gap-2 px-8 py-6 md:grid-cols-[220px_1fr] md:gap-8 max-md:px-5">
            <dt className="font-medium">{title}</dt>
            <dd className="m-0 max-w-[62ch] text-ink-2">{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
