import type { ComponentProps } from "react";

interface PanelProps extends ComponentProps<"section"> {
  /** Turn the padding off when the content brings its own, such as a table. */
  padded?: boolean;
}

/** A flat card. Pass `className` for layout. */
export function Panel({ className = "", padded = true, ...props }: PanelProps) {
  return <section className={`card ${padded ? "p-7 max-md:p-5" : ""} ${className}`} {...props} />;
}

export function PanelTitle({ className = "", ...props }: ComponentProps<"h2">) {
  return <h2 className={`mb-5 text-[0.9375rem] font-medium text-ink-2 ${className}`} {...props} />;
}
