import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import {
  canSell,
  formatCLP,
  formatDate,
  formatDateTime,
  isAdmin as isAdminRole,
  todayCL,
  ORDER_STATUS_LABELS,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  PURCHASE_TYPE_LABELS,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/types";
import { getSession } from "@/lib/session";
import { computeProfit } from "@/lib/profit";
import { buildMessage } from "@/lib/whatsapp";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ReasonAction } from "@/components/ReasonAction";
import { reversePayment, voidSale } from "../actions";
import {
  AddPaymentForm,
  DeliverPanel,
  EstimatedDeliveryInput,
  LabCostForm,
  LabInfoForm,
  OrderStatusSelect,
  OtherCostsForm,
  PaymentDueDateInput,
} from "./SaleControls";

export default async function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await getSession();
  const admin = isAdminRole(role);
  const seller = canSell(role);

  const [{ data: sale }, { data: payments }, { data: order }, { data: filters }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, work_order_number, sale_date, total, subtotal, discount, discount_approved_by, purchase_type, lens_description, estimated_delivery, payment_due_date, notes, accessories, client_owns_frame, frame_cost, lens_cost, other_costs, voided_at, void_reason, patients(id, full_name, phone), frames(code, brand, model, color), lens_types(name), lens_materials(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sale_payments").select("id, amount, method, kind, paid_at, received_by, notes, reversal_of, void_reason").eq("sale_id", id).order("paid_at"),
    supabase
      .from("orders")
      .select(
        "id, status, delivered_at, delivered_by, balance_at_delivery, delivery_authorized_by, delivery_note, lab_name, lab_order_ref, lab_sent_at, lab_promised_date, lab_received_at, lab_cost, lab_paid, lab_paid_at",
      )
      .eq("sale_id", id)
      .maybeSingle(),
    supabase.from("sale_filters").select("filter_name, color_name, cost").eq("sale_id", id),
  ]);

  if (!sale) notFound();
  const s = sale as any;
  const voided = Boolean(s.voided_at);

  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(s.total);
  const balance = voided ? 0 : Math.max(total - paid, 0);
  const status = (order?.status ?? "venta_ingresada") as OrderStatus;
  const delivered = status === "entregado";
  const today = todayCL();
  const reversed = new Set((payments || []).filter((p) => p.reversal_of).map((p) => p.reversal_of));

  // Nombres de quienes recibieron pagos / entregaron (si el rol puede verlos)
  const userIds = [...new Set([...(payments || []).map((p) => p.received_by), order?.delivered_by].filter(Boolean))] as string[];
  const { data: people } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] };
  const nameOf = (uid: string | null) => people?.find((p) => p.id === uid)?.full_name ?? "—";

  const lensParts = [
    s.lens_description,
    !s.lens_description && s.lens_types?.name ? `${s.lens_types.name}${s.lens_materials?.name ? ` · ${s.lens_materials.name}` : ""}` : null,
    filters && filters.length ? `Filtros: ${filters.map((f) => f.filter_name + (f.color_name ? ` (${f.color_name})` : "")).join(", ")}` : null,
  ].filter(Boolean);

  const labLate = !delivered && !voided && order?.lab_promised_date && !order.lab_received_at && order.lab_promised_date < today;
  const deliveryLate = !delivered && !voided && s.estimated_delivery && s.estimated_delivery < today;

  const profit = admin
    ? computeProfit({
        total: s.total,
        frame_cost: s.frame_cost,
        lens_cost: s.lens_cost,
        other_costs: s.other_costs,
        client_owns_frame: s.client_owns_frame,
        filters_cost: (filters || []).reduce((sum, f) => sum + Number(f.cost || 0), 0),
        lab_cost: order?.lab_cost,
        voided_at: s.voided_at,
      })
    : null;

  const patient = { id: s.patients?.id as string, name: s.patients?.full_name as string, phone: s.patients?.phone as string | null };

  return (
    <div className="max-w-5xl">
      <Link href="/ventas" className="inline-flex items-center gap-1 text-sm text-[var(--oc-slate-500)] hover:text-[var(--oc-blue-700)] mb-3">
        <ArrowLeft className="h-4 w-4" /> Ventas
      </Link>
      <PageHeader title={`Orden ${s.work_order_number ?? ""}`} description={`${patient.name ?? ""} · pedido del ${formatDate(s.sale_date)}`} />

      {voided && (
        <div className="mb-6 rounded-xl border border-[var(--oc-red)] bg-[var(--oc-red-bg)] px-4 py-3 text-sm text-[var(--oc-red)]">
          <p className="font-semibold">Venta anulada el {formatDateTime(s.voided_at)}</p>
          <p>Motivo: {s.void_reason}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Total de la venta</p>
          <p className={`font-display font-bold text-2xl tabular-nums mt-1 ${voided ? "line-through text-[var(--oc-slate-500)]" : "text-[var(--oc-blue-950)]"}`}>{formatCLP(total)}</p>
          {Number(s.discount) > 0 && (
            <p className="text-xs text-[var(--oc-slate-500)] mt-1">
              Incluye descuento de {formatCLP(s.discount)}
              {s.discount_approved_by ? " (aprobado por administradora)" : ""}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Pagado (neto)</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-green)] tabular-nums mt-1">{formatCLP(paid)}</p>
        </Card>
        <Card className={`p-5 ${balance > 0 ? "border-[var(--oc-amber)]" : ""}`}>
          <p className="text-xs text-[var(--oc-slate-500)]">Saldo pendiente</p>
          <p className={`font-display font-bold text-2xl tabular-nums mt-1 ${balance > 0 ? "text-[var(--oc-amber)]" : "text-[var(--oc-green)]"}`}>{formatCLP(balance)}</p>
          {balance > 0 && (
            <div className="mt-2">
              <WhatsAppButton
                compact
                patientId={patient.id}
                phone={patient.phone}
                kind="recordatorio_saldo"
                label="Recordar saldo"
                message={buildMessage("recordatorio_saldo", { name: patient.name, order: s.work_order_number, balance, dueDate: s.payment_due_date })}
              />
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Pagos */}
          <Card className="p-5">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Pagos y abonos</h2>
            {!payments || payments.length === 0 ? (
              <p className="text-sm text-[var(--oc-slate-500)] mb-4">Aún no se han registrado pagos.</p>
            ) : (
              <ul className="divide-y divide-[var(--oc-slate-100)] mb-4">
                {payments.map((p) => {
                  const negative = Number(p.amount) < 0;
                  const wasReversed = reversed.has(p.id);
                  return (
                    <li key={p.id} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className={wasReversed ? "opacity-60" : ""}>
                          <p className="text-sm font-medium text-[var(--oc-blue-950)]">
                            {PAYMENT_KIND_LABELS[p.kind] ?? p.kind} · {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                            {wasReversed && <span className="ml-2 text-xs font-normal text-[var(--oc-red)]">(reversado)</span>}
                          </p>
                          <p className="text-xs text-[var(--oc-slate-500)]">
                            {formatDateTime(p.paid_at)} · {negative ? "registró" : "recibió"} {nameOf(p.received_by)}
                            {p.notes ? ` · ${p.notes}` : ""}
                          </p>
                        </div>
                        <p className={`font-semibold tabular-nums ${negative ? "text-[var(--oc-red)]" : "text-[var(--oc-blue-950)]"}`}>{formatCLP(p.amount)}</p>
                      </div>
                      {admin && !negative && !wasReversed && !voided && (
                        <ReasonAction
                          small
                          action={reversePayment.bind(null, p.id)}
                          label="Reversar pago"
                          description="Se registra un movimiento negativo en la caja de hoy (devolución o corrección). El pago original no se borra."
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!voided && seller && <AddPaymentForm saleId={s.id} balance={balance} />}
            {!voided && balance <= 0 && <Badge tone="green">Venta pagada completamente</Badge>}
          </Card>

          {/* Entrega */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Entrega</h2>
              {!delivered && !voided && status === "listo_para_entregar" && (
                <WhatsAppButton
                  compact
                  patientId={patient.id}
                  phone={patient.phone}
                  kind="lentes_listos"
                  label="Avisar que están listos"
                  message={buildMessage("lentes_listos", { name: patient.name, order: s.work_order_number, balance })}
                />
              )}
            </div>
            {voided ? (
              <p className="text-sm text-[var(--oc-slate-500)]">Pedido anulado.</p>
            ) : delivered ? (
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
            ) : seller ? (
              <DeliverPanel saleId={s.id} balance={balance} />
            ) : (
              <p className="text-sm text-[var(--oc-slate-500)]">Pendiente de entrega.</p>
            )}
          </Card>

          {/* Laboratorio */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Laboratorio</h2>
              {labLate && <Badge tone="red">Atrasado: comprometido para el {formatDate(order?.lab_promised_date)}</Badge>}
            </div>
            <LabInfoForm
              saleId={s.id}
              disabled={voided || !seller}
              values={{
                lab_name: order?.lab_name ?? null,
                lab_order_ref: order?.lab_order_ref ?? null,
                lab_sent_at: order?.lab_sent_at ?? null,
                lab_promised_date: order?.lab_promised_date ?? null,
                lab_received_at: order?.lab_received_at ?? null,
              }}
            />
            {admin && !voided && (
              <div className="mt-5 pt-5 border-t border-[var(--oc-slate-200)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--oc-slate-500)] mb-3">Costo del laboratorio (solo administradora)</p>
                <LabCostForm saleId={s.id} labCost={order?.lab_cost != null ? Number(order.lab_cost) : null} labPaid={Boolean(order?.lab_paid)} labPaidAt={order?.lab_paid_at ?? null} />
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--oc-slate-500)] mb-1">Estado del pedido</p>
              {delivered || voided || !seller ? (
                <Badge tone={voided ? "red" : "green"}>{ORDER_STATUS_LABELS[status]}</Badge>
              ) : (
                <OrderStatusSelect saleId={s.id} status={status} />
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--oc-slate-500)] mb-1">Entrega estimada al cliente</p>
              {delivered || voided || !seller ? (
                <p className="text-sm text-[var(--oc-blue-950)]">{formatDate(s.estimated_delivery)}</p>
              ) : (
                <>
                  <EstimatedDeliveryInput saleId={s.id} value={s.estimated_delivery} />
                  {deliveryLate && <p className="text-xs text-[var(--oc-red)] mt-1">Fecha de entrega vencida</p>}
                </>
              )}
            </div>
            {!voided && balance > 0 && (
              <div>
                <p className="text-xs text-[var(--oc-slate-500)] mb-1">Fecha de compromiso de pago</p>
                {seller ? <PaymentDueDateInput saleId={s.id} value={s.payment_due_date} /> : <p className="text-sm">{formatDate(s.payment_due_date)}</p>}
              </div>
            )}
          </Card>

          {profit && (
            <Card className="p-5 text-sm">
              <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Rentabilidad estimada</h2>
              <p className="text-xs text-[var(--oc-slate-500)] mb-3">Solo la ves tú. No es dinero en caja: es la ganancia estimada de la venta.</p>
              <div className="space-y-1.5 tabular-nums">
                <div className="flex justify-between"><span>Precio vendido</span><span className="font-medium">{formatCLP(profit.revenue)}</span></div>
                <div className="flex justify-between text-[var(--oc-slate-700)]"><span>− Costo armazón</span><span>{formatCLP(profit.frame)}</span></div>
                <div className="flex justify-between text-[var(--oc-slate-700)]">
                  <span>− Cristales / laboratorio <span className="text-[11px] text-[var(--oc-slate-500)]">({profit.lensesSource === "laboratorio" ? "cobro real" : "estimado catálogo"})</span></span>
                  <span>{formatCLP(profit.lenses)}</span>
                </div>
                <div className="flex justify-between text-[var(--oc-slate-700)]"><span>− Otros costos directos</span><span>{formatCLP(profit.other)}</span></div>
                <div className={`flex justify-between border-t border-[var(--oc-slate-200)] pt-1.5 font-semibold ${profit.profit >= 0 ? "text-[var(--oc-green)]" : "text-[var(--oc-red)]"}`}>
                  <span>Utilidad bruta</span><span>{formatCLP(profit.profit)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[var(--oc-blue-950)]"><span>Margen</span><span>{profit.margin.toFixed(1)}%</span></div>
              </div>
              {!voided && (
                <div className="mt-4">
                  <p className="text-xs text-[var(--oc-slate-500)] mb-1">Otros costos directos (montaje, envíos…)</p>
                  <OtherCostsForm saleId={s.id} value={Number(s.other_costs || 0)} />
                </div>
              )}
            </Card>
          )}

          <Card className="p-5 space-y-3 text-sm">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Detalle</h2>
            <div>
              <p className="text-xs text-[var(--oc-slate-500)]">Paciente</p>
              <Link href={`/pacientes/${patient.id}`} className="font-medium text-[var(--oc-blue-800)] hover:underline">{patient.name}</Link>
              {patient.phone && (
                <a href={`tel:${String(patient.phone).replace(/\s/g, "")}`} className="flex items-center gap-1 text-[var(--oc-slate-700)] mt-0.5">
                  <Phone className="h-3.5 w-3.5" /> {patient.phone}
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
                  {s.client_owns_frame ? "Propio del paciente" : [s.frames?.code, s.frames?.brand, s.frames?.model, s.frames?.color].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {s.notes && (
              <div>
                <p className="text-xs text-[var(--oc-slate-500)]">Observaciones</p>
                <p className="text-[var(--oc-blue-950)]">{s.notes}</p>
              </div>
            )}
          </Card>

          {admin && !voided && (
            <Card className="p-5">
              <h2 className="font-display font-semibold text-[var(--oc-red)] mb-2">Anular venta</h2>
              <p className="text-xs text-[var(--oc-slate-500)] mb-3">
                Reversa los pagos recibidos (devolución de dinero en la caja de hoy), libera o devuelve el armazón al stock y cancela el pedido. La venta no se borra.
              </p>
              <ReasonAction action={voidSale.bind(null, s.id)} label="Anular esta venta" confirmLabel="Confirmar anulación" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
