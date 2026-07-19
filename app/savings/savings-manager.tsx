"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Saving = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  monthly_target: number | null;
  deadline: string | null;
  status: string;
};

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function monthsUntil(deadline: string): number {
  const now = new Date();
  const d = new Date(deadline + "T00:00:00");
  const months =
    (d.getFullYear() - now.getFullYear()) * 12 +
    (d.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export function SavingsManager({
  userId,
  savings,
}: {
  userId: string;
  savings: Saving[];
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [monthly, setMonthly] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contrib, setContrib] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !target) return;
    setBusy(true);
    const { error } = await supabase.from("savings_goals").insert({
      user_id: userId,
      name: name.trim(),
      target_amount: Number(target),
      saved_amount: 0,
      monthly_target: monthly ? Number(monthly) : null,
      deadline: deadline || null,
      status: "active",
    });
    setBusy(false);
    if (error) return alert("Gagal: " + error.message);
    setName("");
    setTarget("");
    setMonthly("");
    setDeadline("");
    router.refresh();
  }

  async function deposit(g: Saving) {
    const amt = Number(contrib[g.id]);
    if (!amt) return;
    const newSaved = Math.max(0, Number(g.saved_amount) + amt);
    const status = newSaved >= Number(g.target_amount) ? "done" : "active";
    const { error } = await supabase
      .from("savings_goals")
      .update({ saved_amount: newSaved, status })
      .eq("id", g.id);
    if (error) return alert("Gagal: " + error.message);
    setContrib((p) => ({ ...p, [g.id]: "" }));
    router.refresh();
  }

  async function editTarget(g: Saving) {
    const v = prompt(`Ubah target "${g.name}":`, String(g.target_amount));
    if (v === null) return;
    await supabase
      .from("savings_goals")
      .update({ target_amount: Number(v) })
      .eq("id", g.id);
    router.refresh();
  }

  async function remove(g: Saving) {
    if (!confirm(`Hapus tabungan "${g.name}"?`)) return;
    await supabase.from("savings_goals").delete().eq("id", g.id);
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <>
      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Tambah Tabungan
        </h2>
        <form onSubmit={addGoal} className="space-y-2">
          <input
            placeholder="Nama (mis. Dana darurat, Laptop)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full ${inputCls}`}
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              placeholder="Target (Rp)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={`flex-1 ${inputCls}`}
            />
            <input
              type="number"
              placeholder="Target/bulan (opsional)"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              className={`flex-1 ${inputCls}`}
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              Tambah
            </button>
          </div>
        </form>
      </section>

      {savings.map((g) => {
        const saved = Number(g.saved_amount);
        const target = Number(g.target_amount);
        const pct = Math.min(100, Math.round((saved / (target || 1)) * 100));
        const left = Math.max(0, target - saved);
        const done = g.status === "done";
        const suggested =
          g.deadline && left > 0
            ? Math.ceil(left / monthsUntil(g.deadline))
            : null;

        return (
          <section key={g.id} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div
                  className={`font-medium ${done ? "text-emerald-600" : ""}`}
                >
                  {g.name} {done && "✓"}
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">
                  {idr(saved)} / {idr(target)} · sisa {idr(left)}
                  {g.deadline ? ` · target ${g.deadline}` : ""}
                </div>
              </div>
              <div className="flex gap-3 text-xs text-neutral-400">
                <button
                  onClick={() => editTarget(g)}
                  className="hover:text-neutral-900 dark:hover:text-white"
                >
                  edit
                </button>
                <button
                  onClick={() => remove(g)}
                  className="hover:text-red-500"
                >
                  hapus
                </button>
              </div>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-neutral-900 dark:bg-white"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-neutral-400">
              <span>{pct}%</span>
              {suggested && <span>Saran nabung: {idr(suggested)}/bulan</span>}
            </div>

            {!done && (
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  placeholder="Setor (Rp)"
                  value={contrib[g.id] ?? ""}
                  onChange={(e) =>
                    setContrib((p) => ({ ...p, [g.id]: e.target.value }))
                  }
                  className={`w-40 ${inputCls}`}
                />
                <button
                  onClick={() => deposit(g)}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white"
                >
                  + Setor
                </button>
                {g.monthly_target && (
                  <button
                    onClick={() => {
                      setContrib((p) => ({
                        ...p,
                        [g.id]: String(g.monthly_target),
                      }));
                    }}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-white/10"
                  >
                    Isi {idr(Number(g.monthly_target))}
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}

      {savings.length === 0 && (
        <p className="glass-card p-6 text-sm text-neutral-400">
          Belum ada tabungan. Tambahkan di atas.
        </p>
      )}
    </>
  );
}
