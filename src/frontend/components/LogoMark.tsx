import { AudioLines } from "lucide-react";

/** The Thymbre mark: audio bars on a rounded square. `app/icon.svg` is the same drawing for the favicon. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-[9px] bg-ink text-bg"
      style={{ width: size, height: size }}
    >
      <AudioLines size={Math.round(size * 0.53)} />
    </span>
  );
}
