import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.full_name || user.email || "Usuario";
  const role = profile?.role || "recepcionista";

  return (
    <div className="min-h-screen bg-[var(--oc-blue-50)]">
      <Sidebar role={role} />
      <div className="md:pl-60">
        <Topbar userName={userName} role={ROLE_LABELS[role as UserRole] ?? role} />
        <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">{children}</main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
