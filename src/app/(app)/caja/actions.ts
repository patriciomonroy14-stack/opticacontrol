"use server";

import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import { isAdmin, todayCL, type PaymentMethod } from "@/lib/types";
import { computeDay } from "@/lib/cash";
import { getSession } from "@/lib/session";

type ActionState = { error: string; ok?: boolean };
const METHODS: PaymentMethod[] = ["efectivo", "transferencia", "debito", "credito", "otro"];
const CATEGORIES = ["general", "proveedor", "laboratorio", "sueldos", "arriendo", "servicios", "retiro"];

function revalidateCash() {
  revalidatePath("/caja");
  revalidatePath("/panel");
}

async function openClosing(supabase: Awaited<ReturnType<typeof getSession>>["supabase"], date: string) {
  const { data } = await supabase.from("cash_closings").select("*").eq("closing_date", date).maybeSingle();
  return data;
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede registrar gastos." };

  const date = String(formData.get("expense_date") || "");
  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "efectivo") as PaymentMethod;
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "general");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };
  if (!(amount > 0)) return { error: "Ingresa un monto mayor a cero." };
  if (!description) return { error: "Describe el gasto." };
  if (!METHODS.includes(method)) return { error: "Medio de pago no válido." };
  if (!CATEGORIES.includes(category)) return { error: "Categoría no válida." };

  const closing = await openClosing(supabase, date);
  if (closing && !closing.reopened_at) return { error: "La caja de este día está cerrada. Reábrela para agregar gastos." };

  const { error } = await supabase.from("cash_expenses").insert({ expense_date: date, amount, method, description, category });
  if (error) return { error: "No se pudo registrar el gasto." };

  await logActivity({ action: "registrar_gasto", entity_type: "cash_expense", details: { date, amount, method, description, category } });
  revalidateCash();
  return { error: "", ok: true };
}

/** Anula un gasto con motivo. No se borra: queda tachado y deja de sumar. */
export async function voidExpense(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede anular gastos." };
  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 4) return { error: "Escribe el motivo de la anulación." };

  const { data: expense } = await supabase.from("cash_expenses").select("id, expense_date, amount, description, voided_at, order_id").eq("id", id).maybeSingle();
  if (!expense) return { error: "No se encontró el gasto." };
  if (expense.voided_at) return { error: "El gasto ya está anulado." };
  const closing = await openClosing(supabase, expense.expense_date);
  if (closing && !closing.reopened_at) return { error: "La caja de ese día está cerrada. Reábrela para anular el gasto." };

  await supabase.from("cash_expenses").update({ voided_at: new Date().toISOString(), voided_by: user.id, void_reason: reason }).eq("id", id);
  // Si era el pago a un laboratorio, el pedido vuelve a quedar como "costo no pagado"
  if (expense.order_id) await supabase.from("orders").update({ lab_paid: false, lab_paid_at: null }).eq("id", expense.order_id);

  await logActivity({ action: "anular_gasto", entity_type: "cash_expense", entity_id: id, details: { monto: expense.amount, descripcion: expense.description, motivo: reason } });
  revalidateCash();
  revalidatePath("/ordenes");
  return { error: "", ok: true };
}

export async function closeDay(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede cerrar la caja." };

  const date = String(formData.get("closing_date") || "");
  const openingAmount = Number(formData.get("opening_amount") || 0);
  const countedRaw = String(formData.get("counted_cash") ?? "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };
  if (date > todayCL()) return { error: "No se puede cerrar un día que aún no llega." };
  if (countedRaw === "") return { error: "Ingresa el efectivo contado en caja." };
  const countedCash = Number(countedRaw);
  if (openingAmount < 0 || countedCash < 0) return { error: "Los montos no pueden ser negativos." };

  // Se recalcula en el servidor para que el cierre refleje los movimientos reales
  const day = await computeDay(supabase, date);
  const expectedCash = openingAmount + day.cashIncome - day.cashExpenses;
  const difference = countedCash - expectedCash;
  const values = {
    opening_amount: openingAmount,
    totals: {
      ingresos: day.income,
      gastos: day.spent,
      total_ingresos: day.totalIncome,
      total_gastos: day.totalExpenses,
      cantidad_pagos: day.payments.length,
    },
    expected_cash: expectedCash,
    counted_cash: countedCash,
    difference,
    notes,
  };

  const existing = await openClosing(supabase, date);
  if (existing && !existing.reopened_at) return { error: "La caja de este día ya fue cerrada." };

  if (existing) {
    // Nuevo cierre después de una reapertura: se actualiza y el cierre anterior queda en la auditoría
    const { error } = await supabase
      .from("cash_closings")
      .update({ ...values, closed_by: user.id, closed_at: new Date().toISOString(), reopened_at: null, reopened_by: null })
      .eq("id", existing.id);
    if (error) return { error: "No se pudo cerrar la caja." };
    await logActivity({
      action: "recerrar_caja",
      entity_type: "cash_closing",
      entity_id: existing.id,
      details: {
        date,
        cierre_anterior: { esperado: existing.expected_cash, contado: existing.counted_cash, diferencia: existing.difference, cerrado: existing.closed_at },
        cierre_nuevo: { esperado: expectedCash, contado: countedCash, diferencia: difference },
      },
    });
  } else {
    const { error } = await supabase.from("cash_closings").insert({ closing_date: date, ...values });
    if (error) return { error: error.message.includes("duplicate") ? "La caja de este día ya fue cerrada." : "No se pudo cerrar la caja." };
    await logActivity({ action: "cerrar_caja", entity_type: "cash_closing", details: { date, expectedCash, countedCash, difference } });
  }

  revalidateCash();
  return { error: "", ok: true };
}

/** Reabre una caja cerrada con motivo. El cierre no se borra: queda marcado y en la auditoría. */
export async function reopenDay(date: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return { error: "Solo la administradora puede reabrir la caja." };
  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 4) return { error: "Escribe el motivo de la reapertura." };

  const closing = await openClosing(supabase, date);
  if (!closing || closing.reopened_at) return { error: "La caja de este día no está cerrada." };

  const { error } = await supabase
    .from("cash_closings")
    .update({ reopened_at: new Date().toISOString(), reopened_by: user.id, reopen_reason: reason, times_reopened: (closing.times_reopened ?? 0) + 1 })
    .eq("id", closing.id);
  if (error) return { error: "No se pudo reabrir la caja." };

  await logActivity({
    action: "reabrir_caja",
    entity_type: "cash_closing",
    entity_id: closing.id,
    details: { date, motivo: reason, cierre: { esperado: closing.expected_cash, contado: closing.counted_cash, diferencia: closing.difference } },
  });
  revalidateCash();
  return { error: "", ok: true };
}
