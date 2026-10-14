"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PurchaseType, PaymentStatus } from "@/lib/types";
import { getBaseLensPrice, priceSelectedFilters, type SelectedFilter } from "@/lib/lensPricing";

export type QuoteFormState = { error: string };

export async function createQuote(_prevState: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const num = (key: string) => {
    const v = formData.get(key);
    return v && String(v).trim() !== "" ? Number(v) : null;
  };
  const str = (key: string) => {
    const v = String(formData.get(key) || "").trim();
    return v || null;
  };

  const lensTypeId = str("lens_type_id");
  const materialId = str("material_id");

  if (!lensTypeId || !materialId) {
    return { error: "Selecciona tipo y material del cristal." };
  }

  const basePrice = await getBaseLensPrice(supabase, lensTypeId, materialId);
  if (basePrice == null) {
    return { error: "No hay un precio configurado para esa combinación. Pide a un administrador que lo configure en Configuración → Catálogo de cristales." };
  }

  let selectedFilters: SelectedFilter[] = [];
  try {
    selectedFilters = JSON.parse(String(formData.get("filters_json") || "[]"));
  } catch {
    selectedFilters = [];
  }

  const filtersResult = await priceSelectedFilters(supabase, selectedFilters, materialId);
  if ("error" in filtersResult) return { error: filtersResult.error };

  const lensPrice = basePrice + filtersResult.total;
  const framePrice = Number(formData.get("frame_price") || 0);
  const discount = Number(formData.get("discount") || 0);
  const total = Math.max(framePrice + lensPrice - discount, 0);

  const payload = {
    patient_id: str("patient_id"),
    walkin_name: str("walkin_name"),
    od_sphere: num("od_sphere"),
    od_cylinder: num("od_cylinder"),
    od_axis: num("od_axis"),
    oi_sphere: num("oi_sphere"),
    oi_cylinder: num("oi_cylinder"),
    oi_axis: num("oi_axis"),
    addition: num("addition"),
    frame_id: str("frame_id"),
    client_owns_frame: formData.get("client_owns_frame") === "on",
    lens_type_id: lensTypeId,
    lens_material_id: materialId,
    frame_price: framePrice,
    lens_price: lensPrice,
    discount,
    total,
    notes: str("notes"),
    created_by: user?.id ?? null,
  };

  if (!payload.patient_id && !payload.walkin_name) {
    return { error: "Selecciona un paciente o ingresa un nombre." };
  }

  const { data, error } = await supabase.from("quotes").insert(payload).select("id").single();
  if (error) return { error: "No se pudo guardar la cotización." };

  if (filtersResult.filters.length > 0) {
    await supabase.from("quote_filters").insert(
      filtersResult.filters.map((f) => ({
        quote_id: data.id,
        filter_id: f.filter_id,
        filter_name: f.filter_name,
        color_id: f.color_id,
        color_name: f.color_name,
        price: f.price,
      }))
    );
  }

  await logActivity({ action: "crear_cotizacion", entity_type: "quote", entity_id: data.id });
  redirect("/cotizaciones");
}

export async function convertQuoteToSale(quoteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
  if (!quote || !quote.patient_id) return;

  const { data: quoteFilters } = await supabase.from("quote_filters").select("*").eq("quote_id", quoteId);

  const purchaseType: PurchaseType = quote.frame_id || quote.client_owns_frame ? "armazon_cristales" : "solo_cristales";
  const total = Number(quote.total);
  const paymentStatus: PaymentStatus = "pendiente";

  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      patient_id: quote.patient_id,
      seller_id: user?.id ?? null,
      frame_id: quote.frame_id,
      lens_type_id: quote.lens_type_id,
      lens_material_id: quote.lens_material_id,
      purchase_type: purchaseType,
      client_owns_frame: quote.client_owns_frame,
      subtotal: Number(quote.frame_price) + Number(quote.lens_price),
      discount: Number(quote.discount),
      total,
      payment_status: paymentStatus,
      amount_paid: 0,
      notes: `Convertida desde cotización · ${quote.notes || ""}`,
    })
    .select("id")
    .single();

  if (error || !sale) return;

  if (quoteFilters && quoteFilters.length > 0) {
    await supabase.from("sale_filters").insert(
      quoteFilters.map((f) => ({
        sale_id: sale.id,
        filter_id: f.filter_id,
        filter_name: f.filter_name,
        color_id: f.color_id,
        color_name: f.color_name,
        price: f.price,
      }))
    );
  }

  await supabase.from("quotes").update({ status: "convertida", converted_sale_id: sale.id }).eq("id", quoteId);
  await logActivity({ action: "convertir_cotizacion_venta", entity_type: "quote", entity_id: quoteId, details: { sale_id: sale.id } });
  revalidatePath("/cotizaciones");
  redirect("/ventas");
}

export async function updateQuoteStatus(quoteId: string, status: "rechazada" | "vencida" | "pendiente") {
  const supabase = await createClient();
  await supabase.from("quotes").update({ status }).eq("id", quoteId);
  await logActivity({ action: "actualizar_estado_cotizacion", entity_type: "quote", entity_id: quoteId, details: { status } });
  revalidatePath("/cotizaciones");
}
