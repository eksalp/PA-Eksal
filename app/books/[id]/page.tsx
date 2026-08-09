import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReaderWrapper } from "./reader-wrapper";

export default async function BookReaderPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="glass-card p-6 text-sm text-neutral-500">
        Silakan login dulu.
      </div>
    );
  }

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!book) {
    return (
      <div className="glass-card p-6 text-sm text-neutral-500">
        Buku tidak ditemukan.{" "}
        <Link href="/books" className="underline">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/books"
        className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
      >
        ‹ Perpustakaan
      </Link>
      <ReaderWrapper book={book} />
    </div>
  );
}
