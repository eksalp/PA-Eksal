import { createClient } from "@/lib/supabase/server";
import { BooksLibrary } from "./library";

export default async function BooksPage() {
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

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <BooksLibrary userId={user.id} initialBooks={books ?? []} />;
}
