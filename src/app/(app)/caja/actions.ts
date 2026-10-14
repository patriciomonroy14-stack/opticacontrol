"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import { canSeeFinance, type PaymentMethod } from "@/lib/types";
import { computeDay } from "@/lib/cash";

type ActionState = { error: string; ok?: boolean };
const METHODS: PaymentMethod[] = ["efectivo", "transferencia", "debito", "credito", "otro"];

async function getRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as string | null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, user, role: (profile?.role as string | undefined) ?? null };
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getRole();
  if (!user || !canSeeFinance(role)) return { error: "No tienes permiso para registrar gastos." };

  const date = String(formData.get("expense_date") || "");
  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "efectivo") as PaymentMethod;
  const description = String(formData.get("description") || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };
  if (!(amount > 0)) return { error: "Ingresa un monto mayor a cero." };
  if (!description) return { error: "Describe el gasto." };
  if (!METHODS.includes(method)) return { error: "Medio de pago no válido." };

  const { data: closing } = await supabase.from("cash_closings").select("id").eq("closing_date", date).maybeSingle();
  if (closing) return { error: "La caja de este día ya está cerrada. Un administrador debe reabrirla para agregar gastos." };

  const { error } = await supabase.from("cash_expenses").insert({ expense_date: date, amount, method, description });
  if (error) return { error: "No se pudo registrar el gasto." };

  await logActivity({ action: "registrar_gasto", entity_type: "cash_expense", details: { date, amount, method, description } });
  revalidatePath("/caja");
  return { error: "", ok: true };
}

export async function deleteExpense(id: string) {
  const { supabase, role } = await getRole();
  if (role !== "administrador") return;
  await supabase.from("cash_expenses").delete().eq("id", id);
  await logActivity({ action: "eliminar_gasto", entity_type: "cash_expense", entity_id: id });
  revalidatePath("/caja");
}

export async function closeDay(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, role } = await getRole();
  if (!user || !canSeeFinance(role)) return { error: "No tienes permiso para cerrar la caja." };

  const date = String(formData.get("closing_date") || "");
  const openingAmount = Number(formData.get("opening_amount") || 0);
  const countedRaw = String(formData.get("counted_cash") ?? "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };
  if (countedRaw === "") return { error: "Ingresa el efectivo contado en caja." };
  const countedCash = Number(countedRaw);
  if (openingAmount < 0 || countedCash < 0) return { error: "Los montos no pueden ser negativos." };

  // Se recalcula en el servidor para que el cierre refleje los movimientos reales
  const day = await computeDay(supabase, date);
  const expectedCash = openingAmount + day.cashIncome - day.cashExpenses;
  const difference = countedCash - expectedCash;

  const { error } = await supabase.from("cash_closings").insert({
    closing_date: date,
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
  });
  if (error) {
    if (error.message.includes("duplicate")) return { error: "La caja de este día ya fue cerrada." };
    return { error: "No se pudo cerrar la caja." };
  }

  await logActivity({ action: "cerrar_caja", entity_type: "cash_closing", details: { date, expectedCash, countedCash, difference } });
  revalidatePath("/caja");
  return { error: "", ok: true };
}

export async function reopenDay(date: string) {
  const { supabase, role } = await getRole();
  if (role !== "administrador") return;
  await supabase.from("cash_closings").delete().eq("closing_date", date);
  await logActivity({ action: "reabrir_caja", entity_type: "cash_closing", details: { date } });
  revalidatePath("/caja");
}
