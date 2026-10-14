import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Busca un paciente por nombre (sin importar mayúsculas). Si no existe, lo crea.
 * Si existe y no tenía teléfono, guarda el que se ingresó.
 */
export async function findOrCreatePatient(
  supabase: SupabaseClient,
  rawName: string,
  phone: string | null,
  userId: string | null,
): Promise<{ id: string; created: boolean } | { error: string }> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Escribe el nombre del paciente." };

  const escaped = name.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data: matches } = await supabase
    .from("patients")
    .select("id, phone")
    .ilike("full_name", escaped)
    .order("status", { ascending: true })
    .limit(1);

  const match = matches?.[0];
  if (match) {
    if (phone && !match.phone) await supabase.from("patients").update({ phone }).eq("id", match.id);
    return { id: match.id, created: false };
  }

  const { data, error } = await supabase
    .from("patients")
    .insert({ full_name: name, phone, created_by: userId })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo registrar al paciente." };
  return { id: data.id, created: true };
}
