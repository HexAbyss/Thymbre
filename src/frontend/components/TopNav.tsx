"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoMark } from "./LogoMark";

const NAV = [
  { href: "/", label: "Identify" },
  { href: "/speakers", label: "Speakers" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="mx-auto flex w-full max-w-[960px] items-center justify-between gap-4 px-5 pt-6 md:pt-8">
      <Link href="/" aria-label="Thymbre home" className="flex items-center gap-2.5 no-underline">
        <LogoMark />
        <span className="text-[1.0625rem] font-medium tracking-tight max-[430px]:hidden">Thymbre</span>
      </Link>

      <nav aria-label="Main">
        <ul className="m-0 flex list-none gap-1 rounded-full border border-line bg-surface p-1">
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="block rounded-full px-3.5 py-2 text-sm text-ink-2 no-underline transition-colors duration-200 ease-out-expo hover:text-ink aria-[current=page]:bg-white/10 aria-[current=page]:text-ink"
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
