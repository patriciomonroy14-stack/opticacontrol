"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PurchaseType, PaymentMethod, OrderStatus } from "@/lib/types";
import { getBaseLensPrice, priceSelectedFilters, type SelectedFilter, type PricedFilter } from "@/lib/lensPricing";
import { findOrCreatePatient } from "@/lib/patients";

const METHODS: PaymentMethod[] = ["efectivo", "transferencia", "debito", "credito", "otro"];
const STATUSES: OrderStatus[] = ["venta_ingresada", "en_fabricacion", "listo_para_entregar", "entregado"];

type ActionState = { error: string; ok?: boolean };

function revalidateMoney(saleId?: string) {
  revalidatePath("/ventas");
  if (saleId) revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/ordenes");
  revalidatePath("/caja");
  revalidatePath("/dashboard");
}

/** Saldo pendiente real de una venta, calculado desde los pagos registrados. */
async function getBalance(supabase: Awaited<ReturnType<typeof createClient>>, saleId: string) {
  const [{ data: sale }, { data: payments }] = await Promise.all([
    supabase.from("sales").select("id, total").eq("id", saleId).maybeSingle(),
    supabase.from("sale_payments").select("amount").eq("sale_id", saleId),
  ]);
  if (!sale) return null;
  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  return { total: Number(sale.total), paid, balance: Math.max(Number(sale.total) - paid, 0) };
}

export async function createSale(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const num = (key: string) => Number(formData.get(key) || 0);
  const str = (key: string) => {
    const v = String(formData.get(key) || "").trim();
    return v || null;
  };

  // --- Precio ---
  const framePrice = num("frame_price");
  const accessoriesAmount = num("accessories_amount");
  const discount = num("discount");

  const lensTypeId = str("lens_type_id");
  const materialId = str("material_id");
  const manualLensPrice = num("manual_lens_price");

  let lensPrice = 0;
  let pricedFilters: PricedFilter[] = [];

  if (lensTypeId && materialId) {
    const basePrice = await getBaseLensPrice(supabase, lensTypeId, materialId);
    if (basePrice == null) return { error: "No hay un precio configurado para ese cristal. Usa \"Precio manual del cristal\" o pide que lo configuren." };

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
  } else if (manualLensPrice > 0) {
    lensPrice = manualLensPrice;
  }

  const subtotal = framePrice + lensPrice + accessoriesAmount;
  const total = Math.max(subtotal - discount, 0);
  if (subtotal <= 0) return { error: "Ingresa al menos un producto con precio." };

  // --- Abono inicial ---
  const initialPayment = num("initial_payment");
  const paymentMethod = str("payment_method") as PaymentMethod | null;
  if (initialPayment < 0) return { error: "El abono no puede ser negativo." };
  if (initialPayment > total) return { error: "El abono no puede ser mayor que el total de la venta." };
  if (initialPayment > 0 && (!paymentMethod || !METHODS.includes(paymentMethod))) {
    return { error: "Selecciona el medio de pago del abono." };
  }

  // --- Pedido ---
  const orderStatus = (str("order_status") || "en_fabricacion") as OrderStatus;
  if (!STATUSES.includes(orderStatus)) return { error: "Estado del pedido no válido." };
  const orderDate = str("order_date");
  const estimatedDelivery = str("estimated_delivery");
  const workOrderNumber = str("work_order_number");

  // --- Paciente ---
  const found = await findOrCreatePatient(supabase, String(formData.get("patient_name") || ""), str("patient_phone"), user.id);
  if ("error" in found) return { error: found.error };

  const payload = {
    patient_id: found.id,
    seller_id: user.id,
    sale_date: orderDate ? new Date(`${orderDate}T12:00:00Z`).toISOString() : new Date().toISOString(),
    prescription_id: str("prescription_id"),
    frame_id: str("frame_id"),
    lens_type_id: lensTypeId,
    lens_material_id: materialId,
    lens_description: str("lens_description"),
    purchase_type: String(formData.get("purchase_type") || "otro") as PurchaseType,
    client_owns_frame: formData.get("client_owns_frame") === "on",
    accessories: str("accessories"),
    subtotal,
    discount,
    total,
    payment_method: initialPayment > 0 ? paymentMethod : null,
    payment_status: "pendiente" as const,
    amount_paid: 0,
    estimated_delivery: estimatedDelivery,
    notes: str("notes"),
    ...(workOrderNumber ? { work_order_number: workOrderNumber } : {}),
  };

  const { data: sale, error } = await supabase.from("sales").insert(payload).select("id, work_order_number").single();
  if (error || !sale) {
    if (error?.message.includes("work_order_number")) return { error: "Ese número de orden ya existe. Usa otro o déjalo vacío para asignarlo solo." };
    return { error: "No se pudo registrar la venta." };
  }

  if (pricedFilters.length > 0) {
    await supabase.from("sale_filters").insert(
      pricedFilters.map((f) => ({
        sale_id: sale.id,
        filter_id: f.filter_id,
        filter_name: f.filter_name,
        color_id: f.color_id,
        color_name: f.color_name,
        price: f.price,
      })),
    );
  }

  // El abono inicial entra a la caja del día en que se recibe (hoy)
  if (initialPayment > 0) {
    const { error: payError } = await supabase.from("sale_payments").insert({
      sale_id: sale.id,
      amount: initialPayment,
      method: paymentMethod,
      kind: "inicial",
    });
    if (payError) return { error: "La venta se guardó, pero no se pudo registrar el abono. Regístralo desde el detalle de la venta." };
  }

  // La orden se crea automáticamente; se ajusta su estado
  if (orderStatus !== "venta_ingresada") {
    const balance = total - initialPayment;
    await supabase
      .from("orders")
      .update({
        status: orderStatus,
        ...(orderStatus === "entregado"
          ? { delivered_at: new Date().toISOString(), delivered_by: user.id, balance_at_delivery: balance }
          : {}),
      })
      .eq("sale_id", sale.id);
  }

  await logActivity({
    action: "crear_venta",
    entity_type: "sale",
    entity_id: sale.id,
    details: { total, abono_inicial: initialPayment, orden: sale.work_order_number },
  });
  revalidateMoney(sale.id);
  redirect(`/ventas/${sale.id}`);
}

export async function addPayment(saleId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "") as PaymentMethod;

  if (!(amount > 0)) return { error: "Ingresa un monto mayor a cero." };
  if (!METHODS.includes(method)) return { error: "Selecciona el medio de pago." };

  const info = await getBalance(supabase, saleId);
  if (!info) return { error: "No se encontró la venta." };
  if (amount > info.balance) return { error: `El abono supera el saldo pendiente (${info.balance.toLocaleString("es-CL")}).` };

  const { error } = await supabase.from("sale_payments").insert({
    sale_id: saleId,
    amount,
    method,
    kind: amount === info.balance ? "pago_final" : "abono",
    notes: String(formData.get("notes") || "").trim() || null,
  });
  if (error) return { error: "No se pudo registrar el abono." };

  await logActivity({ action: "registrar_abono", entity_type: "sale", entity_id: saleId, details: { amount, method } });
  revalidateMoney(saleId);
  return { error: "", ok: true };
}

export async function deliverOrder(saleId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const info = await getBalance(supabase, saleId);
  if (!info) return { error: "No se encontró la venta." };

  const finalAmount = Number(formData.get("final_amount") || 0);
  const method = String(formData.get("method") || "") as PaymentMethod;
  const allowBalance = formData.get("allow_balance") === "on";
  const authorizedBy = String(formData.get("authorized_by") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;

  if (finalAmount < 0) return { error: "El monto no puede ser negativo." };
  if (finalAmount > info.balance) return { error: "El pago supera el saldo pendiente." };
  if (finalAmount > 0 && !METHODS.includes(method)) return { error: "Selecciona el medio de pago." };

  const remaining = info.balance - finalAmount;
  if (remaining > 0) {
    if (!allowBalance) return { error: "Queda saldo pendiente. Marca la confirmación para entregar con deuda." };
    if (!authorizedBy) return { error: "Indica quién autorizó la entrega con saldo pendiente." };
  }

  if (finalAmount > 0) {
    const { error: payError } = await supabase.from("sale_payments").insert({
      sale_id: saleId,
      amount: finalAmount,
      method,
      kind: remaining === 0 ? "pago_final" : "abono",
      notes: "Pago al retirar",
    });
    if (payError) return { error: "No se pudo registrar el pago." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "entregado",
      delivered_at: new Date().toISOString(),
      delivered_by: user.id,
      balance_at_delivery: remaining,
      delivery_authorized_by: remaining > 0 ? authorizedBy : null,
      delivery_note: note,
    })
    .eq("sale_id", saleId);
  if (error) return { error: "El pago se registró, pero no se pudo marcar la entrega." };

  await logActivity({
    action: "entregar_pedido",
    entity_type: "sale",
    entity_id: saleId,
    details: { pago: finalAmount, saldo_pendiente: remaining, autorizado_por: remaining > 0 ? authorizedBy : null },
  });
  revalidateMoney(saleId);
  return { error: "", ok: true };
}

export async function setOrderStatus(saleId: string, status: OrderStatus) {
  if (!STATUSES.includes(status) || status === "entregado") return;
  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("sale_id", saleId);
  await logActivity({ action: "actualizar_estado_orden", entity_type: "sale", entity_id: saleId, details: { status } });
  revalidateMoney(saleId);
}

export async function updateEstimatedDelivery(saleId: string, date: string) {
  const supabase = await createClient();
  await supabase.from("sales").update({ estimated_delivery: date || null }).eq("id", saleId);
  revalidateMoney(saleId);
}
