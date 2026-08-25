import { createClient } from "@/lib/supabase/server";
import { DocumentList } from "./document-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DocumentsPage() {
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

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Dokumen Pribadi
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-3)" }}>
          {(documents ?? []).length} dokumen tersimpan
        </p>
      </div>
      <DocumentList userId={user.id} initialDocuments={documents ?? []} />
    </div>
  );
}
