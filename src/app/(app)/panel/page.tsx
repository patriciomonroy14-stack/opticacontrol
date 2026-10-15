import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { canSeeFinance, chileDay, formatCLP, todayCL, EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";
import { getSession } from "@/lib/session";
import { computeProfit } from "@/lib/profit";
import { computeDay } from "@/lib/cash";
import { MonthChart } from "./MonthChart";

const MONTHS = 12;
const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthKeys(today: string) {
  const [y, m] = today.split("-").map(Number);
  const keys: string[] = [];
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

function Stat({ label, value, hint, tone = "ink" }: { label: string; value: string; hint?: string; tone?: "ink" | "green" | "amber" | "red" }) {
  const color = { ink: "var(--oc-blue-950)", green: "var(--oc-green)", amber: "var(--oc-amber)", red: "var(--oc-red)" }[tone];
  return (
    <Card className="p-4">
      <p className="text-xs text-[var(--oc-slate-500)]">{label}</p>
      <p className="font-display font-bold text-xl tabular-nums mt-1" style={{ color }}>{value}</p>
      {hint && <p className="text-[11px] text-[var(--oc-slate-500)] mt-0.5">{hint}</p>}
    </Card>
  );
}

export default async function PanelPage() {
  const { supabase, user, role } = await getSession();
  if (!user) redirect("/login");
  if (!canSeeFinance(role)) redirect("/dashboard");

  const today = todayCL();
  const keys = monthKeys(today);
  const thisMonth = today.slice(0, 7);
  const prevMonth = keys[keys.length - 2];
  // Semana actual: desde el lunes
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const weekStart = new Date(`${today}T12:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - dow);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const windowStart = new Date(`${keys[0]}-01T00:00:00Z`);
  windowStart.setUTCDate(windowStart.getUTCDate() - 1);

  const [{ data: sales }, { data: payments }, { data: expenses }, { data: debts }, { data: orders }, { data: frames }, cashToday, { data: closingToday }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total, sale_date, frame_cost, lens_cost, other_costs, client_owns_frame, voided_at, sale_filters(cost), orders(lab_cost)")
      .gte("sale_date", windowStart.toISOString())
      .limit(5000),
    supabase.from("sale_payments").select("amount, method, paid_at").gte("paid_at", windowStart.toISOString()).limit(10000),
    supabase.from("cash_expenses").select("amount, category, expense_date, voided_at").gte("expense_date", `${keys[0]}-01`).is("voided_at", null).limit(5000),
    supabase.from("sales").select("total, amount_paid, payment_due_date, estimated_delivery").neq("payment_status", "pagado").is("voided_at", null).limit(5000),
    supabase.from("orders").select("status, lab_promised_date, lab_received_at, sales(estimated_delivery, voided_at)").not("status", "in", "(entregado,cancelado)").limit(5000),
    supabase.from("frames").select("id, code, brand, model, stock, reserved, purchase_price").neq("status", "baja").limit(2000),
    computeDay(supabase, today),
    supabase.from("cash_closings").select("difference, reopened_at").eq("closing_date", today).maybeSingle(),
  ]);

  // --- Por mes ---
  const months = new Map(keys.map((k) => [k, { ventas: 0, recaudado: 0, gastos: 0, utilidad: 0, n: 0 }]));
  let salesToday = 0, salesWeek = 0;
  for (const s of (sales as any[]) || []) {
    if (s.voided_at) continue;
    const day = chileDay(s.sale_date);
    const m = months.get(day.slice(0, 7));
    const total = Number(s.total);
    if (day === today) salesToday += total;
    if (day >= weekStartStr) salesWeek += total;
    if (!m) continue;
    const p = computeProfit({
      total: s.total,
      frame_cost: s.frame_cost,
      lens_cost: s.lens_cost,
      other_costs: s.other_costs,
      client_owns_frame: s.client_owns_frame,
      filters_cost: (s.sale_filters || []).reduce((a: number, f: any) => a + Number(f.cost || 0), 0),
      lab_cost: s.orders?.[0]?.lab_cost,
    });
    m.ventas += total;
    m.utilidad += p.profit;
    m.n += 1;
  }
  let collectedToday = 0, collectedWeek = 0;
  const byMethodMonth: Record<string, number> = {};
  for (const p of payments || []) {
    const day = chileDay(p.paid_at);
    const amount = Number(p.amount);
    if (day === today) collectedToday += amount;
    if (day >= weekStartStr) collectedWeek += amount;
    if (day.startsWith(thisMonth)) byMethodMonth[p.method] = (byMethodMonth[p.method] || 0) + amount;
    const m = months.get(day.slice(0, 7));
    if (m) m.recaudado += amount;
  }
  const expensesByCategory: Record<string, number> = {};
  for (const e of expenses || []) {
    const m = months.get(e.expense_date.slice(0, 7));
    if (m) m.gastos += Number(e.amount);
    if (e.expense_date.startsWith(thisMonth)) expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
  }

  const cur = months.get(thisMonth)!;
  const prev = months.get(prevMonth)!;
  const change = prev.ventas > 0 ? ((cur.ventas - prev.ventas) / prev.ventas) * 100 : null;
  const margin = cur.ventas > 0 ? (cur.utilidad / cur.ventas) * 100 : 0;

  // --- Cobranza ---
  const debtList = (debts || []).map((d) => ({ balance: Math.max(Number(d.total) - Number(d.amount_paid), 0), due: d.payment_due_date ?? d.estimated_delivery }));
  const totalDebt = debtList.reduce((a, d) => a + d.balance, 0);
  const overdueDebt = debtList.filter((d) => d.due && d.due < today).reduce((a, d) => a + d.balance, 0);

  // --- Pedidos ---
  const openOrders = ((orders as any[]) || []).filter((o) => !o.sales?.voided_at);
  const inProduction = openOrders.filter((o) => o.status !== "listo_para_entregar").length;
  const ready = openOrders.filter((o) => o.status === "listo_para_entregar").length;
  const late = openOrders.filter(
    (o) => (o.lab_promised_date && !o.lab_received_at && o.lab_promised_date < today) || (o.sales?.estimated_delivery && o.sales.estimated_delivery < today),
  ).length;

  // --- Inventario ---
  const inv = (frames || []).map((f) => ({ ...f, available: f.stock - (f.reserved || 0) }));
  const units = inv.reduce((a, f) => a + f.stock, 0);
  const invValue = inv.reduce((a, f) => a + f.stock * Number(f.purchase_price || 0), 0);
  const lowStock = inv.filter((f) => f.available <= 1).sort((a, b) => a.available - b.available);

  // --- Caja de hoy ---
  const cashState = closingToday && !closingToday.reopened_at ? (Number(closingToday.difference) === 0 ? "Cerrada y cuadrada" : "Cerrada con diferencia") : "Abierta";

  const chartData = keys.map((k) => ({ label: `${MONTH_NAMES[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`, ventas: months.get(k)!.ventas, recaudado: months.get(k)!.recaudado }));

  return (
    <div>
      <PageHeader title="Panel administrativo" description="Ventas, recaudación, deudas, gastos, rentabilidad, pedidos e inventario" />

      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--oc-slate-500)] mb-2">Ventas (montos vendidos)</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Hoy" value={formatCLP(salesToday)} />
        <Stat label="Esta semana" value={formatCLP(salesWeek)} />
        <Stat label="Este mes" value={formatCLP(cur.ventas)} hint={`${cur.n} ${cur.n === 1 ? "venta" : "ventas"}`} />
        <Stat
          label="vs. mes anterior"
          value={change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`}
          hint={`${MONTH_NAMES[Number(prevMonth.slice(5)) - 1]}: ${formatCLP(prev.ventas)}`}
          tone={change == null ? "ink" : change >= 0 ? "green" : "red"}
        />
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--oc-slate-500)] mb-2">Recaudación efectiva (dinero recibido)</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Hoy" value={formatCLP(collectedToday)} tone="green" />
        <Stat label="Esta semana" value={formatCLP(collectedWeek)} tone="green" />
        <Stat label="Este mes" value={formatCLP(cur.recaudado)} tone="green" />
        <Stat label="Caja de hoy" value={cashState} hint={`Efectivo recibido hoy: ${formatCLP(cashToday.cashIncome)}`} tone={cashState === "Abierta" ? "amber" : cashState.includes("cuadrada") ? "green" : "red"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Rentabilidad estimada del mes</h3>
          <p className="text-[11px] text-[var(--oc-slate-500)] mb-3">Ganancia de lo vendido, no dinero en caja.</p>
          <p className={`font-display font-bold text-2xl tabular-nums ${cur.utilidad >= 0 ? "text-[var(--oc-green)]" : "text-[var(--oc-red)]"}`}>{formatCLP(cur.utilidad)}</p>
          <p className="text-sm text-[var(--oc-slate-700)] mt-1">Margen bruto {margin.toFixed(1)}%</p>
          <p className="text-[11px] text-[var(--oc-slate-500)] mt-2">Ventas − costo de armazones, cristales/laboratorio y otros costos directos.</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-[var(--oc-blue-950)]">Cuentas por cobrar</h3>
            <Link href="/cobranza" className="text-xs font-medium text-[var(--oc-blue-700)]">Ver</Link>
          </div>
          <p className="font-display font-bold text-2xl tabular-nums text-[var(--oc-amber)]">{formatCLP(totalDebt)}</p>
          <p className="text-sm text-[var(--oc-red)] mt-1">Vencido: {formatCLP(overdueDebt)}</p>
          <p className="text-[11px] text-[var(--oc-slate-500)] mt-2">{debtList.length} {debtList.length === 1 ? "venta con saldo" : "ventas con saldo"}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-[var(--oc-blue-950)]">Gastos y proveedores del mes</h3>
            <Link href="/caja" className="text-xs font-medium text-[var(--oc-blue-700)]">Caja</Link>
          </div>
          <p className="font-display font-bold text-2xl tabular-nums text-[var(--oc-red)]">{formatCLP(cur.gastos)}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <li key={k} className="flex justify-between text-[var(--oc-slate-700)]"><span>{EXPENSE_CATEGORY_LABELS[k] ?? k}</span><span className="tabular-nums">{formatCLP(v)}</span></li>
            ))}
            {Object.keys(expensesByCategory).length === 0 && <li className="text-[var(--oc-slate-500)]">Sin gastos registrados.</li>}
          </ul>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Comparación de los últimos 12 meses</h3>
        <p className="text-xs text-[var(--oc-slate-500)] mb-4">Ventas (lo vendido) frente a lo efectivamente recaudado cada mes.</p>
        <MonthChart data={chartData} />
        <details className="mt-4">
          <summary className="text-sm font-medium text-[var(--oc-blue-700)] cursor-pointer">Ver tabla por mes</summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-2 font-medium">Mes</th>
                  <th className="py-2 font-medium text-right">Ventas</th>
                  <th className="py-2 font-medium text-right">Recaudado</th>
                  <th className="py-2 font-medium text-right">Gastos</th>
                  <th className="py-2 font-medium text-right">Utilidad estimada</th>
                  <th className="py-2 font-medium text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                {[...keys].reverse().map((k) => {
                  const m = months.get(k)!;
                  return (
                    <tr key={k} className="border-b border-[var(--oc-slate-100)] last:border-0">
                      <td className="py-1.5 capitalize">{MONTH_NAMES[Number(k.slice(5)) - 1]} {k.slice(0, 4)}</td>
                      <td className="py-1.5 text-right">{formatCLP(m.ventas)}</td>
                      <td className="py-1.5 text-right">{formatCLP(m.recaudado)}</td>
                      <td className="py-1.5 text-right">{formatCLP(m.gastos)}</td>
                      <td className="py-1.5 text-right">{formatCLP(m.utilidad)}</td>
                      <td className="py-1.5 text-right">{m.ventas > 0 ? `${((m.utilidad / m.ventas) * 100).toFixed(1)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-[var(--oc-blue-950)]">Pedidos</h3>
            <Link href="/ordenes" className="text-xs font-medium text-[var(--oc-blue-700)]">Ver</Link>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>En fabricación / pendientes</span><span className="font-semibold">{inProduction}</span></li>
            <li className="flex justify-between"><span>Listos para entregar</span><span className="font-semibold text-[var(--oc-amber)]">{ready}</span></li>
            <li className="flex justify-between">
              <span className="flex items-center gap-1">{late > 0 && <AlertTriangle className="h-3.5 w-3.5 text-[var(--oc-red)]" />} Atrasados</span>
              <span className={`font-semibold ${late > 0 ? "text-[var(--oc-red)]" : ""}`}>{late}</span>
            </li>
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--oc-blue-950)] mb-3">Recaudación del mes por medio</h3>
          <ul className="space-y-1.5 text-sm">
            {(["efectivo", "transferencia", "debito", "credito", "otro"] as PaymentMethod[]).filter((m) => byMethodMonth[m]).map((m) => (
              <li key={m} className="flex justify-between text-[var(--oc-slate-700)]"><span>{PAYMENT_METHOD_LABELS[m]}</span><span className="tabular-nums">{formatCLP(byMethodMonth[m])}</span></li>
            ))}
            {Object.keys(byMethodMonth).length === 0 && <li className="text-[var(--oc-slate-500)]">Sin pagos este mes.</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-[var(--oc-blue-950)]">Inventario</h3>
            <Link href="/armazones?filtro=bajo" className="text-xs font-medium text-[var(--oc-blue-700)]">Stock bajo</Link>
          </div>
          <p className="text-sm text-[var(--oc-slate-700)]">{units} unidades · valor al costo {formatCLP(invValue)}</p>
          <p className="text-xs font-semibold text-[var(--oc-slate-500)] mt-3 mb-1">Con 1 o ningún disponible</p>
          <ul className="space-y-1 text-sm">
            {lowStock.slice(0, 6).map((f) => (
              <li key={f.id} className="flex justify-between">
                <Link href={`/armazones/${f.id}`} className="text-[var(--oc-blue-800)] hover:underline truncate">{f.code} · {[f.brand, f.model].filter(Boolean).join(" ")}</Link>
                <span className={`tabular-nums font-semibold ${f.available <= 0 ? "text-[var(--oc-red)]" : "text-[var(--oc-amber)]"}`}>{f.available}</span>
              </li>
            ))}
            {lowStock.length === 0 && <li className="text-[var(--oc-slate-500)]">Todo con stock suficiente.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
