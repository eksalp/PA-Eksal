import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { MobileNav } from "./mobile-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Life OS",
  description: "Asisten AI untuk hari-harimu",
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
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 pb-24 pt-6 sm:px-6">
          <header className="mb-6 flex items-center justify-between gap-4">
            <span className="shrink-0 text-lg font-semibold tracking-tight">
              AI Life OS
            </span>
            {/* Nav atas: hanya tampil di desktop. Di HP pakai bottom bar. */}
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
                  href="/habits"
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  Habit
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
