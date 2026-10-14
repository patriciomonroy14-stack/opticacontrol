"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import { isManager } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, isAdmin: isManager(profile?.role) };
}

export type CatalogFormState = { error: string };

export async function createLensType(_prevState: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador o la encargada pueden hacer esto." };
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Ingresa un nombre." };
  const { error } = await supabase.from("lens_types").insert({ name });
  if (error) return { error: error.message.includes("duplicate") ? "Ese tipo ya existe." : "No se pudo crear." };
  await logActivity({ action: "crear_tipo_cristal", entity_type: "lens_type", details: { name } });
  revalidatePath("/configuracion/cristales");
  return { error: "" };
}

export async function createLensMaterial(_prevState: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador o la encargada pueden hacer esto." };
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Ingresa un nombre." };
  const { error } = await supabase.from("lens_materials").insert({ name });
  if (error) return { error: error.message.includes("duplicate") ? "Ese material ya existe." : "No se pudo crear." };
  await logActivity({ action: "crear_material_cristal", entity_type: "lens_material", details: { name } });
  revalidatePath("/configuracion/cristales");
  return { error: "" };
}

export async function createLensColor(_prevState: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador o la encargada pueden hacer esto." };
  const name = String(formData.get("name") || "").trim();
  const lensTypeId = String(formData.get("lens_type_id") || "").trim();
  if (!name || !lensTypeId) return { error: "Selecciona un tipo e ingresa un nombre de color." };
  const { error } = await supabase.from("lens_colors").insert({ name, lens_type_id: lensTypeId });
  if (error) return { error: error.message.includes("duplicate") ? "Ese color ya existe para ese tipo." : "No se pudo crear." };
  await logActivity({ action: "crear_color_cristal", entity_type: "lens_color", details: { name, lensTypeId } });
  revalidatePath("/configuracion/cristales");
  return { error: "" };
}

export async function createLensFilter(_prevState: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador o la encargada pueden hacer esto." };
  const name = String(formData.get("name") || "").trim();
  const hasColor = formData.get("has_color") === "on";
  if (!name) return { error: "Ingresa un nombre." };
  const { error } = await supabase.from("lens_filters").insert({ name, has_color: hasColor });
  if (error) return { error: error.message.includes("duplicate") ? "Ese filtro ya existe." : "No se pudo crear." };
  await logActivity({ action: "crear_filtro_cristal", entity_type: "lens_filter", details: { name } });
  revalidatePath("/configuracion/cristales");
  return { error: "" };
}

export async function createLensFilterColor(_prevState: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador o la encargada pueden hacer esto." };
  const name = String(formData.get("name") || "").trim();
  const filterId = String(formData.get("filter_id") || "").trim();
  if (!name || !filterId) return { error: "Selecciona un filtro e ingresa un nombre de color." };
  const { error } = await supabase.from("lens_filter_colors").insert({ name, filter_id: filterId });
  if (error) return { error: error.message.includes("duplicate") ? "Ese color ya existe para ese filtro." : "No se pudo crear." };
  await logActivity({ action: "crear_color_filtro", entity_type: "lens_filter_color", details: { name, filterId } });
  revalidatePath("/configuracion/cristales");
  return { error: "" };
}

export async function setLensFilterPrice(_prevState: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador o la encargada pueden hacer esto." };

  const filterId = String(formData.get("filter_id") || "");
  const materialId = String(formData.get("material_id") || "") || null;
  const colorId = String(formData.get("color_id") || "") || null;
  const price = Number(formData.get("price") || 0);

  if (!filterId) return { error: "Selecciona un filtro." };
  if (price <= 0) return { error: "Ingresa un precio válido." };

  let existing = supabase.from("lens_filter_prices").select("id").eq("filter_id", filterId);
  existing = materialId ? existing.eq("material_id", materialId) : existing.is("material_id", null);
  existing = colorId ? existing.eq("color_id", colorId) : existing.is("color_id", null);
  const { data: found } = await existing.maybeSingle();

  if (found) {
    const { error } = await supabase.from("lens_filter_prices").update({ price, active: true }).eq("id", found.id);
    if (error) return { error: "No se pudo actualizar el precio." };
  } else {
    const { error } = await supabase.from("lens_filter_prices").insert({ filter_id: filterId, material_id: materialId, color_id: colorId, price });
    if (error) return { error: "No se pudo guardar el precio." };
  }

  await logActivity({ action: "definir_precio_filtro", entity_type: "lens_filter_price", details: { filterId, materialId, colorId, price } });
  revalidatePath("/configuracion/cristales");
  revalidatePath("/cotizaciones/nueva");
  revalidatePath("/ventas/nueva");
  return { error: "" };
}

export async function toggleCatalogItem(table: "lens_types" | "lens_materials" | "lens_colors" | "lens_catalog_prices" | "lens_filters" | "lens_filter_colors" | "lens_filter_prices", id: string, active: boolean) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return;
  await supabase.from(table).update({ active }).eq("id", id);
  await logActivity({ action: "activar_desactivar_catalogo", entity_type: table, entity_id: id, details: { active } });
  revalidatePath("/configuracion/cristales");
}

export async function setLensPrice(_prevState: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador o la encargada pueden hacer esto." };

  const lensTypeId = String(formData.get("lens_type_id") || "");
  const materialId = String(formData.get("material_id") || "");
  const colorId = String(formData.get("color_id") || "") || null;
  const price = Number(formData.get("price") || 0);

  if (!lensTypeId || !materialId) return { error: "Selecciona tipo y material." };
  if (price <= 0) return { error: "Ingresa un precio válido." };

  // ¿Ya existe una combinación igual? si es así, actualizamos; si no, insertamos.
  let existing = supabase
    .from("lens_catalog_prices")
    .select("id")
    .eq("lens_type_id", lensTypeId)
    .eq("material_id", materialId);
  existing = colorId ? existing.eq("color_id", colorId) : existing.is("color_id", null);
  const { data: found } = await existing.maybeSingle();

  if (found) {
    const { error } = await supabase.from("lens_catalog_prices").update({ price, active: true }).eq("id", found.id);
    if (error) return { error: "No se pudo actualizar el precio." };
  } else {
    const { error } = await supabase.from("lens_catalog_prices").insert({ lens_type_id: lensTypeId, material_id: materialId, color_id: colorId, price });
    if (error) return { error: "No se pudo guardar el precio." };
  }

  await logActivity({ action: "definir_precio_cristal", entity_type: "lens_catalog_price", details: { lensTypeId, materialId, colorId, price } });
  revalidatePath("/configuracion/cristales");
  revalidatePath("/cotizaciones/nueva");
  revalidatePath("/ventas/nueva");
  return { error: "" };
}
