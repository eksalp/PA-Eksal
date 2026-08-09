"use client";

import dynamic from "next/dynamic";

// react-pdf harus dimuat client-only (ssr:false) biar nggak error di server.
const BookReader = dynamic(() => import("./book-reader"), {
  ssr: false,
  loading: () => (
    <p className="glass-card p-6 text-sm text-neutral-400">Memuat pembaca…</p>
  ),
});

export function ReaderWrapper({ book }: { book: any }) {
  return <BookReader book={book} />;
}
