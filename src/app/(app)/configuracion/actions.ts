"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";

type SettingsState = { error: string; success: string };

export async function updateOpticaInfo(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();

  const value = {
    name: String(formData.get("name") || "Óptica Retiro"),
    logo_url: String(formData.get("logo_url") || "") || null,
    colors: { primary: "#1D4ED8", background: "#FFFFFF" },
  };

  const { error } = await supabase.from("settings").update({ value }).eq("key", "optica_info");
  if (error) return { error: "No se pudieron guardar los datos.", success: "" };

  await logActivity({ action: "actualizar_configuracion", entity_type: "settings", details: value });
  revalidatePath("/configuracion");
  return { error: "", success: "Datos guardados correctamente." };
}

export async function updateBusinessHours(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const value = {
    lunes_viernes: String(formData.get("lunes_viernes") || ""),
    sabado: String(formData.get("sabado") || ""),
    domingo: String(formData.get("domingo") || ""),
    slot_minutes: Math.min(120, Math.max(5, Number(formData.get("slot_minutes")) || 15)),
  };
  const { error } = await supabase.from("settings").update({ value }).eq("key", "business_hours");
  if (error) return { error: "No se pudieron guardar los horarios.", success: "" };
  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  return { error: "", success: "Horarios actualizados." };
}

export async function toggleAutomation(key: string, enabled: boolean) {
  const supabase = await createClient();
  await supabase.from("automation_rules").update({ enabled }).eq("key", key);
  await logActivity({ action: "actualizar_automatizacion", entity_type: "automation_rule", details: { key, enabled } });
  revalidatePath("/configuracion");
}

/** Políticas de la óptica (solo administradora): tope de descuento sin aprobación. */
export async function updatePolicies(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const { getSession } = await import("@/lib/session");
  const { supabase, user, role } = await getSession();
  if (!user || role !== "administrador") return { error: "Solo la administradora puede cambiar esto.", success: "" };
  const pct = Number(formData.get("max_discount_pct"));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: "Ingresa un porcentaje entre 0 y 100.", success: "" };

  const { data: existing } = await supabase.from("settings").select("value").eq("key", "policies").maybeSingle();
  const value = { ...((existing?.value as object) ?? {}), max_discount_pct: pct };
  const { error } = existing
    ? await supabase.from("settings").update({ value }).eq("key", "policies")
    : await supabase.from("settings").insert({ key: "policies", value });
  if (error) return { error: "No se pudo guardar.", success: "" };

  await logActivity({ action: "actualizar_politicas", entity_type: "settings", details: { antes: existing?.value ?? null, despues: value } });
  revalidatePath("/configuracion");
  return { error: "", success: "Guardado." };
}
