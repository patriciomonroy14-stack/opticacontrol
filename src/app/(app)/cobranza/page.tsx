import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { canSell, formatCLP, formatDate, todayCL } from "@/lib/types";
import { getSession } from "@/lib/session";
import { buildMessage } from "@/lib/whatsapp";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AddPaymentForm } from "../ventas/[id]/SaleControls";

const FILTERS = [
  { key: "", label: "Todas" },
  { key: "vencidas", label: "Vencidas" },
  { key: "por_vencer", label: "Por vencer" },
  { key: "entregadas", label: "Entregadas con deuda" },
];

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);
}

export default async function CobranzaPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro = "" } = await searchParams;
  const { supabase, user, role } = await getSession();
  if (!user) redirect("/login");
  const seller = canSell(role);
  const today = todayCL();

  const { data } = await supabase
    .from("sales")
    .select("id, work_order_number, sale_date, total, amount_paid, payment_due_date, estimated_delivery, voided_at, patients(id, full_name, phone), orders(status)")
    .neq("payment_status", "pagado")
    .is("voided_at", null)
    .order("sale_date", { ascending: true })
    .limit(500);

  const debts = ((data as any[]) || [])
    .map((s) => {
      const balance = Math.max(Number(s.total) - Number(s.amount_paid), 0);
      const due = s.payment_due_date ?? s.estimated_delivery ?? null;
      const daysLate = due ? daysBetween(due, today) : null;
      return { ...s, balance, due, daysLate, status: s.orders?.[0]?.status as string | undefined };
    })
    .filter((s) => s.balance > 0);

  const { data: lastPayments } = debts.length
    ? await supabase.from("sale_payments").select("sale_id, paid_at, amount").in("sale_id", debts.map((d) => d.id)).gt("amount", 0).order("paid_at", { ascending: false })
    : { data: [] };
  const lastPaid = new Map<string, string>();
  for (const p of lastPayments || []) if (!lastPaid.has(p.sale_id)) lastPaid.set(p.sale_id, p.paid_at);

  const visible = debts
    .filter((d) => {
      if (filtro === "vencidas") return d.daysLate != null && d.daysLate > 0;
      if (filtro === "por_vencer") return d.daysLate == null || d.daysLate <= 0;
      if (filtro === "entregadas") return d.status === "entregado";
      return true;
    })
    .sort((a, b) => (b.daysLate ?? -9999) - (a.daysLate ?? -9999));

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const overdue = debts.filter((d) => d.daysLate != null && d.daysLate > 0).reduce((s, d) => s + d.balance, 0);
  const deliveredDebt = debts.filter((d) => d.status === "entregado").reduce((s, d) => s + d.balance, 0);

  return (
    <div>
      <PageHeader title="Cuentas por cobrar" description="Clientes con saldo pendiente, atrasos y recordatorios" />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Total por cobrar</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-amber)] tabular-nums mt-1">{formatCLP(totalDebt)}</p>
          <p className="text-xs text-[var(--oc-slate-500)] mt-1">{debts.length} {debts.length === 1 ? "cliente" : "clientes"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Vencido (pasó la fecha de compromiso)</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-red)] tabular-nums mt-1">{formatCLP(overdue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Lentes ya entregados con deuda</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-blue-950)] tabular-nums mt-1">{formatCLP(deliveredDebt)}</p>
        </Card>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/cobranza${f.key ? `?filtro=${f.key}` : ""}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
              filtro === f.key ? "bg-[var(--oc-blue-700)] text-white border-[var(--oc-blue-700)]" : "bg-white text-[var(--oc-slate-700)] border-[var(--oc-slate-200)] hover:bg-[var(--oc-slate-100)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState title="No hay deudas en este filtro" /></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((d) => {
            const p = d.patients;
            const late = d.daysLate != null && d.daysLate > 0;
            return (
              <Card key={d.id} className={`p-4 ${late ? "border-[var(--oc-red)]" : ""}`}>
                <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                  <div className="min-w-[12rem] flex-1">
                    <Link href={`/pacientes/${p?.id}`} className="font-semibold text-[var(--oc-blue-950)] hover:underline">{p?.full_name}</Link>
                    <p className="text-xs text-[var(--oc-slate-500)]">
                      <Link href={`/ventas/${d.id}`} className="text-[var(--oc-blue-700)] hover:underline">{d.work_order_number}</Link> · {formatDate(d.sale_date)}
                      {d.status === "entregado" ? " · lentes entregados" : ""}
                    </p>
                    {p?.phone && <p className="text-xs text-[var(--oc-slate-500)]">{p.phone}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-x-5 text-sm tabular-nums">
                    <div>
                      <p className="text-[11px] text-[var(--oc-slate-500)]">Total</p>
                      <p>{formatCLP(d.total)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--oc-slate-500)]">Abonado</p>
                      <p className="text-[var(--oc-green)]">{formatCLP(d.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--oc-slate-500)]">Deuda</p>
                      <p className="font-bold text-[var(--oc-amber)]">{formatCLP(d.balance)}</p>
                    </div>
                  </div>
                  <div className="text-sm min-w-[9rem]">
                    <p className="text-[11px] text-[var(--oc-slate-500)]">Compromiso de pago</p>
                    <p>{formatDate(d.due)}</p>
                    {d.daysLate != null && (
                      <p className={`text-xs font-semibold ${late ? "text-[var(--oc-red)]" : "text-[var(--oc-slate-500)]"}`}>
                        {late ? `${d.daysLate} ${d.daysLate === 1 ? "día" : "días"} de atraso` : d.daysLate === 0 ? "Vence hoy" : `Vence en ${-d.daysLate} días`}
                      </p>
                    )}
                    <p className="text-[11px] text-[var(--oc-slate-500)] mt-1">Último pago: {lastPaid.has(d.id) ? formatDate(lastPaid.get(d.id)) : "—"}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    {p && (
                      <WhatsAppButton
                        compact
                        patientId={p.id}
                        phone={p.phone}
                        kind="recordatorio_saldo"
                        label="Recordar por WhatsApp"
                        message={buildMessage("recordatorio_saldo", { name: p.full_name, order: d.work_order_number, balance: d.balance, dueDate: d.due })}
                      />
                    )}
                  </div>
                </div>
                {seller && (
                  <div className="mt-3">
                    <AddPaymentForm saleId={d.id} balance={d.balance} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
