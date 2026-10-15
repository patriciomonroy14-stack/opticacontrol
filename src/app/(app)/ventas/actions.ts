"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canSell, isAdmin, todayCL, type PurchaseType, type PaymentMethod, type OrderStatus } from "@/lib/types";
import { getBaseLensPrice, priceSelectedFilters, type SelectedFilter, type PricedFilter } from "@/lib/lensPricing";
import { findOrCreatePatient } from "@/lib/patients";
import { getSession, isCashClosed } from "@/lib/session";
import { deliverFrame, releaseFrame, reserveFrame, returnFrame } from "@/lib/inventory";

const METHODS: PaymentMethod[] = ["efectivo", "transferencia", "debito", "credito", "otro"];
const STATUSES: OrderStatus[] = ["venta_ingresada", "en_fabricacion", "listo_para_entregar", "entregado"];
const CLOSED_MSG = "La caja de hoy ya está cerrada. La administradora debe reabrirla para registrar pagos.";

type ActionState = { error: string; ok?: boolean };
type Supabase = Awaited<ReturnType<typeof createClient>>;

function revalidateMoney(saleId?: string) {
  revalidatePath("/ventas");
  if (saleId) revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/ordenes");
  revalidatePath("/cobranza");
  revalidatePath("/caja");
  revalidatePath("/panel");
  revalidatePath("/armazones");
  revalidatePath("/dashboard");
}

/** Saldo pendiente real de una venta, calculado desde los pagos (incluye reversos). */
async function getBalance(supabase: Supabase, saleId: string) {
  const [{ data: sale }, { data: payments }] = await Promise.all([
    supabase.from("sales").select("id, total, voided_at").eq("id", saleId).maybeSingle(),
    supabase.from("sale_payments").select("amount").eq("sale_id", saleId),
  ]);
  if (!sale) return null;
  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  return { total: Number(sale.total), paid, balance: Math.max(Number(sale.total) - paid, 0), voided: Boolean(sale.voided_at) };
}

async function getMaxDiscountPct(supabase: Supabase) {
  const { data } = await supabase.from("settings").select("value").eq("key", "policies").maybeSingle();
  const pct = Number((data?.value as { max_discount_pct?: number } | null)?.max_discount_pct);
  return Number.isFinite(pct) && pct >= 0 ? pct : 10;
}

export async function createSale(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  if (!canSell(role)) return { error: "Tu usuario no puede registrar ventas." };

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
  if (subtotal <= 0) return { error: "Ingresa al menos un producto con precio." };
  if (discount < 0 || discount > subtotal) return { error: "El descuento no es válido." };
  const total = subtotal - discount;

  // --- Descuento extraordinario: solo la administradora ---
  const maxPct = await getMaxDiscountPct(supabase);
  const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const extraordinary = discountPct > maxPct + 0.001;
  if (extraordinary && !isAdmin(role)) {
    return { error: `El descuento (${discountPct.toFixed(0)}%) supera el ${maxPct}% permitido. Solo la administradora puede aprobarlo.` };
  }

  // --- Abono inicial ---
  const initialPayment = num("initial_payment");
  const paymentMethod = str("payment_method") as PaymentMethod | null;
  if (initialPayment < 0) return { error: "El abono no puede ser negativo." };
  if (initialPayment > total) return { error: "El abono no puede ser mayor que el total de la venta." };
  if (initialPayment > 0 && (!paymentMethod || !METHODS.includes(paymentMethod))) {
    return { error: "Selecciona el medio de pago del abono." };
  }
  if (initialPayment > 0 && (await isCashClosed(supabase, todayCL()))) return { error: CLOSED_MSG };

  // --- Pedido ---
  const orderStatus = (str("order_status") || "en_fabricacion") as OrderStatus;
  if (!STATUSES.includes(orderStatus)) return { error: "Estado del pedido no válido." };
  const orderDate = str("order_date");
  const workOrderNumber = str("work_order_number");
  const frameId = str("frame_id");
  const clientOwnsFrame = formData.get("client_owns_frame") === "on";

  // --- Paciente ---
  const found = await findOrCreatePatient(supabase, String(formData.get("patient_name") || ""), str("patient_phone"), user.id);
  if ("error" in found) return { error: found.error };

  const payload = {
    patient_id: found.id,
    seller_id: user.id,
    sale_date: orderDate ? new Date(`${orderDate}T12:00:00Z`).toISOString() : new Date().toISOString(),
    prescription_id: str("prescription_id"),
    frame_id: clientOwnsFrame ? null : frameId,
    lens_type_id: lensTypeId,
    lens_material_id: materialId,
    lens_description: str("lens_description"),
    purchase_type: String(formData.get("purchase_type") || "otro") as PurchaseType,
    client_owns_frame: clientOwnsFrame,
    accessories: str("accessories"),
    subtotal,
    discount,
    total,
    payment_method: initialPayment > 0 ? paymentMethod : null,
    payment_status: "pendiente" as const,
    amount_paid: 0,
    estimated_delivery: str("estimated_delivery"),
    payment_due_date: str("payment_due_date") || str("estimated_delivery"),
    discount_approved_by: extraordinary ? user.id : null,
    notes: str("notes"),
    ...(workOrderNumber ? { work_order_number: workOrderNumber } : {}),
  };

  const { data: sale, error } = await supabase.from("sales").insert(payload).select("id, work_order_number").single();
  if (error || !sale) {
    if (error?.message.includes("work_order_number")) return { error: "Ese número de orden ya existe. Usa otro o déjalo vacío para asignarlo solo." };
    return { error: "No se pudo registrar la venta." };
  }

  // --- Reserva del armazón (evita vender dos veces la misma unidad) ---
  if (payload.frame_id) {
    const reserved = await reserveFrame(supabase, payload.frame_id, sale.id);
    if ("error" in reserved) {
      // La venta se anula de inmediato para no dejar un pedido sin armazón
      await supabase.from("sales").update({ voided_at: new Date().toISOString(), voided_by: user.id, void_reason: `Automática: ${reserved.error}` }).eq("id", sale.id);
      await supabase.from("orders").update({ status: "cancelado" }).eq("sale_id", sale.id);
      return { error: reserved.error };
    }
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
    if (orderStatus === "entregado" && payload.frame_id) await deliverFrame(supabase, payload.frame_id, sale.id);
  }

  await logActivity({
    action: "crear_venta",
    entity_type: "sale",
    entity_id: sale.id,
    details: {
      total,
      descuento: discount,
      descuento_extraordinario: extraordinary,
      abono_inicial: initialPayment,
      orden: sale.work_order_number,
    },
  });
  revalidateMoney(sale.id);
  redirect(`/ventas/${sale.id}`);
}

export async function addPayment(saleId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return { error: "Tu usuario no puede registrar pagos." };

  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "") as PaymentMethod;

  if (!(amount > 0)) return { error: "Ingresa un monto mayor a cero." };
  if (!METHODS.includes(method)) return { error: "Selecciona el medio de pago." };
  if (await isCashClosed(supabase, todayCL())) return { error: CLOSED_MSG };

  const info = await getBalance(supabase, saleId);
  if (!info) return { error: "No se encontró la venta." };
  if (info.voided) return { error: "Esta venta está anulada." };
  if (amount > info.balance) return { error: `El abono supera el saldo pendiente (${info.balance.toLocaleString("es-CL")}).` };

  const { error } = await supabase.from("sale_payments").insert({
    sale_id: saleId,
    amount,
    method,
    kind: amount === info.balance ? "pago_final" : "abono",
    notes: String(formData.get("notes") || "").trim() || null,
  });
  if (error) return { error: "No se pudo registrar el abono." };

  await logActivity({ action: "registrar_abono", entity_type: "sale", entity_id: saleId, details: { amount, method, saldo_restante: info.balance - amount } });
  revalidateMoney(saleId);
  return { error: "", ok: true };
}

export async function deliverOrder(saleId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return { error: "Tu usuario no puede registrar entregas." };

  const info = await getBalance(supabase, saleId);
  if (!info) return { error: "No se encontró la venta." };
  if (info.voided) return { error: "Esta venta está anulada." };

  const finalAmount = Number(formData.get("final_amount") || 0);
  const method = String(formData.get("method") || "") as PaymentMethod;
  const allowBalance = formData.get("allow_balance") === "on";
  const authorizedBy = String(formData.get("authorized_by") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;

  if (finalAmount < 0) return { error: "El monto no puede ser negativo." };
  if (finalAmount > info.balance) return { error: "El pago supera el saldo pendiente." };
  if (finalAmount > 0 && !METHODS.includes(method)) return { error: "Selecciona el medio de pago." };
  if (finalAmount > 0 && (await isCashClosed(supabase, todayCL()))) return { error: CLOSED_MSG };

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

  const { data: order } = await supabase.from("orders").select("status").eq("sale_id", saleId).maybeSingle();
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

  // El armazón reservado sale del stock al entregarse
  if (order?.status !== "entregado") {
    const { data: sale } = await supabase.from("sales").select("frame_id, client_owns_frame").eq("id", saleId).maybeSingle();
    if (sale?.frame_id && !sale.client_owns_frame) await deliverFrame(supabase, sale.frame_id, saleId);
  }

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
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return;
  await supabase.from("orders").update({ status }).eq("sale_id", saleId);
  await logActivity({ action: "actualizar_estado_orden", entity_type: "sale", entity_id: saleId, details: { status } });
  revalidateMoney(saleId);
}

export async function updateEstimatedDelivery(saleId: string, date: string) {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return;
  await supabase.from("sales").update({ estimated_delivery: date || null }).eq("id", saleId);
  await logActivity({ action: "cambiar_fecha_entrega", entity_type: "sale", entity_id: saleId, details: { estimated_delivery: date || null } });
  revalidateMoney(saleId);
}

export async function updatePaymentDueDate(saleId: string, date: string) {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return;
  await supabase.from("sales").update({ payment_due_date: date || null }).eq("id", saleId);
  await logActivity({ action: "cambiar_fecha_compromiso_pago", entity_type: "sale", entity_id: saleId, details: { payment_due_date: date || null } });
  revalidateMoney(saleId);
}

/* ------------------------------------------------------------------ */
/* Solo administradora: anulaciones trazables (nunca se borra nada)     */
/* ------------------------------------------------------------------ */

/** Reversa un pago con un movimiento negativo. El saldo y la caja se ajustan solos. */
export async function reversePayment(paymentId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede reversar pagos." };
  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 4) return { error: "Escribe el motivo del reverso." };
  if (await isCashClosed(supabase, todayCL())) return { error: "La caja de hoy está cerrada. Reábrela para registrar el reverso." };

  const { data: payment } = await supabase.from("sale_payments").select("id, sale_id, amount, method, reversal_of").eq("id", paymentId).maybeSingle();
  if (!payment) return { error: "No se encontró el pago." };
  if (payment.reversal_of || Number(payment.amount) <= 0) return { error: "Este movimiento ya es un reverso." };
  const { data: existing } = await supabase.from("sale_payments").select("id").eq("reversal_of", paymentId).limit(1);
  if (existing && existing.length) return { error: "Este pago ya fue reversado." };

  const { error } = await supabase.from("sale_payments").insert({
    sale_id: payment.sale_id,
    amount: -Number(payment.amount),
    method: payment.method,
    kind: "reverso",
    reversal_of: payment.id,
    void_reason: reason,
    notes: `Reverso: ${reason}`,
  });
  if (error) return { error: "No se pudo registrar el reverso." };

  await logActivity({ action: "reversar_pago", entity_type: "sale", entity_id: payment.sale_id, details: { pago: payment.id, monto: payment.amount, motivo: reason } });
  revalidateMoney(payment.sale_id);
  return { error: "", ok: true };
}

/** Anula una venta: reversa sus pagos (devolución de dinero), libera o devuelve el armazón y cancela el pedido. */
export async function voidSale(saleId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede anular ventas." };
  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 4) return { error: "Escribe el motivo de la anulación." };

  const { data: sale } = await supabase.from("sales").select("id, voided_at, frame_id, client_owns_frame, work_order_number").eq("id", saleId).maybeSingle();
  if (!sale) return { error: "No se encontró la venta." };
  if (sale.voided_at) return { error: "La venta ya está anulada." };

  const { data: payments } = await supabase.from("sale_payments").select("id, amount, method, reversal_of").eq("sale_id", saleId);
  const reversedIds = new Set((payments || []).filter((p) => p.reversal_of).map((p) => p.reversal_of));
  const toReverse = (payments || []).filter((p) => !p.reversal_of && Number(p.amount) > 0 && !reversedIds.has(p.id));
  if (toReverse.length && (await isCashClosed(supabase, todayCL()))) {
    return { error: "La caja de hoy está cerrada. Reábrela para registrar la devolución del dinero." };
  }

  for (const p of toReverse) {
    await supabase.from("sale_payments").insert({
      sale_id: saleId,
      amount: -Number(p.amount),
      method: p.method,
      kind: "reverso",
      reversal_of: p.id,
      void_reason: reason,
      notes: `Anulación de venta: ${reason}`,
    });
  }

  const { data: order } = await supabase.from("orders").select("status").eq("sale_id", saleId).maybeSingle();
  if (sale.frame_id && !sale.client_owns_frame) {
    if (order?.status === "entregado") await returnFrame(supabase, sale.frame_id, saleId, `Anulación: ${reason}`);
    else await releaseFrame(supabase, sale.frame_id, saleId, `Anulación: ${reason}`);
  }

  await supabase.from("orders").update({ status: "cancelado" }).eq("sale_id", saleId);
  await supabase.from("sales").update({ voided_at: new Date().toISOString(), voided_by: user.id, void_reason: reason }).eq("id", saleId);

  await logActivity({
    action: "anular_venta",
    entity_type: "sale",
    entity_id: saleId,
    details: { orden: sale.work_order_number, motivo: reason, pagos_reversados: toReverse.length, devuelto: toReverse.reduce((s, p) => s + Number(p.amount), 0) },
  });
  revalidateMoney(saleId);
  return { error: "", ok: true };
}

/** Costos directos adicionales de la venta (para rentabilidad). Solo administradora. */
export async function updateOtherCosts(saleId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede modificar costos." };
  const otherCosts = Number(formData.get("other_costs") || 0);
  const reason = String(formData.get("reason") || "").trim() || null;
  if (otherCosts < 0) return { error: "El costo no puede ser negativo." };
  const { data: before } = await supabase.from("sales").select("other_costs").eq("id", saleId).maybeSingle();
  await supabase.from("sales").update({ other_costs: otherCosts }).eq("id", saleId);
  await logActivity({ action: "modificar_costos_venta", entity_type: "sale", entity_id: saleId, details: { antes: before?.other_costs ?? 0, despues: otherCosts, motivo: reason } });
  revalidateMoney(saleId);
  return { error: "", ok: true };
}
