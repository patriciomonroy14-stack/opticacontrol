"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import type { FocalType } from "@/lib/types";

export async function createLens(_prevState: { error: string }, formData: FormData) {
  const supabase = await createClient();
  const str = (key: string) => String(formData.get(key) || "").trim() || null;
  const num = (key: string) => {
    const v = formData.get(key);
    return v && String(v).trim() !== "" ? Number(v) : null;
  };

  const treatments = String(formData.get("treatments") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = {
    code: str("code"),
    lens_type: str("lens_type"),
    material: str("material"),
    lens_index: num("lens_index"),
    focal_type: (str("focal_type") as FocalType) || null,
    photochromic: formData.get("photochromic") === "on",
    antireflective: formData.get("antireflective") === "on",
    treatments,
    price: num("price"),
    supplier: str("supplier"),
    stock: num("stock"),
  };

  if (!payload.lens_type) return { error: "El tipo de cristal es obligatorio." };

  const { error } = await supabase.from("lenses").insert(payload);
  if (error) return { error: "No se pudo guardar el cristal." };

  await logActivity({ action: "crear_cristal", entity_type: "lens", details: { lens_type: payload.lens_type } });
  revalidatePath("/cristales");
  return { error: "" };
}
