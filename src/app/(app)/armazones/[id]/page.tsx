import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Glasses } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { formatCLP, formatDateTime, isAdmin } from "@/lib/types";
import { getSession } from "@/lib/session";
import { AdjustStockForm, EditFrameForm } from "./FrameControls";

const KIND_LABELS: Record<string, string> = {
  ingreso: "Ingreso de mercadería",
  ajuste: "Ajuste",
  reserva: "Reserva por venta",
  liberacion: "Reserva liberada",
  entrega: "Entregado al cliente",
  devolucion: "Devolución",
};

export default async function FrameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await getSession();
  const admin = isAdmin(role);

  const columns = "id, code, frame_type, brand, model, color, material, supplier, sale_price, stock, reserved, photo_url, notes, created_at" + (admin ? ", purchase_price" : "");
  const [{ data: frame }, { data: movements }] = await Promise.all([
    supabase.from("frames").select(columns).eq("id", id).maybeSingle(),
    supabase
      .from("inventory_movements")
      .select("id, kind, stock_change, reserved_change, reason, created_at, created_by, sale_id, sales(work_order_number)")
      .eq("frame_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (!frame) notFound();
  const f = frame as any;
  const available = Number(f.stock) - Number(f.reserved || 0);

  const userIds = [...new Set((movements || []).map((m) => m.created_by).filter(Boolean))] as string[];
  const { data: people } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] };
  const nameOf = (uid: string | null) => people?.find((p) => p.id === uid)?.full_name ?? (uid ? "—" : "Sistema");

  return (
    <div className="max-w-5xl">
      <Link href="/armazones" className="inline-flex items-center gap-1 text-sm text-[var(--oc-slate-500)] hover:text-[var(--oc-blue-700)] mb-3">
        <ArrowLeft className="h-4 w-4" /> Armazones
      </Link>
      <PageHeader title={`${f.code} · ${[f.brand, f.model].filter(Boolean).join(" ") || "Sin marca"}`} description={[f.frame_type, f.color, f.material, f.supplier].filter(Boolean).join(" · ")} />

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Stock físico</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-blue-950)] mt-1">{f.stock}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Reservados (ventas sin entregar)</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-amber)] mt-1">{f.reserved || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Disponibles para vender</p>
          <p className={`font-display font-bold text-2xl mt-1 ${available > 1 ? "text-[var(--oc-green)]" : "text-[var(--oc-red)]"}`}>{available}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--oc-slate-500)]">Precio de venta</p>
          <p className="font-display font-bold text-2xl text-[var(--oc-blue-950)] mt-1">{formatCLP(f.sale_price)}</p>
          {admin && <p className="text-xs text-[var(--oc-slate-500)] mt-1">Costo {formatCLP(f.purchase_price)}</p>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Historial de movimientos</h2>
            {!movements || movements.length === 0 ? (
              <p className="text-sm text-[var(--oc-slate-500)]">Sin movimientos registrados.</p>
            ) : (
              <ul className="divide-y divide-[var(--oc-slate-100)]">
                {movements.map((m: any) => (
                  <li key={m.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-[var(--oc-blue-950)]">
                        {KIND_LABELS[m.kind] ?? m.kind}
                        {m.sale_id && (
                          <Link href={`/ventas/${m.sale_id}`} className="ml-2 text-xs font-normal text-[var(--oc-blue-700)] hover:underline">
                            {m.sales?.work_order_number ?? "ver venta"}
                          </Link>
                        )}
                      </p>
                      <p className="text-xs text-[var(--oc-slate-500)]">
                        {formatDateTime(m.created_at)} · {nameOf(m.created_by)}
                        {m.reason ? ` · ${m.reason}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs tabular-nums whitespace-nowrap">
                      {m.stock_change !== 0 && (
                        <p className={m.stock_change > 0 ? "text-[var(--oc-green)]" : "text-[var(--oc-red)]"}>
                          Stock {m.stock_change > 0 ? "+" : ""}{m.stock_change}
                        </p>
                      )}
                      {m.reserved_change !== 0 && (
                        <p className="text-[var(--oc-amber)]">Reserva {m.reserved_change > 0 ? "+" : ""}{m.reserved_change}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="h-48 bg-[var(--oc-slate-100)] flex items-center justify-center">
              {f.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.photo_url} alt={f.code} className="h-full w-full object-cover" />
              ) : (
                <Glasses className="h-12 w-12 text-[var(--oc-slate-300)]" />
              )}
            </div>
          </Card>

          {admin && (
            <Card className="p-5">
              <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Ajustar inventario</h2>
              <p className="text-xs text-[var(--oc-slate-500)] mb-4">Solo tú. Cada movimiento queda en el historial con su motivo.</p>
              <AdjustStockForm frameId={f.id} />
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Datos del armazón</h2>
            <EditFrameForm
              frameId={f.id}
              admin={admin}
              values={{
                frame_type: f.frame_type,
                brand: f.brand,
                model: f.model,
                color: f.color,
                material: f.material,
                supplier: f.supplier,
                notes: f.notes,
                sale_price: f.sale_price,
                purchase_price: admin ? f.purchase_price : undefined,
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
