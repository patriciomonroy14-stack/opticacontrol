"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function logActivity(params: {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("activity_log").insert({
    user_id: user?.id ?? null,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id ?? null,
    details: params.details ?? {},
  });
}
