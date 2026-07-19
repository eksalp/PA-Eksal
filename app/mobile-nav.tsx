"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/activities", label: "Timeline", icon: "🗓️" },
  { href: "/habits", label: "Habit", icon: "✅" },
  { href: "/goals", label: "Goals", icon: "🎯" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/budget", label: "Budget", icon: "🧮" },
  { href: "/finance", label: "Finance", icon: "🏦" },
  { href: "/no-spend", label: "Hemat", icon: "🟢" },
];

export function MobileNav() {
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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/85 backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/85 md:hidden">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-2">
        {ITEMS.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex min-w-[56px] shrink-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px] ${
                active ? "text-neutral-900 dark:text-white" : "text-neutral-400"
              }`}
            >
              <span className="text-base leading-none">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex min-w-[56px] shrink-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px] text-neutral-400"
        >
          <span className="text-base leading-none">🚪</span>
          <span>Keluar</span>
        </button>
      </div>
    </nav>
  );
}
