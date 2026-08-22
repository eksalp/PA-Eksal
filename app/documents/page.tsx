import { createClient } from "@/lib/supabase/server";
import { DocumentList } from "./document-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DocumentsPage() {
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

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <DocumentList userId={user.id} initialDocuments={documents ?? []} />;
}
