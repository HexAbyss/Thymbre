import type { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  /** Optional action aligned to the right of the title. */
  action?: ReactNode;
  centered?: boolean;
}

export function PageHeader({ title, description, action, centered = false }: Props) {
  return (
    <header
      className={`flex flex-wrap gap-6 ${centered ? "flex-col items-center text-center" : "items-end justify-between"}`}
    >
      <div className={`grid gap-3 ${centered ? "justify-items-center" : ""}`}>
        <h1 className="text-[2.5rem] leading-[1.1] font-medium tracking-[-0.03em] max-md:text-[2rem]">{title}</h1>
        <p className="max-w-[56ch] text-[1.0625rem] text-ink-2">{description}</p>
      </div>
      {action}
    </header>
  );
}
