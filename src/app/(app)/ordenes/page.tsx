import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { formatCLP, formatDate, PURCHASE_TYPE_LABELS } from "@/lib/types";
import { OrderStatusControl, ContactButton } from "./OrderControls";
import Link from "next/link";

const FILTERS = [
  { key: "", label: "Todas" },
  { key: "en_proceso", label: "En proceso" },
  { key: "listo_para_entregar", label: "Listas para entregar" },
  { key: "entregado", label: "Entregadas" },
];

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, status, created_at, arrived_at, contacted, sales(id, work_order_number, sale_date, total, amount_paid, estimated_delivery, purchase_type, patients(id, full_name, phone))")
    .order("created_at", { ascending: false });

  if (filter === "listo_para_entregar") query = query.eq("status", "listo_para_entregar");
  else if (filter === "entregado") query = query.eq("status", "entregado");
  else if (filter === "en_proceso") query = query.not("status", "in", "(entregado,cancelado)");

  const { data: orders } = await query.limit(100);

  return (
    <div>
      <PageHeader title="Órdenes" description="Sigue el estado de fabricación y entrega de cada pedido" />

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
        {!orders || orders.length === 0 ? (
          <EmptyState title="No hay órdenes en este filtro" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-5 font-medium">N° orden</th>
                  <th className="py-3 px-5 font-medium">Paciente</th>
                  <th className="py-3 px-5 font-medium">Producto</th>
                  <th className="py-3 px-5 font-medium">Entrega estimada</th>
                  <th className="py-3 px-5 font-medium text-right">Saldo</th>
                  <th className="py-3 px-5 font-medium">Estado</th>
                  <th className="py-3 px-5 font-medium">Contacto</th>
                  <th className="py-3 px-5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                    <td className="py-3 px-5">
                      <Link href={`/ventas/${o.sales?.id}`} className="font-semibold text-[var(--oc-blue-800)] hover:underline whitespace-nowrap">
                        {o.sales?.work_order_number ?? "Ver"}
                      </Link>
                    </td>
                    <td className="py-3 px-5">
                      <Link href={`/pacientes/${o.sales?.patients?.id}`} className="font-medium text-[var(--oc-blue-800)] hover:underline">
                        {o.sales?.patients?.full_name}
                      </Link>
                      <p className="text-xs text-[var(--oc-slate-500)]">{o.sales?.patients?.phone}</p>
                    </td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{PURCHASE_TYPE_LABELS[o.sales?.purchase_type as keyof typeof PURCHASE_TYPE_LABELS]}</td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{formatDate(o.sales?.estimated_delivery)}</td>
                    <td className={`py-3 px-5 text-right tabular-nums font-semibold ${Number(o.sales?.total) - Number(o.sales?.amount_paid) > 0 ? "text-[var(--oc-amber)]" : "text-[var(--oc-slate-500)]"}`}>
                      {formatCLP(Math.max(Number(o.sales?.total) - Number(o.sales?.amount_paid), 0))}
                    </td>
                    <td className="py-3 px-5"><OrderStatusControl orderId={o.id} status={o.status} /></td>
                    <td className="py-3 px-5">
                      {o.status === "listo_para_entregar" ? <ContactButton orderId={o.id} contacted={o.contacted} /> : <span className="text-xs text-[var(--oc-slate-500)]">—</span>}
                    </td>
                    <td className="py-3 px-5">
                      {o.status !== "entregado" && o.status !== "cancelado" && (
                        <Link href={`/ventas/${o.sales?.id}`} className="inline-flex items-center gap-1 rounded-full bg-[var(--oc-green)] text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 whitespace-nowrap">
                          ✓ Entregar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
