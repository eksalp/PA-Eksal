"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NewActivityForm({
  userId,
  scheduledDate,
}: {
  userId: string;
  scheduledDate: string;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    await supabase.from("activities").insert({
      user_id: userId,
      title: title.trim(),
      scheduled_date: scheduledDate,
      scheduled_time: time || null,
      status: "scheduled",
      source: "manual",
    });
    setTitle("");
    setTime("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex gap-2 p-4">
      <input
        type="text"
        placeholder="Nama aktivitas..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/5"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        Tambah
      </button>
    </form>
  );
}
