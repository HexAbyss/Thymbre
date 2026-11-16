import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { ConfigProvider } from "@/components/ConfigProvider";
import { ServerBanner } from "@/components/ServerBanner";
import { TopNav } from "@/components/TopNav";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Thymbre", template: "%s · Thymbre" },
  description: "Voice biometrics: enroll a voice, then identify who is speaking.",
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#09090B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70rem_32rem_at_50%_-14%,rgb(110_114_230/0.17),transparent_70%)]"
        />
        <ConfigProvider>
          <TopNav />
          <ServerBanner />
          <main id="main" className="mx-auto w-full max-w-[960px] px-5 pt-12 pb-24 md:pt-16">
            {children}
          </main>
        </ConfigProvider>
      </body>
    </html>
  );
}
