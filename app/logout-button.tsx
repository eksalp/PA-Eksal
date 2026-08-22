"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
      style={{ color: "var(--text-3)" }}
    >
      Keluar
    </button>
  );
}
