import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { formatDate, APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { AppointmentActions } from "./AppointmentActions";
import { NewAppointmentForm } from "./NewAppointmentForm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const selectedDate = date || new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [{ data: appointments }, { data: patients }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, patients(full_name, phone)")
      .eq("appointment_date", selectedDate)
      .order("appointment_time", { ascending: true }),
    supabase.from("patients").select("id, full_name").eq("status", "activo").order("full_name"),
  ]);

  return (
    <div>
      <PageHeader title="Agenda" description="Gestiona las horas de atención de Óptica Retiro" />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href={`/agenda?date=${shiftDate(selectedDate, -1)}`} className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <p className="font-display font-semibold text-[var(--oc-blue-950)] w-44 text-center capitalize">{formatDate(selectedDate)}</p>
              <Link href={`/agenda?date=${shiftDate(selectedDate, 1)}`} className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <Link href={`/agenda?date=${new Date().toISOString().slice(0, 10)}`} className="text-xs font-medium text-[var(--oc-blue-700)]">Hoy</Link>
          </div>

          <Card>
            {!appointments || appointments.length === 0 ? (
              <EmptyState title="Sin horas para este día" description="Agenda una nueva hora desde el formulario a la derecha." />
            ) : (
              <ul className="divide-y divide-[var(--oc-slate-100)]">
                {appointments.map((a: any) => (
                  <li key={a.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center w-14 shrink-0">
                        <p className="font-display font-bold text-[var(--oc-blue-800)]">{a.appointment_time?.slice(0, 5)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-[var(--oc-blue-950)]">{a.patients?.full_name}</p>
                        <p className="text-xs text-[var(--oc-slate-500)]">{a.reason || "Sin motivo"} · {a.professional || "Sin asignar"} · {a.patients?.phone}</p>
                        <p className="text-xs text-[var(--oc-blue-700)] font-medium mt-0.5">{APPOINTMENT_STATUS_LABELS[a.status as keyof typeof APPOINTMENT_STATUS_LABELS]}</p>
                      </div>
                    </div>
                    <AppointmentActions id={a.id} status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-5">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Nueva hora</h2>
            <NewAppointmentForm patients={patients || []} />
          </Card>
        </div>
      </div>
    </div>
  );
}
