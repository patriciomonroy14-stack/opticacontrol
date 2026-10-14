"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";

export async function createFrame(_prevState: { error: string }, formData: FormData) {
  const supabase = await createClient();
  const num = (key: string) => Number(formData.get(key) || 0);
  const str = (key: string) => String(formData.get(key) || "").trim() || null;

  const payload = {
    code: String(formData.get("code") || "").trim(),
    brand: str("brand"),
    model: str("model"),
    color: str("color"),
    material: str("material"),
    shape: str("shape"),
    gender: str("gender"),
    size: str("size"),
    purchase_price: num("purchase_price"),
    sale_price: num("sale_price"),
    stock: num("stock"),
    supplier: str("supplier"),
    location: str("location"),
    notes: str("notes"),
  };

  if (!payload.code) return { error: "El código es obligatorio." };

  const { data, error } = await supabase.from("frames").insert(payload).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un armazón con ese código." : "No se pudo guardar el armazón." };

  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop();
    const path = `${data.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("frames-photos").upload(path, photo, { upsert: true });
    if (!uploadError) {
      const { data: pub } = supabase.storage.from("frames-photos").getPublicUrl(path);
      await supabase.from("frames").update({ photo_url: pub.publicUrl }).eq("id", data.id);
    }
  }

  await logActivity({ action: "crear_armazon", entity_type: "frame", entity_id: data.id, details: { code: payload.code } });
  revalidatePath("/armazones");
  return { error: "" };
}
