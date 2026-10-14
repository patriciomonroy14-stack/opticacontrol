import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard, Badge, PrimaryButton } from "@/components/ui";
import { canSeeFinance, formatCLP, formatDate, todayCL, PURCHASE_TYPE_LABELS } from "@/lib/types";
import { Users, CalendarClock, CalendarPlus, DollarSign, PackageCheck, UserPlus, ShoppingCart, Send } from "lucide-react";
import Link from "next/link";
import { AgendaCalendar, type CalendarAppointment, type BusinessHours } from "./AgendaCalendar";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const today = todayCL();
  const month = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : today.slice(0, 7);
  const [my, mm] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(Date.UTC(my, mm, 0)).getUTCDate()).padStart(2, "0")}`;
  const nowParts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const nowMinutes = Number(nowParts.slice(0, 2)) * 60 + Number(nowParts.slice(3, 5));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const showFinance = canSeeFinance(profile?.role);

  const [{ data: summary }, { data: monthAppointments }, { data: readyOrders }, { data: recentSales }, { data: toContact }, { data: hoursSetting }, { data: patientOptions }] =
    await Promise.all([
      supabase.from("dashboard_summary").select("*").maybeSingle(),
      supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, reason, status, professional, patients(full_name, phone)")
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true }),
      supabase.from("ready_orders").select("*").order("days_waiting", { ascending: false }).limit(5),
      supabase
        .from("sales")
        .select("id, sale_date, total, purchase_type, payment_status, patients(full_name)")
        .order("sale_date", { ascending: false })
        .limit(5),
      supabase
        .from("patient_last_purchase")
        .select("*")
        .gte("months_since_last_purchase", 24)
        .eq("status", "activo")
        .order("months_since_last_purchase", { ascending: false })
        .limit(5),
      supabase.from("settings").select("value").eq("key", "business_hours").maybeSingle(),
      supabase.from("patients").select("id, full_name").eq("status", "activo").order("full_name"),
    ]);

  const calendarAppointments: CalendarAppointment[] = (monthAppointments || []).map((a: any) => ({
    id: a.id,
    appointment_date: a.appointment_date,
    appointment_time: a.appointment_time,
    reason: a.reason,
    professional: a.professional,
    status: a.status,
    patient_name: a.patients?.full_name ?? null,
    phone: a.patients?.phone ?? null,
  }));
  const businessHours: BusinessHours = (hoursSetting?.value as BusinessHours) ?? { lunes_viernes: "09:00-19:00", sabado: "09:00-14:00" };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen del día en Óptica Retiro"
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton href="/agenda"><CalendarPlus className="h-4 w-4" /> Agendar hora</PrimaryButton>
            <PrimaryButton href="/pacientes/nuevo" className="bg-[var(--oc-blue-800)] hover:bg-[var(--oc-blue-900)]"><UserPlus className="h-4 w-4" /> Nuevo paciente</PrimaryButton>
            <PrimaryButton href="/ventas/nueva" className="bg-[var(--oc-blue-800)] hover:bg-[var(--oc-blue-900)]"><ShoppingCart className="h-4 w-4" /> Nueva venta</PrimaryButton>
          </div>
        }
      />

      <Card className="p-4 md:p-5 mb-6">
        <AgendaCalendar
          key={month}
          month={month}
          today={today}
          nowMinutes={nowMinutes}
          appointments={calendarAppointments}
          businessHours={businessHours}
          patients={patientOptions || []}
        />
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pacientes registrados" value={summary?.total_patients ?? 0} icon={Users} />
        <StatCard label="Horas de hoy" value={summary?.appointments_today ?? 0} hint={`${summary?.appointments_pending_today ?? 0} pendientes`} icon={CalendarClock} />
        {showFinance && <StatCard label="Ventas del día" value={formatCLP(summary?.sales_today ?? 0)} icon={DollarSign} tone="green" />}
        {showFinance && <StatCard label="Ventas del mes" value={formatCLP(summary?.sales_this_month ?? 0)} icon={DollarSign} tone="green" />}
        {showFinance && <StatCard label="Pagos pendientes" value={formatCLP(summary?.sales_pending_payment ?? 0)} icon={DollarSign} tone="amber" />}
        <StatCard label="Órdenes en proceso" value={summary?.orders_in_process ?? 0} icon={PackageCheck} tone="blue" />
        <StatCard label="Listas para entregar" value={summary?.orders_ready ?? 0} icon={PackageCheck} tone="amber" />
        <StatCard label="Clientes por contactar" value={toContact?.length ?? 0} hint="24+ meses sin comprar" icon={Send} tone="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Pedidos listos para entregar</h2>
            <Link href="/ordenes" className="text-xs font-medium text-[var(--oc-blue-700)]">Ver órdenes</Link>
          </div>
          {!readyOrders || readyOrders.length === 0 ? (
            <p className="text-sm text-[var(--oc-slate-500)]">No hay pedidos esperando retiro.</p>
          ) : (
            <ul className="space-y-3">
              {readyOrders.map((o: any) => (
                <li key={o.order_id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--oc-blue-950)]">{o.patient_name}</p>
                    <p className="text-xs text-[var(--oc-slate-500)]">{o.phone} · {PURCHASE_TYPE_LABELS[o.purchase_type as keyof typeof PURCHASE_TYPE_LABELS]}</p>
                  </div>
                  <Badge tone={o.days_waiting > 5 ? "red" : "amber"}>{o.days_waiting} días</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Últimas ventas</h2>
            <Link href="/ventas" className="text-xs font-medium text-[var(--oc-blue-700)]">Ver ventas</Link>
          </div>
          {!recentSales || recentSales.length === 0 ? (
            <p className="text-sm text-[var(--oc-slate-500)]">Aún no hay ventas registradas.</p>
          ) : (
            <ul className="space-y-3">
              {recentSales.map((s: any) => (
                <li key={s.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--oc-blue-950)]">{s.patients?.full_name}</p>
                    <p className="text-xs text-[var(--oc-slate-500)]">{formatDate(s.sale_date)} · {PURCHASE_TYPE_LABELS[s.purchase_type as keyof typeof PURCHASE_TYPE_LABELS]}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--oc-blue-950)] tabular-nums">{formatCLP(s.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Pacientes que deben ser contactados</h2>
          <Link href="/marketing" className="text-xs font-medium text-[var(--oc-blue-700)]">Ver marketing</Link>
        </div>
        {!toContact || toContact.length === 0 ? (
          <p className="text-sm text-[var(--oc-slate-500)]">No hay pacientes con 24 o más meses sin comprar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="pb-2 font-medium">Paciente</th>
                  <th className="pb-2 font-medium">Teléfono</th>
                  <th className="pb-2 font-medium">Última compra</th>
                  <th className="pb-2 font-medium">Meses sin comprar</th>
                </tr>
              </thead>
              <tbody>
                {toContact.map((p: any) => (
                  <tr key={p.patient_id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                    <td className="py-2 font-medium text-[var(--oc-blue-950)]">{p.full_name}</td>
                    <td className="py-2 text-[var(--oc-slate-500)]">{p.phone}</td>
                    <td className="py-2 text-[var(--oc-slate-500)]">{formatDate(p.last_purchase_date)}</td>
                    <td className="py-2"><Badge tone="red">{Math.floor(p.months_since_last_purchase)} meses</Badge></td>
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
