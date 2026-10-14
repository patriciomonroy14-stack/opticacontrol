"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Phone, MessageCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui";
import { APPOINTMENT_STATUS_LABELS, whatsappLink } from "@/lib/types";

export type CalendarAppointment = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  professional: string | null;
  status: string;
  patient_name: string | null;
  phone: string | null;
};

export type BusinessHours = Record<string, string | null | undefined>;

const SLOT_MINUTES = 30;
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const INACTIVE = new Set(["cancelada", "no_asistio"]);

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function toHHMM(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Rango de atención ("09:00-19:00") para una fecha, según el día de la semana. */
function hoursFor(date: string, hours: BusinessHours): [number, number] | null {
  const dow = new Date(date + "T12:00:00Z").getUTCDay(); // 0 = domingo
  const key = dow === 0 ? "domingo" : dow === 6 ? "sabado" : "lunes_viernes";
  const range = hours[key];
  if (!range || !range.includes("-")) return null;
  const [start, end] = range.split("-").map((s) => s.trim());
  return [toMinutes(start), toMinutes(end)];
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function AgendaCalendar({
  month,
  today,
  nowMinutes,
  initialDay,
  appointments,
  businessHours,
}: {
  month: string; // YYYY-MM
  today: string; // YYYY-MM-DD (hora de Chile)
  nowMinutes: number; // minutos desde medianoche, hora de Chile
  initialDay: string;
  appointments: CalendarAppointment[];
  businessHours: BusinessHours;
}) {
  const [selected, setSelected] = useState(initialDay);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const a of appointments) {
      const list = map.get(a.appointment_date) ?? [];
      list.push(a);
      map.set(a.appointment_date, list);
    }
    return map;
  }, [appointments]);

  // Celdas del mes, empezando en lunes
  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7;
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month]);

  const monthLabel = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(month + "-01T12:00:00Z"),
  );

  const dayAppointments = byDay.get(selected) ?? [];
  const activeTimes = new Set(
    dayAppointments.filter((a) => !INACTIVE.has(a.status)).map((a) => a.appointment_time.slice(0, 5)),
  );

  const range = hoursFor(selected, businessHours);
  const freeSlots: string[] = [];
  if (range && selected >= today) {
    for (let t = range[0]; t + SLOT_MINUTES <= range[1]; t += SLOT_MINUTES) {
      if (selected === today && t <= nowMinutes) continue;
      const hhmm = toHHMM(t);
      if (!activeTimes.has(hhmm)) freeSlots.push(hhmm);
    }
  }

  const selectedLabel = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(selected + "T12:00:00Z"),
  );

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Calendario */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/dashboard?mes=${shiftMonth(month, -1)}`}
            className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <p className="font-display font-semibold text-[var(--oc-blue-950)] capitalize">{monthLabel}</p>
          <Link
            href={`/dashboard?mes=${shiftMonth(month, 1)}`}
            className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <p key={w} className="text-[11px] font-medium text-[var(--oc-slate-500)] py-1">{w}</p>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const count = (byDay.get(date) ?? []).filter((a) => !INACTIVE.has(a.status)).length;
            const isSelected = date === selected;
            const isToday = date === today;
            const base = "relative aspect-square rounded-lg text-sm font-medium flex flex-col items-center justify-center transition-colors";
            const tone = isSelected
              ? "bg-[var(--oc-blue-700)] text-white"
              : count > 0
                ? "bg-[var(--oc-red-bg)] text-[var(--oc-red)] hover:brightness-95"
                : "text-[var(--oc-slate-700)] hover:bg-[var(--oc-slate-100)]";
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                className={`${base} ${tone} ${isToday && !isSelected ? "ring-2 ring-[var(--oc-blue-500)]" : ""}`}
              >
                <span>{Number(date.slice(8))}</span>
                {count > 0 && (
                  <span className={`text-[10px] leading-none mt-0.5 ${isSelected ? "text-white/90" : ""}`}>
                    {count} {count === 1 ? "hora" : "horas"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 text-[11px] text-[var(--oc-slate-500)]">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[var(--oc-red-bg)] border border-[var(--oc-red)]" /> Con pacientes</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-[var(--oc-blue-500)]" /> Hoy</span>
        </div>
      </div>

      {/* Detalle del día */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-semibold text-[var(--oc-blue-950)] capitalize">{selected === today ? `Hoy, ${selectedLabel}` : selectedLabel}</p>
          <Link href={`/agenda?date=${selected}`} className="text-xs font-medium text-[var(--oc-blue-700)]">Abrir en agenda</Link>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--oc-slate-500)] mb-2">
          Pacientes · {dayAppointments.length}
        </p>
        {dayAppointments.length === 0 ? (
          <p className="text-sm text-[var(--oc-slate-500)] mb-5">No hay pacientes agendados este día.</p>
        ) : (
          <ul className="divide-y divide-[var(--oc-slate-100)] rounded-xl border border-[var(--oc-slate-200)] mb-5">
            {dayAppointments.map((a) => {
              const wa = whatsappLink(a.phone);
              const cancelled = INACTIVE.has(a.status);
              return (
                <li key={a.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${cancelled ? "opacity-50" : ""}`}>
                  <p className="font-display font-bold text-[var(--oc-blue-800)] w-12 shrink-0 tabular-nums">{a.appointment_time.slice(0, 5)}</p>
                  <div className="flex-1 min-w-[9rem]">
                    <p className="text-sm font-medium text-[var(--oc-blue-950)]">{a.patient_name}</p>
                    <p className="text-xs text-[var(--oc-slate-500)]">{a.reason || "Sin motivo"}{a.professional ? ` · ${a.professional}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.phone ? (
                      <>
                        <a
                          href={`tel:${a.phone.replace(/\s/g, "")}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--oc-slate-200)] px-3 py-1.5 text-sm font-medium text-[var(--oc-blue-900)] hover:bg-[var(--oc-slate-100)] tabular-nums"
                        >
                          <Phone className="h-3.5 w-3.5" /> {a.phone}
                        </a>
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Escribir por WhatsApp"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[var(--oc-green-bg)] text-[var(--oc-green)] hover:opacity-80"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-[var(--oc-slate-500)]">Sin teléfono</span>
                    )}
                    <Badge tone={a.status === "confirmada" || a.status === "atendida" ? "green" : cancelled ? "red" : "blue"}>
                      {APPOINTMENT_STATUS_LABELS[a.status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? a.status}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--oc-slate-500)] mb-2">
          Horas disponibles{range && selected >= today ? ` · ${freeSlots.length}` : ""}
        </p>
        {selected < today ? (
          <p className="text-sm text-[var(--oc-slate-500)]">Este día ya pasó.</p>
        ) : !range ? (
          <p className="text-sm text-[var(--oc-slate-500)]">La óptica no atiende este día.</p>
        ) : freeSlots.length === 0 ? (
          <p className="text-sm text-[var(--oc-slate-500)]">No quedan horas disponibles.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {freeSlots.map((t) => (
                <Link
                  key={t}
                  href={`/agenda?date=${selected}&time=${t}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--oc-green)] bg-[var(--oc-green-bg)] px-2.5 py-1.5 text-sm font-medium text-[var(--oc-green)] hover:brightness-95 tabular-nums"
                >
                  <Plus className="h-3 w-3" /> {t}
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-[var(--oc-slate-500)] mt-2">Toca una hora libre para agendarla.</p>
          </>
        )}
      </div>
    </div>
  );
}
