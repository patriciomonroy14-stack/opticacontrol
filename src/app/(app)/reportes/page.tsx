import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard } from "@/components/ui";
import { canSeeFinance, formatCLP } from "@/lib/types";
import { redirect } from "next/navigation";
import { DollarSign, Users, CalendarCheck, PackageCheck } from "lucide-react";

export default async function ReportesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!canSeeFinance(profile?.role)) redirect("/dashboard");

  const [{ data: sales }, { data: appointments }, { data: orders }, { data: patients }] = await Promise.all([
    supabase.from("sales").select("total, payment_method, sale_date, purchase_type, frame_id, lens_id"),
    supabase.from("appointments").select("status"),
    supabase.from("orders").select("status"),
    supabase.from("patients").select("status, created_at"),
  ]);

  const totalSales = (sales || []).reduce((sum, s) => sum + Number(s.total), 0);
  const thisMonth = (sales || []).filter((s) => new Date(s.sale_date).getMonth() === new Date().getMonth());
  const thisMonthTotal = thisMonth.reduce((sum, s) => sum + Number(s.total), 0);

  const byPaymentMethod: Record<string, number> = {};
  (sales || []).forEach((s) => {
    const key = s.payment_method || "sin especificar";
    byPaymentMethod[key] = (byPaymentMethod[key] || 0) + Number(s.total);
  });

  const byPurchaseType: Record<string, number> = {};
  (sales || []).forEach((s) => {
    byPurchaseType[s.purchase_type] = (byPurchaseType[s.purchase_type] || 0) + 1;
  });

  const appointmentsReserved = (appointments || []).length;
  const appointmentsAttended = (appointments || []).filter((a) => a.status === "atendida").length;
  const appointmentsCancelled = (appointments || []).filter((a) => a.status === "cancelada" || a.status === "no_asistio").length;

  const ordersPending = (orders || []).filter((o) => !["entregado", "cancelado"].includes(o.status)).length;
  const ordersDelivered = (orders || []).filter((o) => o.status === "entregado").length;

  const activePatients = (patients || []).filter((p) => p.status === "activo").length;
  const inactivePatients = (patients || []).filter((p) => p.status === "inactivo").length;

  return (
    <div>
      <PageHeader title="Reportes" description="Indicadores clave de la operación de Óptica Retiro" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Ventas totales" value={formatCLP(totalSales)} icon={DollarSign} tone="green" />
        <StatCard label="Ventas del mes" value={formatCLP(thisMonthTotal)} icon={DollarSign} tone="green" />
        <StatCard label="Pacientes activos" value={activePatients} hint={`${inactivePatients} inactivos`} icon={Users} />
        <StatCard label="Horas atendidas" value={appointmentsAttended} hint={`${appointmentsReserved} reservadas total`} icon={CalendarCheck} />
        <StatCard label="Horas canceladas / ausentes" value={appointmentsCancelled} icon={CalendarCheck} tone="red" />
        <StatCard label="Pedidos pendientes" value={ordersPending} icon={PackageCheck} tone="amber" />
        <StatCard label="Pedidos entregados" value={ordersDelivered} icon={PackageCheck} tone="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Ventas por método de pago</h2>
          <ul className="space-y-2">
            {Object.entries(byPaymentMethod).map(([method, total]) => (
              <li key={method} className="flex items-center justify-between text-sm">
                <span className="capitalize text-[var(--oc-slate-700)]">{method}</span>
                <span className="font-medium text-[var(--oc-blue-950)] tabular-nums">{formatCLP(total)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Ventas por tipo de compra</h2>
          <ul className="space-y-2">
            {Object.entries(byPurchaseType).map(([type, count]) => (
              <li key={type} className="flex items-center justify-between text-sm">
                <span className="text-[var(--oc-slate-700)]">{type.replaceAll("_", " ")}</span>
                <span className="font-medium text-[var(--oc-blue-950)] tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="text-xs text-[var(--oc-slate-500)] mt-6">
        La exportación a Excel/PDF se puede habilitar conectando esta vista a las funciones de exportación del backend.
      </p>
    </div>
  );
}
