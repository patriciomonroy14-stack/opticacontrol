import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import {
  canSeeFinance,
  formatCLP,
  formatDate,
  formatDateTime,
  formatTimeCL,
  todayCL,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/types";
import { computeDay } from "@/lib/cash";
import { CloseDayForm, ExpenseForm, PrintButton } from "./CajaControls";
import { ReasonAction } from "@/components/ReasonAction";
import { reopenDay, voidExpense } from "./actions";
import { getSession } from "@/lib/session";

const METHOD_ORDER: PaymentMethod[] = ["efectivo", "transferencia", "debito", "credito", "otro"];

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { fecha } = await searchParams;
  const { supabase, user, role } = await getSession();
  if (!user) redirect("/login");
  if (!canSeeFinance(role)) redirect("/dashboard");
  const isAdmin = role === "administrador";

  const today = todayCL();
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : today;

  const [day, { data: closingRow }, { data: previous }] = await Promise.all([
    computeDay(supabase, date),
    supabase.from("cash_closings").select("*").eq("closing_date", date).maybeSingle(),
    supabase.from("cash_closings").select("closing_date, counted_cash").lt("closing_date", date).order("closing_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Una caja reabierta se trata como abierta
  const closing = closingRow && !closingRow.reopened_at ? closingRow : null;
  const methods = METHOD_ORDER.filter((m) => day.income[m] || day.spent[m] || m !== "otro");
  const lateMovements = closing
    ? day.payments.filter((p) => new Date(p.paid_at) > new Date(closing.closed_at)).length +
      day.expenses.filter((e) => new Date(e.created_at) > new Date(closing.closed_at)).length
    : 0;

  const dayLabel = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );

  return (
    <div>
      <PageHeader
        title="Caja diaria"
        description="Solo el dinero efectivamente recibido y gastado en el día"
        action={<PrintButton />}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
        <Link href={`/caja?fecha=${shiftDate(date, -1)}`} className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]" aria-label="Día anterior">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="font-display font-semibold text-[var(--oc-blue-950)] capitalize min-w-[14rem] text-center">{dayLabel}</p>
        <Link href={`/caja?fecha=${shiftDate(date, 1)}`} className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]" aria-label="Día siguiente">
          <ChevronRight className="h-4 w-4" />
        </Link>
        {date !== today && <Link href="/caja" className="text-xs font-medium text-[var(--oc-blue-700)]">Ir a hoy</Link>}
        <form action="/caja" className="ml-auto">
          <input type="date" name="fecha" defaultValue={date} className="rounded-lg border border-[var(--oc-slate-200)] bg-white px-3 py-1.5 text-sm" />
          <button className="ml-2 text-sm font-medium text-[var(--oc-blue-700)]">Ver</button>
        </form>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Ingresos del día</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-green)] tabular-nums mt-1">{formatCLP(day.totalIncome)}</p>
          <p className="text-xs text-[var(--oc-slate-500)] mt-1">{day.payments.length} {day.payments.length === 1 ? "pago" : "pagos"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Gastos del día</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-red)] tabular-nums mt-1">{formatCLP(day.totalExpenses)}</p>
          <p className="text-xs text-[var(--oc-slate-500)] mt-1">{day.expenses.length} {day.expenses.length === 1 ? "gasto" : "gastos"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Resultado del día</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-blue-950)] tabular-nums mt-1">{formatCLP(day.totalIncome - day.totalExpenses)}</p>
          <p className="text-xs text-[var(--oc-slate-500)] mt-1">Ingresos − gastos</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Estado de la caja</p>
          {closing ? (
            <p className={`font-display font-bold text-lg mt-1 ${Number(closing.difference) === 0 ? "text-[var(--oc-green)]" : "text-[var(--oc-red)]"}`}>
              {Number(closing.difference) === 0 ? "✓ Cerrada y cuadrada" : "Cerrada con diferencia"}
            </p>
          ) : (
            <p className="font-display font-bold text-lg text-[var(--oc-amber)] mt-1">Abierta</p>
          )}
        </Card>
      </div>

      {/* Por medio de pago */}
      <Card className="p-5 mb-6">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Por medio de pago</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                <th className="pb-2 font-medium">Medio</th>
                <th className="pb-2 font-medium text-right">Ingresos</th>
                <th className="pb-2 font-medium text-right">Gastos</th>
                <th className="pb-2 font-medium text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m} className="border-b border-[var(--oc-slate-100)]">
                  <td className="py-2 font-medium text-[var(--oc-blue-950)]">{PAYMENT_METHOD_LABELS[m]}</td>
                  <td className="py-2 text-right text-[var(--oc-green)]">{formatCLP(day.income[m] || 0)}</td>
                  <td className="py-2 text-right text-[var(--oc-red)]">{formatCLP(day.spent[m] || 0)}</td>
                  <td className="py-2 text-right font-semibold text-[var(--oc-blue-950)]">{formatCLP((day.income[m] || 0) - (day.spent[m] || 0))}</td>
                </tr>
              ))}
              <tr className="font-semibold text-[var(--oc-blue-950)]">
                <td className="pt-2">Total</td>
                <td className="pt-2 text-right">{formatCLP(day.totalIncome)}</td>
                <td className="pt-2 text-right">{formatCLP(day.totalExpenses)}</td>
                <td className="pt-2 text-right">{formatCLP(day.totalIncome - day.totalExpenses)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Ingresos */}
        <Card className="lg:col-span-3">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] px-5 pt-5 pb-3">Ingresos (abonos y pagos recibidos)</h2>
          {day.payments.length === 0 ? (
            <EmptyState title="Sin ingresos este día" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                    <th className="py-2 px-5 font-medium">Hora</th>
                    <th className="py-2 px-5 font-medium">Orden / paciente</th>
                    <th className="py-2 px-5 font-medium">Tipo</th>
                    <th className="py-2 px-5 font-medium">Medio</th>
                    <th className="py-2 px-5 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {day.payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                      <td className="py-2.5 px-5 text-[var(--oc-slate-500)] tabular-nums">{formatTimeCL(p.paid_at)}</td>
                      <td className="py-2.5 px-5">
                        <Link href={`/ventas/${p.sales?.id}`} className="font-medium text-[var(--oc-blue-800)] hover:underline">{p.sales?.work_order_number}</Link>
                        <p className="text-xs text-[var(--oc-slate-500)]">{p.sales?.patients?.full_name}</p>
                      </td>
                      <td className="py-2.5 px-5 text-[var(--oc-slate-700)]">{PAYMENT_KIND_LABELS[p.kind] ?? p.kind}</td>
                      <td className="py-2.5 px-5 text-[var(--oc-slate-700)]">{PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}</td>
                      <td className={`py-2.5 px-5 text-right font-semibold tabular-nums ${Number(p.amount) < 0 ? "text-[var(--oc-red)]" : "text-[var(--oc-blue-950)]"}`}>
                        {formatCLP(p.amount)}
                        {p.void_reason && <p className="text-[11px] font-normal text-[var(--oc-red)]">{p.void_reason}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Gastos */}
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-3">Gastos</h2>
          {day.expenses.length === 0 ? (
            <p className="text-sm text-[var(--oc-slate-500)] mb-4">Sin gastos este día.</p>
          ) : (
            <ul className="divide-y divide-[var(--oc-slate-100)] mb-4">
              {day.expenses.map((e) => (
                <li key={e.id} className="py-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className={e.voided_at ? "opacity-50" : ""}>
                      <p className={`text-sm font-medium text-[var(--oc-blue-950)] ${e.voided_at ? "line-through" : ""}`}>{e.description}</p>
                      <p className="text-xs text-[var(--oc-slate-500)]">
                        {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category} · {PAYMENT_METHOD_LABELS[e.method as PaymentMethod]} · {formatTimeCL(e.created_at)}
                      </p>
                      {e.voided_at && <p className="text-xs text-[var(--oc-red)]">Anulado: {e.void_reason}</p>}
                    </div>
                    <p className={`font-semibold tabular-nums text-[var(--oc-red)] ${e.voided_at ? "line-through opacity-50" : ""}`}>{formatCLP(e.amount)}</p>
                  </div>
                  {isAdmin && !closing && !e.voided_at && (
                    <ReasonAction action={voidExpense.bind(null, e.id)} label="Anular gasto" small description="El gasto no se borra: queda tachado con su motivo y deja de sumar." />
                  )}
                </li>
              ))}
            </ul>
          )}
          {!closing && isAdmin && (
            <div className="border-t border-[var(--oc-slate-200)] pt-4 print:hidden">
              <ExpenseForm date={date} />
            </div>
          )}
        </Card>
      </div>

      {/* Cierre */}
      <Card className="p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] flex items-center gap-2">
            <Lock className="h-4 w-4" /> Cierre de caja
          </h2>
          {closing && isAdmin && (
            <div className="max-w-sm">
              <ReasonAction action={reopenDay.bind(null, date)} label="Reabrir caja" tone="blue" small description="El cierre actual queda guardado en la auditoría. Podrás corregir y volver a cerrar." />
            </div>
          )}
        </div>

        {closingRow?.reopened_at && (
          <p className="mb-4 rounded-lg bg-[var(--oc-amber-bg)] text-[var(--oc-amber)] px-3 py-2 text-sm">
            Caja reabierta el {formatDateTime(closingRow.reopened_at)}. Motivo: {closingRow.reopen_reason}. Corrige lo necesario y vuelve a cerrarla.
          </p>
        )}
        {closing ? (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-4 gap-4 text-sm tabular-nums">
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Efectivo al abrir</p>
                <p className="font-semibold text-[var(--oc-blue-950)]">{formatCLP(closing.opening_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Efectivo esperado</p>
                <p className="font-semibold text-[var(--oc-blue-950)]">{formatCLP(closing.expected_cash)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Efectivo contado</p>
                <p className="font-semibold text-[var(--oc-blue-950)]">{formatCLP(closing.counted_cash)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Diferencia</p>
                <p className={`font-semibold ${Number(closing.difference) === 0 ? "text-[var(--oc-green)]" : "text-[var(--oc-red)]"}`}>
                  {Number(closing.difference) === 0 ? "✓ Cuadra" : `${Number(closing.difference) > 0 ? "Sobran" : "Faltan"} ${formatCLP(Math.abs(Number(closing.difference)))}`}
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--oc-slate-500)]">
              Cerrada el {formatDateTime(closing.closed_at)}
              {closing.times_reopened > 0 ? ` · reabierta ${closing.times_reopened} ${closing.times_reopened === 1 ? "vez" : "veces"} (ver auditoría)` : ""}
            </p>
            {closing.notes && <p className="text-sm text-[var(--oc-slate-700)]">{closing.notes}</p>}
            {lateMovements > 0 && (
              <p className="rounded-lg bg-[var(--oc-amber-bg)] text-[var(--oc-amber)] px-3 py-2 text-sm">
                Hay {lateMovements} {lateMovements === 1 ? "movimiento registrado" : "movimientos registrados"} después del cierre. Los totales de arriba ya los incluyen; el cierre guardado no.
                {isAdmin ? " Puedes reabrir la caja y volver a cerrarla." : ""}
              </p>
            )}
          </div>
        ) : !isAdmin ? (
          <p className="text-sm text-[var(--oc-slate-500)]">Solo la administradora puede cerrar la caja.</p>
        ) : date > today ? (
          <p className="text-sm text-[var(--oc-slate-500)]">No se puede cerrar la caja de un día que aún no llega.</p>
        ) : (
          <CloseDayForm
            date={date}
            cashIncome={day.cashIncome}
            cashExpenses={day.cashExpenses}
            suggestedOpening={closingRow ? Number(closingRow.opening_amount) : previous ? Number(previous.counted_cash) : 0}
          />
        )}
        {!closing && previous && (
          <p className="text-xs text-[var(--oc-slate-500)] mt-3 print:hidden">
            Sugerencia de apertura: lo contado en el último cierre ({formatDate(previous.closing_date)}).
          </p>
        )}
      </Card>
    </div>
  );
}
