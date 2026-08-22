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
  themeColor: "#4F78FF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/activities", label: "Timeline" },
  { href: "/goals", label: "Goals" },
  { href: "/reports", label: "Reports" },
  { href: "/budget", label: "Budget" },
  { href: "/finance", label: "Finance" },
  { href: "/no-spend", label: "No Spend" },
  { href: "/savings", label: "Tabungan" },
  { href: "/creator", label: "Creator" },
  { href: "/books", label: "Buku" },
  { href: "/documents", label: "Dokumen" },
];

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
    <html lang="id" suppressHydrationWarning>
      <body>
        <NextTopLoader
          color="#4F78FF"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #4F78FF,0 0 5px #7C5CFC"
        />
        <SwRegister />

        {/* Desktop sidebar (md+) */}
        {user && (
          <aside
            className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r md:flex"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            {/* Logo */}
            <div className="flex h-16 items-center gap-2.5 px-5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg,#4F78FF,#7C5CFC)",
                }}
              >
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                AI Life OS
              </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 pt-2">
              {NAV_ITEMS.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: "var(--text-2)" }}
                >
                  {it.label}
                </Link>
              ))}
            </nav>

            {/* Logout */}
            <div
              className="border-t p-3"
              style={{ borderColor: "var(--border)" }}
            >
              <LogoutButton />
            </div>
          </aside>
        )}

        {/* Main content */}
        <div className={user ? "md:pl-56" : ""}>
          {/* Top bar mobile */}
          {user && (
            <header
              className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 md:hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{
                    background: "linear-gradient(135deg,#4F78FF,#7C5CFC)",
                  }}
                >
                  <span className="text-xs font-bold text-white">A</span>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  AI Life OS
                </span>
              </div>
              <MobileNav />
            </header>
          )}

          {/* Page content */}
          <main
            className="mx-auto max-w-4xl px-4 py-6 sm:px-6"
            style={{ minHeight: "calc(100vh - 56px)" }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
