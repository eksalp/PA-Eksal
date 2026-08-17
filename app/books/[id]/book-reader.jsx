"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { createClient } from "@/lib/supabase/client";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function fitDims(cw, ch, ratio) {
  if (!ratio || !cw || !ch) return { width: Math.max(200, cw || 320) };
  const containerAspect = cw / ch;
  return ratio > containerAspect
    ? { width: Math.floor(cw) }
    : { height: Math.floor(ch) };
}
function scaleDims(d, z) {
  return d.width
    ? { width: Math.floor(d.width * z) }
    : { height: Math.floor(d.height * z) };
}

export default function BookReader({ book }) {
  const supabase = createClient();
  const [url, setUrl] = useState(null);
  const [numPages, setNumPages] = useState(book.total_pages || null);
  const [page, setPage] = useState(book.last_page || 1);
  const [winW, setWinW] = useState(800);
  const [vh, setVh] = useState(800);
  const [ratio, setRatio] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState(null);
  const [immersive, setImmersive] = useState(false);
  const [showBars, setShowBars] = useState(true);

  const numRef = useRef(numPages);
  numRef.current = numPages;
  const touchX = useRef(0);
  const pinch = useRef({ dist: 0, zoom: 1, active: false });

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

  const zoomIn = () => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)));
  const zoomReset = () => setZoom(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setImmersive(false);
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function twoDist(t) {
    return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  }
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      pinch.current = { dist: twoDist(e.touches), zoom, active: true };
    } else {
      touchX.current = e.touches[0].clientX;
      pinch.current.active = false;
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && pinch.current.active) {
      e.preventDefault();
      const d = twoDist(e.touches);
      const z = Math.min(
        4,
        Math.max(1, pinch.current.zoom * (d / (pinch.current.dist || 1))),
      );
      setZoom(+z.toFixed(2));
    }
  }
  function onTouchEnd(e) {
    if (pinch.current.active) {
      pinch.current.active = false;
      return;
    }
    // Swipe pindah halaman cuma kalau nggak lagi di-zoom (biar bisa geser/pan)
    if (zoom <= 1.02) {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 50) {
        if (dx < 0) next();
        else prev();
      }
    }
  }

  const pct = numPages ? Math.round((page / numPages) * 100) : 0;
  const zoomed = zoom > 1.02;

  const normalW = Math.min(820, winW - 32);
  const normalH = Math.max(320, vh - 260);
  const normalDims = scaleDims(fitDims(normalW, normalH, ratio), zoom);
  const immH = vh - (showBars ? 100 : 28);
  const immDims = scaleDims(fitDims(winW - 8, immH, ratio), zoom);

  const ZoomCtrl = ({ dark }) => (
    <div
      className={`flex items-center gap-1 rounded-lg border p-0.5 ${dark ? "border-white/20 text-white" : "border-neutral-200 dark:border-white/10"}`}
    >
      <button
        onClick={zoomOut}
        className="px-2 py-1 text-sm disabled:opacity-30"
        disabled={zoom <= 1}
        aria-label="Perkecil"
      >
        −
      </button>
      <button
        onClick={zoomReset}
        className="min-w-[42px] px-1 py-1 text-xs tabular-nums"
        aria-label="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={zoomIn}
        className="px-2 py-1 text-sm disabled:opacity-30"
        disabled={zoom >= 4}
        aria-label="Perbesar"
      >
        +
      </button>
    </div>
  );

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
            className="overflow-auto rounded-xl bg-neutral-100 p-2 dark:bg-white/5"
            style={{ maxHeight: normalH + 16, touchAction: "pan-y" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className={`flex min-h-full min-w-full ${zoomed ? "items-start" : "items-center"} justify-center`}
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
          </div>

          <div className="glass-card sticky bottom-4 flex items-center justify-between gap-2 p-3">
            <button
              onClick={prev}
              disabled={page <= 1}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm disabled:opacity-30 dark:border-white/10"
            >
              ‹
            </button>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                value={page}
                min={1}
                max={numPages || 1}
                onChange={(e) => jump(Number(e.target.value) || 1)}
                className="w-14 rounded-lg border border-neutral-200 bg-white/60 px-2 py-1 text-center dark:border-white/10 dark:bg-white/5"
              />
              <span className="text-neutral-400">/ {numPages || "?"}</span>
            </div>
            <ZoomCtrl dark={false} />
            <button
              onClick={next}
              disabled={numPages ? page >= numPages : false}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm disabled:opacity-30 dark:border-white/10"
            >
              ›
            </button>
          </div>
        </>
      )}

      {immersive && url && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-neutral-950">
          {showBars && (
            <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
              <button onClick={() => setImmersive(false)} className="text-sm">
                ✕ Tutup
              </button>
              <span className="text-xs text-white/70">
                {page} / {numPages || "?"} · {pct}%
              </span>
              <ZoomCtrl dark />
            </div>
          )}

          <div
            className="relative flex-1 overflow-auto"
            style={{ touchAction: "pan-y" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className={`flex min-h-full min-w-full ${zoomed ? "items-start" : "items-center"} justify-center`}
            >
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
            </div>
            {/* Zona ketuk hanya saat TIDAK di-zoom (biar pas zoom bisa di-pan bebas) */}
            {!zoomed && (
              <>
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
              </>
            )}
          </div>

          {showBars && (
            <div className="px-4 py-3 text-center text-[11px] text-white/40">
              {zoomed
                ? "Geser untuk lihat detail · pakai − untuk kembali & aktifkan pindah halaman"
                : "Cubit untuk zoom · geser/ketuk tepi untuk pindah halaman · ketuk tengah sembunyikan"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
