import { createClient } from "@/lib/supabase/server";
import { BooksLibrary } from "./library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BooksPage() {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return (
      <div className="card p-6 text-sm" style={{ color: "var(--text-3)" }}>
        Silakan login dulu.
      </div>
    );

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Perpustakaan
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-3)" }}>
          {(books ?? []).length} buku
        </p>
      </div>
      <BooksLibrary userId={user.id} initialBooks={books ?? []} />
    </div>
  );
}
