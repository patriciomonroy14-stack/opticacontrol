import Link from "next/link";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { formatCLP, formatDate, todayCL } from "@/lib/types";
import { getSession } from "@/lib/session";
import { buildMessage } from "@/lib/whatsapp";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OrderStatusControl } from "./OrderControls";

const FILTERS = [
  { key: "", label: "En proceso" },
  { key: "atrasadas", label: "Atrasadas" },
  { key: "laboratorio", label: "En laboratorio" },
  { key: "listas", label: "Listas para entregar" },
  { key: "entregadas", label: "Entregadas" },
  { key: "todas", label: "Todas" },
];

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "" } = await searchParams;
  const { supabase } = await getSession();
  const today = todayCL();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, contacted, delivered_at, lab_name, lab_sent_at, lab_promised_date, lab_received_at, sales(id, work_order_number, sale_date, total, amount_paid, estimated_delivery, voided_at, patients(id, full_name, phone))",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const orders = ((data as any[]) || [])
    .filter((o) => !o.sales?.voided_at)
    .map((o) => {
      const open = o.status !== "entregado" && o.status !== "cancelado";
      const labLate = open && o.lab_promised_date && !o.lab_received_at && o.lab_promised_date < today;
      const deliveryLate = open && o.sales?.estimated_delivery && o.sales.estimated_delivery < today;
      const inLab = open && o.lab_sent_at && !o.lab_received_at;
      const balance = Math.max(Number(o.sales?.total) - Number(o.sales?.amount_paid), 0);
      return { ...o, open, labLate, deliveryLate, inLab, balance };
    });

  const visible = orders.filter((o) => {
    if (filter === "todas") return true;
    if (filter === "atrasadas") return o.labLate || o.deliveryLate;
    if (filter === "laboratorio") return o.inLab;
    if (filter === "listas") return o.status === "listo_para_entregar";
    if (filter === "entregadas") return o.status === "entregado";
    return o.open;
  });
  const lateCount = orders.filter((o) => o.labLate || o.deliveryLate).length;

  return (
    <div>
      <PageHeader title="Pedidos y laboratorio" description="Seguimiento de cada pedido: laboratorio, fechas, atrasos y entrega" />

      {lateCount > 0 && filter !== "atrasadas" && (
        <Link href="/ordenes?filter=atrasadas" className="mb-4 flex items-center justify-between rounded-xl border border-[var(--oc-red)] bg-[var(--oc-red-bg)] px-4 py-3 text-sm text-[var(--oc-red)]">
          <span className="font-semibold">⚠ {lateCount} {lateCount === 1 ? "pedido atrasado" : "pedidos atrasados"}</span>
          <span>Ver →</span>
        </Link>
      )}

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/ordenes${f.key ? `?filter=${f.key}` : ""}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
              filter === f.key ? "bg-[var(--oc-blue-700)] text-white border-[var(--oc-blue-700)]" : "bg-white text-[var(--oc-slate-700)] border-[var(--oc-slate-200)] hover:bg-[var(--oc-slate-100)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        {visible.length === 0 ? (
          <EmptyState title="No hay pedidos en este filtro" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-4 font-medium">N° orden</th>
                  <th className="py-3 px-4 font-medium">Paciente</th>
                  <th className="py-3 px-4 font-medium">Laboratorio</th>
                  <th className="py-3 px-4 font-medium">Enviado</th>
                  <th className="py-3 px-4 font-medium">Comprometido</th>
                  <th className="py-3 px-4 font-medium">Recibido</th>
                  <th className="py-3 px-4 font-medium">Entrega cliente</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-4 font-medium text-right">Saldo</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => {
                  const p = o.sales?.patients;
                  return (
                    <tr key={o.id} className="border-b border-[var(--oc-slate-100)] last:border-0 align-top">
                      <td className="py-3 px-4">
                        <Link href={`/ventas/${o.sales?.id}`} className="font-semibold text-[var(--oc-blue-800)] hover:underline whitespace-nowrap">
                          {o.sales?.work_order_number ?? "Ver"}
                        </Link>
                        <p className="text-xs text-[var(--oc-slate-500)]">{formatDate(o.sales?.sale_date)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/pacientes/${p?.id}`} className="font-medium text-[var(--oc-blue-950)] hover:underline">{p?.full_name}</Link>
                        <p className="text-xs text-[var(--oc-slate-500)]">{p?.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-[var(--oc-slate-700)]">{o.lab_name || <span className="text-[var(--oc-slate-500)]">—</span>}</td>
                      <td className="py-3 px-4 text-[var(--oc-slate-500)] whitespace-nowrap">{formatDate(o.lab_sent_at)}</td>
                      <td className={`py-3 px-4 whitespace-nowrap ${o.labLate ? "text-[var(--oc-red)] font-semibold" : "text-[var(--oc-slate-500)]"}`}>
                        {formatDate(o.lab_promised_date)}
                        {o.labLate && <p className="text-[11px]">Lab. atrasado</p>}
                      </td>
                      <td className="py-3 px-4 text-[var(--oc-slate-500)] whitespace-nowrap">{formatDate(o.lab_received_at)}</td>
                      <td className={`py-3 px-4 whitespace-nowrap ${o.deliveryLate ? "text-[var(--oc-red)] font-semibold" : "text-[var(--oc-slate-500)]"}`}>
                        {o.status === "entregado" ? <span className="text-[var(--oc-green)]">✓ {formatDate(o.delivered_at)}</span> : formatDate(o.sales?.estimated_delivery)}
                        {o.deliveryLate && <p className="text-[11px]">Entrega vencida</p>}
                      </td>
                      <td className="py-3 px-4"><OrderStatusControl orderId={o.id} status={o.status} /></td>
                      <td className={`py-3 px-4 text-right tabular-nums font-semibold ${o.balance > 0 ? "text-[var(--oc-amber)]" : "text-[var(--oc-slate-500)]"}`}>{formatCLP(o.balance)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1.5">
                          {o.status === "listo_para_entregar" && p && (
                            <WhatsAppButton
                              compact
                              patientId={p.id}
                              phone={p.phone}
                              kind="lentes_listos"
                              orderId={o.id}
                              label={o.contacted ? "Avisar otra vez" : "Avisar listo"}
                              message={buildMessage("lentes_listos", { name: p.full_name, order: o.sales?.work_order_number, balance: o.balance })}
                            />
                          )}
                          {o.open && (
                            <Link href={`/ventas/${o.sales?.id}`} className="inline-flex items-center rounded-full bg-[var(--oc-green)] text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 whitespace-nowrap">
                              ✓ Entregar
                            </Link>
                          )}
                          {o.contacted && o.status === "listo_para_entregar" && <Badge tone="green">Avisado</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
