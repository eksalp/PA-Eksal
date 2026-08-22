"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Doc = {
  id: string;
  title: string;
  category: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

const SUGGESTED_CATEGORIES = [
  "Identitas",
  "Legal",
  "Kerja",
  "Keuangan",
  "Pendidikan",
  "Kesehatan",
];

function fileIcon(name: string, mime: string | null) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mime?.includes("pdf") || ext === "pdf") return "📄";
  if (
    mime?.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "heic"].includes(ext)
  )
    return "🖼️";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["zip", "rar"].includes(ext)) return "🗜️";
  return "📁";
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  userId,
  initialDocuments,
}: {
  userId: string;
  initialDocuments: Doc[];
}) {
  const [docs, setDocs] = useState<Doc[]>(initialDocuments);
  const [initialLoading, setInitialLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const router = useRouter();
  const supabase = createClient() as any;

  // Baca ulang dari DB tiap halaman dibuka biar selalu fresh.
  useEffect(() => {
    (async () => {
      const { data: fresh } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setDocs(fresh ?? docs);
      setInitialLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert("Pilih file dulu.");
    if (!title.trim()) return alert("Isi nama dokumen dulu.");

    setBusy(true);
    setProgress("Mengunggah…");

    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) {
      setBusy(false);
      setProgress("");
      return alert("Gagal unggah: " + upErr.message);
    }

    setProgress("Menyimpan…");
    const { data: row, error: dbErr } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        title: title.trim(),
        category: category.trim() || null,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .select()
      .single();

    setBusy(false);
    setProgress("");
    if (dbErr) return alert("Gagal simpan: " + dbErr.message);

    setDocs((d) => [row, ...d]);
    setTitle("");
    setCategory("");
    setFile(null);
    (document.getElementById("doc-file") as HTMLInputElement).value = "";
  }

  async function download(doc: Doc) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl)
      return alert("Gagal membuat link unduhan: " + (error?.message || ""));
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = doc.file_name;
    a.click();
  }

  async function remove(doc: Doc) {
    if (!confirm(`Hapus "${doc.title}"? Tindakan ini tidak bisa dibatalkan.`))
      return;
    setDocs((d) => d.filter((x) => x.id !== doc.id));
    await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    router.refresh();
  }

  const categories = useMemo(
    () =>
      Array.from(
        new Set(docs.map((d) => d.category).filter(Boolean)),
      ) as string[],
    [docs],
  );

  const filtered = docs.filter((d) => {
    if (filter && d.category !== filter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dokumen Pribadi</h1>

      <form onSubmit={upload} className="glass-card space-y-3 p-6">
        <h2 className="text-sm font-medium text-neutral-500">Tambah Dokumen</h2>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Nama dokumen (misal: KTP, Ijazah S1)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`flex-1 ${inputCls}`}
          />
          <input
            list="doc-categories"
            placeholder="Kategori (opsional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full sm:w-48 ${inputCls}`}
          />
          <datalist id="doc-categories">
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="doc-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {busy && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-neutral-900/30 dark:border-t-neutral-900" />
            )}
            {busy ? progress || "Memproses…" : "Unggah"}
          </button>
        </div>
        {busy && (
          <div className="flex items-center gap-3 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-white/20 dark:border-t-white" />
            <span>
              {progress || "Memproses…"}{" "}
              <span className="text-neutral-400">
                Jangan tutup halaman ini.
              </span>
            </span>
          </div>
        )}
      </form>

      {/* Filter & search */}
      {!initialLoading && docs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Cari dokumen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full sm:w-56 ${inputCls}`}
          />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter(null)}
                className={`rounded-full px-3 py-1 text-xs ${!filter ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-500 dark:bg-white/10"}`}
              >
                Semua
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c === filter ? null : c)}
                  className={`rounded-full px-3 py-1 text-xs ${filter === c ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-500 dark:bg-white/10"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List */}
      {initialLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card h-16 animate-pulse p-4" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="glass-card flex items-center gap-3 p-4"
            >
              <span className="text-2xl">
                {fileIcon(doc.file_name, doc.mime_type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{doc.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  {doc.category && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-white/10">
                      {doc.category}
                    </span>
                  )}
                  <span>{fmtSize(doc.file_size)}</span>
                  <span>
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(doc.created_at))}
                  </span>
                </div>
              </div>
              <button
                onClick={() => download(doc)}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:border-neutral-400 dark:border-white/10"
              >
                Unduh
              </button>
              <button
                onClick={() => remove(doc)}
                className="text-xs text-neutral-300 hover:text-red-500"
              >
                Hapus
              </button>
            </div>
          ))}
          {filtered.length === 0 && docs.length > 0 && (
            <p className="glass-card p-6 text-sm text-neutral-400">
              Tidak ada dokumen yang cocok.
            </p>
          )}
          {docs.length === 0 && (
            <p className="glass-card p-6 text-sm text-neutral-400">
              Belum ada dokumen. Unggah dokumen pertamamu di atas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
