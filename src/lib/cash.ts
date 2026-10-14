import type { SupabaseClient } from "@supabase/supabase-js";
import { chileDay } from "@/lib/types";

/** Suma los movimientos de un día (hora de Chile). */
export async function computeDay(supabase: SupabaseClient, date: string) {
  const from = new Date(`${date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(`${date}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 2);

  const [{ data: rawPayments }, { data: expenses }] = await Promise.all([
    supabase
      .from("sale_payments")
      .select("id, amount, method, kind, paid_at, received_by, sales(id, work_order_number, patients(full_name))")
      .gte("paid_at", from.toISOString())
      .lt("paid_at", to.toISOString())
      .order("paid_at"),
    supabase.from("cash_expenses").select("id, amount, method, description, created_at, created_by").eq("expense_date", date).order("created_at"),
  ]);

  const payments = (rawPayments || []).filter((p) => chileDay(p.paid_at) === date);
  const income: Record<string, number> = {};
  for (const p of payments) income[p.method] = (income[p.method] || 0) + Number(p.amount);
  const spent: Record<string, number> = {};
  for (const e of expenses || []) spent[e.method] = (spent[e.method] || 0) + Number(e.amount);

  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  const totalExpenses = Object.values(spent).reduce((a, b) => a + b, 0);

  return {
    payments,
    expenses: expenses || [],
    income,
    spent,
    totalIncome,
    totalExpenses,
    cashIncome: income.efectivo || 0,
    cashExpenses: spent.efectivo || 0,
  };
}

