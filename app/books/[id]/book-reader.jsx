"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { createClient } from "@/lib/supabase/client";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Pilih dimensi biar halaman FIT ke layar (contain): kalau halaman lebih lebar
// dari container -> batasi lebar; kalau lebih tinggi -> batasi tinggi.
function fitDims(cw, ch, ratio) {
  if (!ratio || !cw || !ch) return { width: Math.max(200, cw || 320) };
  const containerAspect = cw / ch;
  return ratio > containerAspect
    ? { width: Math.floor(cw) }
    : { height: Math.floor(ch) };
}

export default function BookReader({ book }) {
  const supabase = createClient();
  const [url, setUrl] = useState(null);
  const [numPages, setNumPages] = useState(book.total_pages || null);
  const [page, setPage] = useState(book.last_page || 1);
  const [winW, setWinW] = useState(800);
  const [vh, setVh] = useState(800);
  const [ratio, setRatio] = useState(null); // lebar/tinggi halaman
  const [err, setErr] = useState(null);
  const [immersive, setImmersive] = useState(false);
  const [showBars, setShowBars] = useState(true);

  const numRef = useRef(numPages);
  numRef.current = numPages;
  const touchX = useRef(0);

  useEffect(() => {
    (async () => {
      const { data: fresh } = await supabase
        .from("books")
        .select("last_page, total_pages")
        .eq("id", book.id)
        .single();
      if (fresh) {
        setPage(fresh.last_page || 1);
        if (fresh.total_pages) setNumPages(fresh.total_pages);
      }
      const { data, error } = await supabase.storage
        .from("books")
        .createSignedUrl(book.file_path, 3600);
      if (error) setErr(error.message);
      else setUrl(data?.signedUrl ?? null);
    })();
    const measure = () => {
      setVh(window.innerHeight);
      setWinW(window.innerWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(np) {
    supabase
      .from("books")
      .update({ last_page: np })
      .eq("id", book.id)
      .then(() => {});
  }
  function next() {
    setPage((c) => {
      const np = Math.min(numRef.current || 1, c + 1);
      if (np !== c) persist(np);
      return np;
    });
  }
  function prev() {
    setPage((c) => {
      const np = Math.max(1, c - 1);
      if (np !== c) persist(np);
      return np;
    });
  }
  function jump(p) {
    const np = Math.max(1, Math.min(numRef.current || 1, p));
    setPage(np);
    persist(np);
  }

  async function onDocLoad({ numPages }) {
    setNumPages(numPages);
    if (!book.total_pages)
      await supabase
        .from("books")
        .update({ total_pages: numPages })
        .eq("id", book.id);
  }
  function onPageLoad(pg) {
    const w = pg.originalWidth || pg.width;
    const h = pg.originalHeight || pg.height;
    if (w && h) setRatio(w / h);
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setImmersive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
  }

  const pct = numPages ? Math.round((page / numPages) * 100) : 0;

  // Dimensi fit
  const normalW = Math.min(820, winW - 32);
  const normalH = Math.max(320, vh - 260);
  const normalDims = fitDims(normalW, normalH, ratio);
  const immH = vh - (showBars ? 100 : 28);
  const immDims = fitDims(winW - 8, immH, ratio);

  return (
    <div className="space-y-3">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{book.title}</div>
            {book.author && (
              <div className="text-xs text-neutral-400">{book.author}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">
              {numPages ? `${pct}%` : ""}
            </span>
            <button
              onClick={() => {
                setImmersive(true);
                setShowBars(true);
              }}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white dark:bg-white dark:text-neutral-900"
            >
              Layar penuh
            </button>
          </div>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-neutral-900 dark:bg-white"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {!immersive && (
        <>
          <div
            className="flex items-center justify-center overflow-hidden rounded-xl bg-neutral-100 p-2 dark:bg-white/5"
            style={{ minHeight: normalH }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {err && (
              <p className="p-6 text-sm text-red-500">Gagal memuat: {err}</p>
            )}
            {!err && !url && (
              <div className="flex items-center gap-2 p-6 text-sm text-neutral-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-white/20 dark:border-t-white" />{" "}
                Menyiapkan file…
              </div>
            )}
            {url && (
              <Document
                file={url}
                onLoadSuccess={onDocLoad}
                onLoadError={(e) => setErr(e.message)}
                loading={
                  <div className="flex items-center gap-2 p-6 text-sm text-neutral-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-white/20 dark:border-t-white" />{" "}
                    Memuat PDF…
                  </div>
                }
              >
                <Page
                  pageNumber={page}
                  {...normalDims}
                  onLoadSuccess={onPageLoad}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            )}
          </div>

          <div className="glass-card sticky bottom-4 flex items-center justify-between gap-3 p-3">
            <button
              onClick={prev}
              disabled={page <= 1}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm disabled:opacity-30 dark:border-white/10"
            >
              ‹ Sebelumnya
            </button>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                value={page}
                min={1}
                max={numPages || 1}
                onChange={(e) => jump(Number(e.target.value) || 1)}
                className="w-16 rounded-lg border border-neutral-200 bg-white/60 px-2 py-1 text-center dark:border-white/10 dark:bg-white/5"
              />
              <span className="text-neutral-400">/ {numPages || "?"}</span>
            </div>
            <button
              onClick={next}
              disabled={numPages ? page >= numPages : false}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm disabled:opacity-30 dark:border-white/10"
            >
              Berikutnya ›
            </button>
          </div>
        </>
      )}

      {immersive && url && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-neutral-950"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {showBars && (
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <button onClick={() => setImmersive(false)} className="text-sm">
                ✕ Tutup
              </button>
              <span className="text-xs text-white/70">
                {page} / {numPages || "?"} · {pct}%
              </span>
            </div>
          )}

          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <Document
              file={url}
              onLoadSuccess={onDocLoad}
              loading={
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              }
            >
              <Page
                pageNumber={page}
                {...immDims}
                onLoadSuccess={onPageLoad}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
            <button
              className="absolute inset-y-0 left-0 w-1/3"
              onClick={prev}
              aria-label="Sebelumnya"
            />
            <button
              className="absolute inset-y-0 left-1/3 w-1/3"
              onClick={() => setShowBars((s) => !s)}
              aria-label="Kontrol"
            />
            <button
              className="absolute inset-y-0 right-0 w-1/3"
              onClick={next}
              aria-label="Berikutnya"
            />
          </div>

          {showBars && (
            <div className="px-4 py-3 text-center text-[11px] text-white/40">
              Geser kiri/kanan atau ketuk tepi layar untuk pindah halaman ·
              ketuk tengah untuk sembunyikan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
