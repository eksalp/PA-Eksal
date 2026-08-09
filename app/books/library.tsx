"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Book = {
  id: string;
  title: string;
  author: string | null;
  file_path: string;
  cover_path: string | null;
  total_pages: number | null;
  last_page: number;
};

const GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-rose-500 to-orange-500",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-red-500",
  "from-fuchsia-500 to-pink-600",
];

// Render halaman 1 PDF jadi PNG (buat sampul). Dipanggil client-only.
async function makeCover(file: File): Promise<Blob | null> {
  try {
    const { pdfjs } = await import("react-pdf");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const p = await pdf.getPage(1);
    const viewport = p.getViewport({ scale: 1 });
    const canvas = document.createElement("canvas");
    const targetW = 300;
    const scale = targetW / viewport.width;
    const sv = p.getViewport({ scale });
    canvas.width = sv.width;
    canvas.height = sv.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await p.render({ canvasContext: ctx, viewport: sv }).promise;
    return await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/png", 0.9),
    );
  } catch (e) {
    return null;
  }
}

export function BooksLibrary({
  userId,
  initialBooks,
}: {
  userId: string;
  initialBooks: Book[];
}) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient() as any;

  // Baca ulang daftar buku dari DB tiap halaman dibuka, biar progress
  // (halaman terakhir) selalu update tanpa perlu refresh manual.
  useEffect(() => {
    (async () => {
      const { data: fresh } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const list = fresh ?? books;
      setBooks(list);

      const map: Record<string, string> = {};
      for (const b of list) {
        if (b.cover_path) {
          const { data } = await supabase.storage
            .from("books")
            .createSignedUrl(b.cover_path, 3600);
          if (data?.signedUrl) map[b.id] = data.signedUrl;
        }
      }
      setCovers(map);
      setInitialLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert("Pilih file PDF dulu.");
    if (file.type !== "application/pdf") return alert("File harus PDF.");
    if (!title.trim()) return alert("Isi judul dulu.");

    setBusy(true);
    const base = `${userId}/${crypto.randomUUID()}`;
    const path = `${base}.pdf`;

    setProgress("Mengunggah…");
    const { error: upErr } = await supabase.storage
      .from("books")
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) {
      setBusy(false);
      setProgress("");
      return alert("Gagal unggah: " + upErr.message);
    }

    // Bikin & unggah sampul (halaman 1)
    setProgress("Membuat sampul…");
    let coverPath: string | null = null;
    const coverBlob = await makeCover(file);
    if (coverBlob) {
      coverPath = `${base}-cover.png`;
      await supabase.storage
        .from("books")
        .upload(coverPath, coverBlob, {
          contentType: "image/png",
          upsert: false,
        });
    }

    const { data: row, error: dbErr } = await supabase
      .from("books")
      .insert({
        user_id: userId,
        title: title.trim(),
        author: author.trim() || null,
        file_path: path,
        cover_path: coverPath,
      })
      .select()
      .single();

    setBusy(false);
    setProgress("");
    if (dbErr) return alert("Gagal simpan: " + dbErr.message);

    setBooks((b) => [row, ...b]);
    if (coverPath) {
      const { data } = await supabase.storage
        .from("books")
        .createSignedUrl(coverPath, 3600);
      if (data?.signedUrl)
        setCovers((c) => ({ ...c, [row.id]: data.signedUrl }));
    }
    setTitle("");
    setAuthor("");
    setFile(null);
    (document.getElementById("book-file") as HTMLInputElement).value = "";
  }

  async function remove(book: Book) {
    if (!confirm(`Hapus "${book.title}"?`)) return;
    setBooks((b) => b.filter((x) => x.id !== book.id));
    const paths = [book.file_path];
    if (book.cover_path) paths.push(book.cover_path);
    await supabase.storage.from("books").remove(paths);
    await supabase.from("books").delete().eq("id", book.id);
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Perpustakaan</h1>

      <form onSubmit={upload} className="glass-card space-y-3 p-6">
        <h2 className="text-sm font-medium text-neutral-500">
          Tambah Buku (PDF)
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Judul"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`flex-1 ${inputCls}`}
          />
          <input
            placeholder="Penulis (opsional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={`flex-1 ${inputCls}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="book-file"
            type="file"
            accept="application/pdf"
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

      {initialLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] w-full rounded-xl bg-neutral-200 dark:bg-white/10" />
              <div className="mt-2 h-3 w-3/4 rounded bg-neutral-200 dark:bg-white/10" />
              <div className="mt-1 h-1 w-full rounded bg-neutral-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {books.map((book, i) => {
            const pct = book.total_pages
              ? Math.round((book.last_page / book.total_pages) * 100)
              : 0;
            const cover = covers[book.id];
            return (
              <div key={book.id} className="group relative">
                <Link href={`/books/${book.id}`}>
                  {cover ? (
                    <img
                      src={cover}
                      alt={book.title}
                      className="aspect-[3/4] w-full rounded-xl object-cover shadow-md transition group-hover:-translate-y-1"
                    />
                  ) : (
                    <div
                      className={`flex aspect-[3/4] flex-col justify-end rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} p-3 text-white shadow-md transition group-hover:-translate-y-1`}
                    >
                      <div className="text-sm font-semibold leading-tight line-clamp-4">
                        {book.title}
                      </div>
                      {book.author && (
                        <div className="mt-1 text-[11px] opacity-80">
                          {book.author}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
                <div className="mt-2">
                  <div className="truncate text-xs font-medium">
                    {book.title}
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-neutral-900 dark:bg-white"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                    <span>
                      {book.total_pages
                        ? `${pct}% · hal ${book.last_page}/${book.total_pages}`
                        : "belum dibuka"}
                    </span>
                    <button
                      onClick={() => remove(book)}
                      className="hover:text-red-500"
                    >
                      hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!initialLoading && books.length === 0 && (
        <p className="glass-card p-6 text-sm text-neutral-400">
          Belum ada buku. Unggah PDF pertamamu di atas.
        </p>
      )}
    </div>
  );
}
