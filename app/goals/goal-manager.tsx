"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  current_value: number;
  target_value: number;
  unit: string | null;
  status: string;
};

const idr = (n: number) => Number(n).toLocaleString("id-ID");

export function GoalManager({
  userId,
  initialGoals,
}: {
  userId: string;
  initialGoals: Goal[];
}) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient() as any;

  const inputCls =
    "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all";
  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
  };

  function openNew() {
    setEditId(null);
    setTitle("");
    setDesc("");
    setTarget("");
    setCurrent("0");
    setUnit("");
    setShowForm(true);
  }
  function openEdit(g: Goal) {
    setEditId(g.id);
    setTitle(g.title);
    setDesc(g.description || "");
    setTarget(String(g.target_value));
    setCurrent(String(g.current_value));
    setUnit(g.unit || "");
    setShowForm(true);
  }
  function cancel() {
    setShowForm(false);
    setEditId(null);
  }

  async function save() {
    if (!title.trim() || !target) return alert("Isi judul & target dulu.");
    setBusy(true);
    const payload = {
      user_id: userId,
      title: title.trim(),
      description: desc.trim() || null,
      target_value: Number(target),
      current_value: Number(current) || 0,
      unit: unit.trim() || null,
      status: "active",
    };
    if (editId) {
      const { data: row } = await supabase
        .from("goals")
        .update(payload)
        .eq("id", editId)
        .select()
        .single();
      setGoals((g) => g.map((x) => (x.id === editId ? row : x)));
    } else {
      const { data: row } = await supabase
        .from("goals")
        .insert(payload)
        .select()
        .single();
      setGoals((g) => [row, ...g]);
    }
    setBusy(false);
    cancel();
  }

  async function updateProgress(id: string, val: number) {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    const np = Math.max(0, Math.min(g.target_value, val));
    const status = np >= g.target_value ? "done" : "active";
    setGoals((gs) =>
      gs.map((x) => (x.id === id ? { ...x, current_value: np, status } : x)),
    );
    await supabase
      .from("goals")
      .update({ current_value: np, status })
      .eq("id", id);
  }

  async function archive(id: string) {
    if (!confirm("Arsipkan goal ini?")) return;
    setGoals((g) => g.filter((x) => x.id !== id));
    await supabase.from("goals").update({ status: "archived" }).eq("id", id);
    router.refresh();
  }

  const active = goals.filter((g) => g.status !== "done");
  const done = goals.filter((g) => g.status === "done");

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={openNew}
          className="btn-primary w-full justify-center"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          + Tambah Goal
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>
            {editId ? "Edit Goal" : "Goal Baru"}
          </h2>
          <div className="space-y-2">
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="Judul goal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="Deskripsi (opsional)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="Target"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="Saat ini"
                type="number"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="Satuan"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="btn-primary flex-1 justify-center"
              style={{ display: "flex" }}
            >
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              onClick={cancel}
              className="btn-ghost flex-1 justify-center"
              style={{ display: "flex" }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((g) => {
            const pct = Math.min(
              100,
              Math.round((g.current_value / (g.target_value || 1)) * 100),
            );
            return (
              <div key={g.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="font-semibold"
                      style={{ color: "var(--text)" }}
                    >
                      {g.title}
                    </p>
                    {g.description && (
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--text-3)" }}
                      >
                        {g.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(g)}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{
                        background: "var(--surface-2)",
                        color: "var(--text-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => archive(g.id)}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{
                        background: "var(--surface-2)",
                        color: "var(--text-3)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      Arsip
                    </button>
                  </div>
                </div>
                <div>
                  <div
                    className="mb-1.5 flex justify-between text-xs"
                    style={{ color: "var(--text-3)" }}
                  >
                    <span>
                      {idr(g.current_value)} / {idr(g.target_value)} {g.unit}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--brand-from)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className={inputCls}
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="Update progress"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        await updateProgress(
                          g.id,
                          Number((e.target as HTMLInputElement).value),
                        );
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <span
                    className="text-xs shrink-0"
                    style={{ color: "var(--text-3)" }}
                  >
                    Enter ↵
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Done goals */}
      {done.length > 0 && (
        <div>
          <p className="section-label mb-3">Selesai 🎉</p>
          <div className="space-y-2">
            {done.map((g) => (
              <div
                key={g.id}
                className="card p-4 flex items-center gap-3"
                style={{ opacity: 0.75 }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{
                    background: "var(--green-bg)",
                    color: "var(--green)",
                  }}
                >
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {g.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    {idr(g.target_value)} {g.unit}
                  </p>
                </div>
                <button
                  onClick={() => archive(g.id)}
                  className="text-xs shrink-0"
                  style={{ color: "var(--text-3)" }}
                >
                  Arsip
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">🎯</p>
          <p className="font-semibold" style={{ color: "var(--text)" }}>
            Belum ada goal
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Tambahkan goal pertamamu di atas.
          </p>
        </div>
      )}
    </div>
  );
}
