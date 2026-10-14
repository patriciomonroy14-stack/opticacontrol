"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/types";

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  await logActivity({ action: "actualizar_rol_usuario", entity_type: "profile", entity_id: userId, details: { role } });
  revalidatePath("/usuarios");
}

export async function toggleUserActive(userId: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ active }).eq("id", userId);
  await logActivity({ action: active ? "activar_usuario" : "desactivar_usuario", entity_type: "profile", entity_id: userId });
  revalidatePath("/usuarios");
}
