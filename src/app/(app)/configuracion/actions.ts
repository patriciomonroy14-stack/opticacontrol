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
  };
  const { error } = await supabase.from("settings").update({ value }).eq("key", "business_hours");
  if (error) return { error: "No se pudieron guardar los horarios.", success: "" };
  revalidatePath("/configuracion");
  return { error: "", success: "Horarios actualizados." };
}

export async function toggleAutomation(key: string, enabled: boolean) {
  const supabase = await createClient();
  await supabase.from("automation_rules").update({ enabled }).eq("key", key);
  await logActivity({ action: "actualizar_automatizacion", entity_type: "automation_rule", details: { key, enabled } });
  revalidatePath("/configuracion");
}
