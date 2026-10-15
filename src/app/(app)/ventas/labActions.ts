"use server";

import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import { canSell, isAdmin, todayCL, type PaymentMethod } from "@/lib/types";
import { getSession, isCashClosed } from "@/lib/session";

type ActionState = { error: string; ok?: boolean };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateOrder(saleId: string) {
  revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/ventas");
  revalidatePath("/ordenes");
  revalidatePath("/panel");
  revalidatePath("/caja");
  revalidatePath("/dashboard");
}

/** Seguimiento con el laboratorio: nombre, N° de pedido y fechas. */
export async function updateLabInfo(saleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return { error: "Tu usuario no puede modificar pedidos." };

  const str = (k: string) => String(formData.get(k) || "").trim() || null;
  const date = (k: string) => {
    const v = str(k);
    return v && DATE.test(v) ? v : null;
  };

  const values = {
    lab_name: str("lab_name"),
    lab_order_ref: str("lab_order_ref"),
    lab_sent_at: date("lab_sent_at"),
    lab_promised_date: date("lab_promised_date"),
    lab_received_at: date("lab_received_at"),
  };
  if (values.lab_received_at && values.lab_sent_at && values.lab_received_at < values.lab_sent_at) {
    return { error: "La fecha de recepción no puede ser anterior al envío." };
  }

  const { data: order } = await supabase.from("orders").select("id, status").eq("sale_id", saleId).maybeSingle();
  if (!order) return { error: "No se encontró el pedido." };
  if (order.status === "cancelado") return { error: "El pedido está anulado." };

  // El estado avanza solo según las fechas del laboratorio
  let status = order.status;
  if (status !== "entregado") {
    if (values.lab_received_at) status = "listo_para_entregar";
    else if (values.lab_sent_at && status === "venta_ingresada") status = "en_fabricacion";
  }

  const { error } = await supabase
    .from("orders")
    .update({
      ...values,
      status,
      arrived_at: values.lab_received_at ? new Date(`${values.lab_received_at}T12:00:00Z`).toISOString() : null,
    })
    .eq("id", order.id);
  if (error) return { error: "No se pudo guardar el seguimiento." };

  await logActivity({ action: "actualizar_laboratorio", entity_type: "sale", entity_id: saleId, details: { ...values, estado: status } });
  revalidateOrder(saleId);
  return { error: "", ok: true };
}

/** Costo cobrado por el laboratorio y su pago. Solo administradora. */
export async function updateLabCost(saleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede registrar costos de laboratorio." };

  const costRaw = String(formData.get("lab_cost") ?? "").trim();
  const labCost = costRaw === "" ? null : Number(costRaw);
  const markPaid = formData.get("lab_paid") === "on";
  const registerInCash = formData.get("register_in_cash") === "on";
  const method = String(formData.get("method") || "transferencia") as PaymentMethod;

  if (labCost != null && (!Number.isFinite(labCost) || labCost < 0)) return { error: "El costo no es válido." };

  const { data: order } = await supabase.from("orders").select("id, lab_cost, lab_paid, lab_name, sales(work_order_number)").eq("sale_id", saleId).maybeSingle();
  if (!order) return { error: "No se encontró el pedido." };
  const orderNumber = (order.sales as unknown as { work_order_number: string | null } | null)?.work_order_number ?? "";

  if (markPaid && !order.lab_paid) {
    if (!(labCost && labCost > 0)) return { error: "Ingresa el costo antes de marcarlo como pagado." };
    if (registerInCash) {
      const today = todayCL();
      if (await isCashClosed(supabase, today)) return { error: "La caja de hoy está cerrada. Reábrela o desmarca \"registrar en caja\"." };
      const { error: expError } = await supabase.from("cash_expenses").insert({
        expense_date: today,
        amount: labCost,
        method,
        category: "laboratorio",
        description: `Laboratorio ${order.lab_name ?? ""} · orden ${orderNumber}`.trim(),
        order_id: order.id,
      });
      if (expError) return { error: "No se pudo registrar el pago en la caja." };
    }
  }
  if (!markPaid && order.lab_paid) {
    return { error: "Para deshacer un pago al laboratorio, anula el gasto correspondiente en la Caja diaria." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      lab_cost: labCost,
      lab_paid: markPaid,
      lab_paid_at: markPaid ? (order.lab_paid ? undefined : todayCL()) : null,
    })
    .eq("id", order.id);
  if (error) return { error: "No se pudo guardar el costo." };

  await logActivity({
    action: "actualizar_costo_laboratorio",
    entity_type: "sale",
    entity_id: saleId,
    details: { antes: order.lab_cost, despues: labCost, pagado: markPaid, en_caja: markPaid && !order.lab_paid ? registerInCash : null },
  });
  revalidateOrder(saleId);
  return { error: "", ok: true };
}
