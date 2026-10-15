import { createClient } from "@/lib/supabase/server";

/** Usuario actual con su rol. Para usar en páginas y acciones del servidor. */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as string | null, name: null as string | null };
  const { data: profile } = await supabase.from("profiles").select("role, full_name, active").eq("id", user.id).maybeSingle();
  const role = profile?.active === false ? null : ((profile?.role as string | undefined) ?? null);
  return { supabase, user, role, name: profile?.full_name ?? user.email ?? null };
}

/** Fecha de hoy en Chile y si la caja de ese día está cerrada (y no reabierta). */
export async function isCashClosed(supabase: Awaited<ReturnType<typeof createClient>>, date: string) {
  const { data } = await supabase.from("cash_closings").select("id, reopened_at").eq("closing_date", date).maybeSingle();
  return Boolean(data && !data.reopened_at);
}
