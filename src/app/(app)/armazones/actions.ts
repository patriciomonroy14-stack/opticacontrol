"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";

export async function createFrame(
  _prevState: { error: string; ok?: boolean },
  formData: FormData,
): Promise<{ error: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "administrador";

  const num = (key: string) => Number(formData.get(key) || 0);
  const str = (key: string) => String(formData.get(key) || "").trim() || null;

  const payload = {
    code: String(formData.get("code") || "").trim(),
    brand: str("brand"),
    material: str("material"),
    sale_price: num("sale_price"),
    stock: num("stock"),
    notes: str("notes"),
    // Solo un administrador puede registrar el precio de compra
    ...(isAdmin ? { purchase_price: num("purchase_price") } : {}),
  };

  if (!payload.code) return { error: "El código es obligatorio." };

  const { data, error } = await supabase.from("frames").insert(payload).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un armazón con ese código." : "No se pudo guardar el armazón." };

  let photoWarning = "";
  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${data.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("frames-photos").upload(path, photo, { upsert: true, contentType: photo.type || undefined });
    if (uploadError) {
      photoWarning = "El armazón se guardó, pero la foto no se pudo subir. Intenta con una imagen más liviana.";
    } else {
      const { data: pub } = supabase.storage.from("frames-photos").getPublicUrl(path);
      await supabase.from("frames").update({ photo_url: pub.publicUrl }).eq("id", data.id);
    }
  }

  await logActivity({ action: "crear_armazon", entity_type: "frame", entity_id: data.id, details: { code: payload.code } });
  revalidatePath("/armazones");
  if (photoWarning) return { error: photoWarning };
  return { error: "", ok: true };
}
