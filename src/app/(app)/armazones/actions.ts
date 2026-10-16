"use server";

import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import { canSell, isAdmin } from "@/lib/types";
import { getSession } from "@/lib/session";
import { adjustFrameStock } from "@/lib/inventory";
import { FRAME_TYPES } from "./NewFrameForm";

type State = { error: string; ok?: boolean };

function revalidateFrames(id?: string) {
  revalidatePath("/armazones");
  if (id) revalidatePath(`/armazones/${id}`);
  revalidatePath("/panel");
  revalidatePath("/ventas/nueva");
}

async function uploadPhoto(supabase: Awaited<ReturnType<typeof getSession>>["supabase"], frameId: string, photo: File | null) {
  if (!photo || photo.size === 0) return "";
  const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${frameId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("frames-photos").upload(path, photo, { upsert: true, contentType: photo.type || undefined });
  if (error) return "La foto no se pudo subir. Intenta con una imagen más liviana.";
  const { data: pub } = supabase.storage.from("frames-photos").getPublicUrl(path);
  await supabase.from("frames").update({ photo_url: pub.publicUrl }).eq("id", frameId);
  return "";
}

export async function createFrame(_prevState: State, formData: FormData): Promise<State> {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return { error: "Tu usuario no puede agregar armazones." };
  const admin = isAdmin(role);

  const num = (key: string) => Number(formData.get(key) || 0);
  const str = (key: string) => String(formData.get(key) || "").trim() || null;
  const initialStock = Math.max(0, Math.floor(num("stock")));

  const payload = {
    code: String(formData.get("code") || "").trim(),
    frame_type: (str("frame_type") ?? "").toUpperCase() || null,
    brand: str("brand"),
    color: str("color"),
    sale_price: num("sale_price"),
    stock: initialStock,
    // El costo de adquisición solo lo registra la administradora
    ...(admin ? { purchase_price: num("purchase_price") } : {}),
  };

  if (!payload.code) return { error: "El código es obligatorio." };
  if (!payload.frame_type || !FRAME_TYPES.includes(payload.frame_type)) return { error: "Selecciona el tipo (C1 a C8)." };
  if (payload.sale_price < 0) return { error: "El precio no puede ser negativo." };

  const { data, error } = await supabase.from("frames").insert(payload).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? `Ya existe el código ${payload.code} en ${payload.frame_type}. Elige otro tipo o suma stock en su ficha.` : "No se pudo guardar el armazón." };

  if (initialStock > 0) {
    await supabase.from("inventory_movements").insert({ frame_id: data.id, kind: "ingreso", stock_change: initialStock, reason: "Stock inicial al crear el armazón" });
  }

  const photoWarning = await uploadPhoto(supabase, data.id, formData.get("photo") as File | null);
  await logActivity({ action: "crear_armazon", entity_type: "frame", entity_id: data.id, details: { code: payload.code, stock: initialStock } });
  revalidateFrames(data.id);
  if (photoWarning) return { error: `El armazón se guardó. ${photoWarning}` };
  return { error: "", ok: true };
}

/** Edita los datos del armazón. Precio y costo solo los cambia la administradora. */
export async function updateFrame(frameId: string, _prevState: State, formData: FormData): Promise<State> {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return { error: "Tu usuario no puede modificar armazones." };
  const admin = isAdmin(role);
  const str = (key: string) => String(formData.get(key) || "").trim() || null;

  const { data: before } = await supabase
    .from("frames")
    .select(admin ? "code, frame_type, brand, model, color, material, supplier, notes, sale_price, purchase_price" : "code, frame_type, brand, model, color, material, supplier, notes, sale_price")
    .eq("id", frameId)
    .maybeSingle();
  if (!before) return { error: "No se encontró el armazón." };

  const values: Record<string, unknown> = {
    frame_type: (str("frame_type") ?? "").toUpperCase() || null,
    brand: str("brand"),
    model: str("model"),
    color: str("color"),
    material: str("material"),
    supplier: str("supplier"),
    notes: str("notes"),
  };
  if (admin) {
    values.sale_price = Number(formData.get("sale_price") || 0);
    values.purchase_price = Number(formData.get("purchase_price") || 0);
  }

  const { error } = await supabase.from("frames").update(values).eq("id", frameId);
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe otro armazón con ese código y ese tipo." : "No se pudieron guardar los cambios." };

  const photoWarning = await uploadPhoto(supabase, frameId, formData.get("photo") as File | null);
  await logActivity({ action: "editar_armazon", entity_type: "frame", entity_id: frameId, details: { antes: before, despues: values } });
  revalidateFrames(frameId);
  if (photoWarning) return { error: photoWarning };
  return { error: "", ok: true };
}

/** Ajuste de stock con motivo (ingreso de mercadería, conteo, merma). Solo administradora. */
export async function adjustStock(frameId: string, _prevState: State, formData: FormData): Promise<State> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede ajustar el inventario." };
  const delta = Math.trunc(Number(formData.get("delta") || 0));
  const kind = formData.get("kind") === "ingreso" ? "ingreso" : "ajuste";
  const reason = String(formData.get("reason") || "").trim();
  if (!delta) return { error: "Indica cuántas unidades sumar o restar." };
  if (kind === "ingreso" && delta < 0) return { error: "Un ingreso de mercadería debe ser positivo." };
  if (reason.length < 4) return { error: "Escribe el motivo del ajuste." };

  const result = await adjustFrameStock(supabase, frameId, delta, kind, reason);
  if ("error" in result) return { error: result.error };

  await logActivity({ action: kind === "ingreso" ? "ingreso_inventario" : "ajuste_inventario", entity_type: "frame", entity_id: frameId, details: { cambio: delta, motivo: reason } });
  revalidateFrames(frameId);
  return { error: "", ok: true };
}
