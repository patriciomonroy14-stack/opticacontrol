import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, PrimaryButton, EmptyState } from "@/components/ui";
import { formatDate, formatCLP, ORDER_STATUS_LABELS, todayCL, type OrderStatus } from "@/lib/types";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

const FILTERS = [
  { key: "", label: "Todas" },
  { key: "saldo", label: "Con saldo pendiente" },
  { key: "por_entregar", label: "Por entregar" },
  { key: "listas", label: "Listas para entregar" },
];

function statusTone(status: OrderStatus): "slate" | "blue" | "amber" | "green" | "red" {
  if (status === "entregado") return "green";
  if (status === "listo_para_entregar") return "amber";
  if (status === "cancelado") return "red";
  if (status === "venta_ingresada") return "slate";
  return "blue";
}

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ filtro?: string; q?: string }> }) {
  const { filtro = "", q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("sales")
    .select("id, work_order_number, sale_date, total, amount_paid, estimated_delivery, patients(id, full_name), orders(status)")
    .order("sale_date", { ascending: false })
    .limit(200);
  if (q?.trim()) query = query.ilike("work_order_number", `%${q.trim()}%`);
  const { data: rawSales } = await query;

  const today = todayCL();
  const sales = (rawSales || [])
    .map((s: any) => {
      const status = (s.orders?.[0]?.status ?? "venta_ingresada") as OrderStatus;
      const balance = Math.max(Number(s.total) - Number(s.amount_paid), 0);
      return { ...s, status, balance };
    })
    .filter((s) => {
      if (filtro === "saldo") return s.balance > 0 && s.status !== "cancelado";
      if (filtro === "por_entregar") return s.status !== "entregado" && s.status !== "cancelado";
      if (filtro === "listas") return s.status === "listo_para_entregar";
      return true;
    });

  const totalDebt = sales.filter((s) => s.status !== "cancelado").reduce((sum, s) => sum + s.balance, 0);

  return (
    <div>
      <PageHeader
        title="Ventas y pedidos"
        description="Ventas, abonos, saldos pendientes y entregas"
        action={<PrimaryButton href="/ventas/nueva"><ShoppingCart className="h-4 w-4" /> Nueva venta</PrimaryButton>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/ventas${f.key ? `?filtro=${f.key}` : ""}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
              filtro === f.key ? "bg-[var(--oc-blue-700)] text-white border-[var(--oc-blue-700)]" : "bg-white text-[var(--oc-slate-700)] border-[var(--oc-slate-200)] hover:bg-[var(--oc-slate-100)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <form action="/ventas" className="ml-auto">
          <input name="q" defaultValue={q} placeholder="Buscar N° de orden…" className="rounded-full border border-[var(--oc-slate-200)] bg-white px-4 py-1.5 text-sm outline-none focus:border-[var(--oc-blue-500)]" />
        </form>
      </div>

      {filtro === "saldo" && (
        <p className="mb-4 text-sm text-[var(--oc-slate-700)]">
          Total por cobrar: <span className="font-semibold text-[var(--oc-amber)]">{formatCLP(totalDebt)}</span>
        </p>
      )}

      <Card>
        {sales.length === 0 ? (
          <EmptyState title="No hay ventas en este filtro" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-4 font-medium">N° orden</th>
                  <th className="py-3 px-4 font-medium">Fecha</th>
                  <th className="py-3 px-4 font-medium">Paciente</th>
                  <th className="py-3 px-4 font-medium text-right">Total</th>
                  <th className="py-3 px-4 font-medium text-right">Pagado</th>
                  <th className="py-3 px-4 font-medium text-right">Saldo</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-4 font-medium">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const late = s.estimated_delivery && s.estimated_delivery < today && s.status !== "entregado" && s.status !== "cancelado";
                  return (
                    <tr key={s.id} className="border-b border-[var(--oc-slate-100)] last:border-0 hover:bg-[var(--oc-slate-100)]/50">
                      <td className="py-3 px-4">
                        <Link href={`/ventas/${s.id}`} className="font-semibold text-[var(--oc-blue-800)] hover:underline whitespace-nowrap">
                          {s.work_order_number ?? "Ver"}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[var(--oc-slate-500)] whitespace-nowrap">{formatDate(s.sale_date)}</td>
                      <td className="py-3 px-4">
                        <Link href={`/ventas/${s.id}`} className="font-medium text-[var(--oc-blue-950)] hover:underline">
                          {s.patients?.full_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--oc-blue-950)]">{formatCLP(s.total)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--oc-green)]">{formatCLP(s.amount_paid)}</td>
                      <td className={`py-3 px-4 text-right tabular-nums font-semibold ${s.balance > 0 ? "text-[var(--oc-amber)]" : "text-[var(--oc-slate-500)]"}`}>
                        {formatCLP(s.balance)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone={statusTone(s.status as OrderStatus)}>{ORDER_STATUS_LABELS[s.status as OrderStatus]}</Badge>
                      </td>
                      <td className={`py-3 px-4 whitespace-nowrap ${late ? "text-[var(--oc-red)] font-medium" : "text-[var(--oc-slate-500)]"}`}>
                        {s.status === "entregado" ? "✓" : formatDate(s.estimated_delivery)}
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
