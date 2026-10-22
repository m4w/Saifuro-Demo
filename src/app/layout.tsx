import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { LogoMark } from "@/components/ui/icons";
import { DemoControls } from "@/features/shell/demo-controls";
import { MainNav } from "@/features/shell/main-nav";
import { RouteFocus } from "@/features/shell/route-focus";
import { ScenarioBanner } from "@/features/shell/scenario-banner";
import { themeScript } from "@/features/shell/theme";
import { ThemeSwitcher } from "@/features/shell/theme-switcher";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · Agent Payments Console",
    default: "Agent Payments Console",
  },
  description:
    "Unofficial demo: review payments that AI agents want to make, see why the mandate flagged them, and follow them onchain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-theme before React loads, hence suppressHydrationWarning.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
          >
            Skip to main content
          </a>
          <div className="flex min-h-dvh flex-col lg:flex-row">
            <aside className="flex flex-col border-b border-border bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
              <div className="flex items-center gap-2 px-5 py-4">
                <LogoMark size={22} className="text-accent" />
                <span className="font-semibold tracking-tight">
                  Agent Payments Console
                </span>
              </div>
              <Suspense fallback={<div className="h-10 px-3" />}>
                <MainNav />
                <RouteFocus />
              </Suspense>
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:mt-auto lg:grid-cols-1">
                <div className="hidden text-sm lg:block">
                  <p className="text-text-muted">Signed in as</p>
                  <p className="font-medium">Jordan Lee · Finance</p>
                </div>
                <ThemeSwitcher />
                <div className="self-end">
                  <DemoControls />
                </div>
                <p className="text-xs text-text-muted sm:col-span-2 lg:col-span-1">
                  Unofficial demo with mock data. Paid-out payments are read
                  live from the Base Sepolia test network.
                </p>
              </div>
            </aside>
            <main
              id="main"
              tabIndex={-1}
              className="min-w-0 flex-1 focus:outline-none"
            >
              <ScenarioBanner />
              <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
