"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const router = useRouter();

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-2 py-1 text-xs outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  function apply() {
    if (!f || !t) return;
    const a = f <= t ? f : t;
    const b = f <= t ? t : f;
    router.push(`/reports?from=${a}&to=${b}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={f}
        onChange={(e) => setF(e.target.value)}
        className={inputCls}
      />
      <span className="text-xs text-neutral-400">—</span>
      <input
        type="date"
        value={t}
        onChange={(e) => setT(e.target.value)}
        className={inputCls}
      />
      <button
        onClick={apply}
        className="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-neutral-900"
      >
        Terapkan
      </button>
    </div>
  );
}
