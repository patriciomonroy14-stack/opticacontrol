import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import {
  formatCLP,
  formatDate,
  formatDateTime,
  ORDER_STATUS_LABELS,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  PURCHASE_TYPE_LABELS,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/types";
import { AddPaymentForm, DeliverPanel, EstimatedDeliveryInput, OrderStatusSelect } from "./SaleControls";

export default async function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sale }, { data: payments }, { data: order }, { data: filters }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, work_order_number, sale_date, total, subtotal, discount, purchase_type, lens_description, estimated_delivery, notes, accessories, client_owns_frame, patients(id, full_name, phone), frames(code, brand, model), lens_types(name), lens_materials(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sale_payments").select("id, amount, method, kind, paid_at, received_by, notes").eq("sale_id", id).order("paid_at"),
    supabase
      .from("orders")
      .select("id, status, delivered_at, delivered_by, balance_at_delivery, delivery_authorized_by, delivery_note")
      .eq("sale_id", id)
      .maybeSingle(),
    supabase.from("sale_filters").select("filter_name, color_name").eq("sale_id", id),
  ]);

  if (!sale) notFound();
  const s = sale as any;

  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(s.total);
  const balance = Math.max(total - paid, 0);
  const status = (order?.status ?? "venta_ingresada") as OrderStatus;
  const delivered = status === "entregado";

  // Nombres de quienes recibieron pagos / entregaron (si el rol puede verlos)
  const userIds = [...new Set([...(payments || []).map((p) => p.received_by), order?.delivered_by].filter(Boolean))] as string[];
  const { data: people } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] };
  const nameOf = (uid: string | null) => people?.find((p) => p.id === uid)?.full_name ?? "—";

  const lensParts = [
    s.lens_description,
    !s.lens_description && s.lens_types?.name ? `${s.lens_types.name}${s.lens_materials?.name ? ` · ${s.lens_materials.name}` : ""}` : null,
    filters && filters.length ? `Filtros: ${filters.map((f) => f.filter_name + (f.color_name ? ` (${f.color_name})` : "")).join(", ")}` : null,
  ].filter(Boolean);

  return (
    <div className="max-w-4xl">
      <Link href="/ventas" className="inline-flex items-center gap-1 text-sm text-[var(--oc-slate-500)] hover:text-[var(--oc-blue-700)] mb-3">
        <ArrowLeft className="h-4 w-4" /> Ventas
      </Link>
      <PageHeader
        title={`Orden ${s.work_order_number ?? ""}`}
        description={`${s.patients?.full_name ?? ""} · pedido del ${formatDate(s.sale_date)}`}
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Total de la venta</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-blue-950)] tabular-nums mt-1">{formatCLP(total)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Pagado</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-green)] tabular-nums mt-1">{formatCLP(paid)}</p>
        </Card>
        <Card className={`p-5 ${balance > 0 ? "border-[var(--oc-amber)]" : ""}`}>
          <p className="text-xs text-[var(--oc-slate-500)]">Saldo pendiente</p>
          <p className={`font-display font-bold text-2xl tabular-nums mt-1 ${balance > 0 ? "text-[var(--oc-amber)]" : "text-[var(--oc-green)]"}`}>
            {formatCLP(balance)}
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Pagos y abonos</h2>
            {!payments || payments.length === 0 ? (
              <p className="text-sm text-[var(--oc-slate-500)] mb-4">Aún no se han registrado pagos.</p>
            ) : (
              <ul className="divide-y divide-[var(--oc-slate-100)] mb-4">
                {payments.map((p) => (
                  <li key={p.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--oc-blue-950)]">
                        {PAYMENT_KIND_LABELS[p.kind] ?? p.kind} · {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                      </p>
                      <p className="text-xs text-[var(--oc-slate-500)]">
                        {formatDateTime(p.paid_at)} · recibió {nameOf(p.received_by)}
                        {p.notes ? ` · ${p.notes}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-[var(--oc-blue-950)] tabular-nums">{formatCLP(p.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
            <AddPaymentForm saleId={s.id} balance={balance} />
            {balance <= 0 && <Badge tone="green">Venta pagada completamente</Badge>}
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Entrega</h2>
            {delivered ? (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 font-semibold text-[var(--oc-green)]">✓ Entregado</p>
                <p className="text-[var(--oc-slate-700)]">
                  {formatDateTime(order?.delivered_at)} · entregó {nameOf(order?.delivered_by ?? null)}
                </p>
                {Number(order?.balance_at_delivery) > 0 && (
                  <p className="rounded-lg bg-[var(--oc-amber-bg)] text-[var(--oc-amber)] px-3 py-2">
                    Se entregó con saldo pendiente de {formatCLP(order?.balance_at_delivery)}
                    {order?.delivery_authorized_by ? ` · autorizado por ${order.delivery_authorized_by}` : ""}
                  </p>
                )}
                {balance > 0 && (
                  <p className="rounded-lg bg-[var(--oc-red-bg)] text-[var(--oc-red)] px-3 py-2 font-medium">
                    Deuda actual: {formatCLP(balance)}. Registra los abonos arriba a medida que pague.
                  </p>
                )}
                {order?.delivery_note && <p className="text-[var(--oc-slate-500)]">{order.delivery_note}</p>}
              </div>
            ) : (
              <DeliverPanel saleId={s.id} balance={balance} />
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--oc-slate-500)] mb-1">Estado del pedido</p>
              {delivered ? <Badge tone="green">{ORDER_STATUS_LABELS[status]}</Badge> : <OrderStatusSelect saleId={s.id} status={status} />}
            </div>
            <div>
              <p className="text-xs text-[var(--oc-slate-500)] mb-1">Fecha estimada de entrega</p>
              {delivered ? (
                <p className="text-sm text-[var(--oc-blue-950)]">{formatDate(s.estimated_delivery)}</p>
              ) : (
                <EstimatedDeliveryInput saleId={s.id} value={s.estimated_delivery} />
              )}
            </div>
          </Card>

          <Card className="p-5 space-y-3 text-sm">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Detalle</h2>
            <div>
              <p className="text-xs text-[var(--oc-slate-500)]">Paciente</p>
              <Link href={`/pacientes/${s.patients?.id}`} className="font-medium text-[var(--oc-blue-800)] hover:underline">{s.patients?.full_name}</Link>
              {s.patients?.phone && (
                <a href={`tel:${String(s.patients.phone).replace(/\s/g, "")}`} className="flex items-center gap-1 text-[var(--oc-slate-700)] mt-0.5">
                  <Phone className="h-3.5 w-3.5" /> {s.patients.phone}
                </a>
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--oc-slate-500)]">Tipo de compra</p>
              <p className="text-[var(--oc-blue-950)]">{PURCHASE_TYPE_LABELS[s.purchase_type as keyof typeof PURCHASE_TYPE_LABELS]}</p>
            </div>
            {lensParts.length > 0 && (
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Lente y cristales</p>
                {lensParts.map((l: string) => <p key={l} className="text-[var(--oc-blue-950)]">{l}</p>)}
              </div>
            )}
            {(s.frames || s.client_owns_frame) && (
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Armazón</p>
                <p className="text-[var(--oc-blue-950)]">
                  {s.client_owns_frame ? "Propio del paciente" : [s.frames?.code, s.frames?.brand, s.frames?.model].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {Number(s.discount) > 0 && (
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Descuento</p>
                <p className="text-[var(--oc-blue-950)]">{formatCLP(s.discount)}</p>
              </div>
            )}
            {s.notes && (
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Observaciones</p>
                <p className="text-[var(--oc-blue-950)]">{s.notes}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
