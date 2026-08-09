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
    <div className="md:hidden">
      {/* Tombol burger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className="fixed right-4 top-5 z-50 flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-lg border border-neutral-200 bg-white/85 backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/85"
      >
        <span
          className={`block h-0.5 w-5 bg-neutral-800 transition dark:bg-white ${open ? "translate-y-[7px] rotate-45" : ""}`}
        />
        <span
          className={`block h-0.5 w-5 bg-neutral-800 transition dark:bg-white ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-5 bg-neutral-800 transition dark:bg-white ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </button>

      {/* Overlay + drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        >
          <nav
            className="absolute right-0 top-0 flex h-full w-60 flex-col gap-1 border-l border-neutral-200 bg-white p-6 pt-20 dark:border-white/10 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            {ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  isActive(it.href)
                    ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-white/10 dark:text-white"
                    : "text-neutral-500"
                }`}
              >
                {it.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="mt-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-500"
            >
              Keluar
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
