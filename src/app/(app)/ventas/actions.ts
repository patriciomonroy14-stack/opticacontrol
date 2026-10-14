"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { redirect } from "next/navigation";
import type { PurchaseType, PaymentMethod, PaymentStatus } from "@/lib/types";
import { getBaseLensPrice, priceSelectedFilters, type SelectedFilter, type PricedFilter } from "@/lib/lensPricing";

export async function createSale(_prevState: { error: string }, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const num = (key: string) => Number(formData.get(key) || 0);
  const str = (key: string) => {
    const v = String(formData.get(key) || "").trim();
    return v || null;
  };

  const framePrice = num("frame_price");
  const accessoriesAmount = num("accessories_amount");
  const discount = num("discount");
  const amountPaid = num("amount_paid");

  const lensTypeId = str("lens_type_id");
  const materialId = str("material_id");

  let lensPrice = 0;
  let pricedFilters: PricedFilter[] = [];

  if (lensTypeId && materialId) {
    const basePrice = await getBaseLensPrice(supabase, lensTypeId, materialId);
    if (basePrice == null) return { error: "No hay un precio configurado para ese cristal. Pide a un administrador que lo configure." };

    let selectedFilters: SelectedFilter[] = [];
    try {
      selectedFilters = JSON.parse(String(formData.get("filters_json") || "[]"));
    } catch {
      selectedFilters = [];
    }
    const filtersResult = await priceSelectedFilters(supabase, selectedFilters, materialId);
    if ("error" in filtersResult) return { error: filtersResult.error };

    lensPrice = basePrice + filtersResult.total;
    pricedFilters = filtersResult.filters;
  }

  const subtotal = framePrice + lensPrice + accessoriesAmount;
  const total = Math.max(subtotal - discount, 0);

  let paymentStatus: PaymentStatus = "pendiente";
  if (amountPaid >= total && total > 0) paymentStatus = "pagado";
  else if (amountPaid > 0) paymentStatus = "abono";

  const payload = {
    patient_id: String(formData.get("patient_id") || ""),
    seller_id: user?.id ?? null,
    prescription_id: str("prescription_id"),
    frame_id: str("frame_id"),
    lens_type_id: lensTypeId,
    lens_material_id: materialId,
    purchase_type: String(formData.get("purchase_type") || "otro") as PurchaseType,
    client_owns_frame: formData.get("client_owns_frame") === "on",
    accessories: str("accessories"),
    subtotal,
    discount,
    total,
    payment_method: (str("payment_method") as PaymentMethod) || null,
    payment_status: paymentStatus,
    amount_paid: amountPaid,
    notes: str("notes"),
  };

  if (!payload.patient_id) return { error: "Selecciona un paciente." };
  if (subtotal <= 0) return { error: "Ingresa al menos un producto con precio." };

  const { data, error } = await supabase.from("sales").insert(payload).select("id").single();
  if (error) {
    return { error: "No se pudo registrar la venta." };
  }

  if (pricedFilters.length > 0) {
    await supabase.from("sale_filters").insert(
      pricedFilters.map((f) => ({
        sale_id: data.id,
        filter_id: f.filter_id,
        filter_name: f.filter_name,
        color_id: f.color_id,
        color_name: f.color_name,
        price: f.price,
      }))
    );
  }

  await logActivity({ action: "crear_venta", entity_type: "sale", entity_id: data.id, details: { total, purchase_type: payload.purchase_type } });
  redirect(`/ventas`);
}
