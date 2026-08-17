import type { Metadata, Viewport } from "next";
import Link from "next/link";
import NextTopLoader from "nextjs-toploader";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { MobileNav } from "./mobile-nav";
import { SwRegister } from "./sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Life OS",
  description: "Asisten AI untuk hari-harimu",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Life OS" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0E0E13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="id">
      <body>
        <NextTopLoader
          color="#8B7CFF"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #8B7CFF"
        />
        <SwRegister />
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 pb-10 pt-6 sm:px-6">
          <header className="mb-6 flex items-center justify-between gap-4">
            <span className="shrink-0 text-lg font-semibold tracking-tight">
              AI Life OS
            </span>
            {user && (
              <nav className="hidden flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-neutral-500 md:flex">
                <Link
                  href="/"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/activities"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Timeline
                </Link>
                <Link
                  href="/goals"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Goals
                </Link>
                <Link
                  href="/reports"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Reports
                </Link>
                <Link
                  href="/budget"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Budget
                </Link>
                <Link
                  href="/finance"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Finance
                </Link>
                <Link
                  href="/no-spend"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  No Spend
                </Link>
                <Link
                  href="/savings"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Tabungan
                </Link>
                <Link
                  href="/creator"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Creator
                </Link>
                <Link
                  href="/books"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Buku
                </Link>
                <LogoutButton />
              </nav>
            )}
          </header>
          <main className="flex-1">{children}</main>
        </div>
        {user && <MobileNav />}
      </body>
    </html>
  );
}
