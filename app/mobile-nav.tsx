"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Burger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-xl"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className={`block h-0.5 w-4.5 rounded transition-all ${open ? "translate-y-[7px] rotate-45" : ""}`}
          style={{ background: "var(--text-2)" }}
        />
        <span
          className={`block h-0.5 w-4.5 rounded transition-all ${open ? "opacity-0" : ""}`}
          style={{ background: "var(--text-2)" }}
        />
        <span
          className={`block h-0.5 w-4.5 rounded transition-all ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
          style={{ background: "var(--text-2)" }}
        />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: "rgba(0,0,0,.4)" }}
          onClick={() => setOpen(false)}
        >
          {/* Drawer */}
          <nav
            className="flex h-full w-64 flex-col overflow-y-auto px-3 py-6 shadow-xl"
            style={{
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo */}
            <div className="mb-4 flex items-center gap-2.5 px-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg,#4F78FF,#7C5CFC)",
                }}
              >
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                AI Life OS
              </span>
            </div>

            <div className="space-y-0.5">
              {ITEMS.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                  style={
                    isActive(it.href)
                      ? {
                          background: "rgba(79,120,255,.1)",
                          color: "#4F78FF",
                        }
                      : {
                          color: "var(--text-2)",
                        }
                  }
                >
                  {it.label}
                </Link>
              ))}
            </div>

            <div
              className="mt-auto pt-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={logout}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
                style={{ color: "var(--text-3)" }}
              >
                Keluar
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
