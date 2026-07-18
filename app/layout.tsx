import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Life OS",
  description: "Asisten AI untuk hari-harimu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 pb-24 pt-6 sm:px-6">
          <header className="mb-6 flex items-center justify-between">
            <span className="text-lg font-semibold tracking-tight">AI Life OS</span>
            <nav className="flex gap-4 text-sm text-neutral-500">
              <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
                Dashboard
              </Link>
              <Link href="/activities" className="hover:text-neutral-900 dark:hover:text-white">
                Timeline
              </Link>
              <Link href="/habits" className="hover:text-neutral-900 dark:hover:text-white">
                Habit
              </Link>
              <Link href="/finance" className="hover:text-neutral-900 dark:hover:text-white">
                Finance
              </Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
