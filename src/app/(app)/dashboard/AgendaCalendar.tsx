"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Phone, MessageCircle, Plus, X } from "lucide-react";
import { Badge, inputCls } from "@/components/ui";
import { APPOINTMENT_STATUS_LABELS, whatsappLink } from "@/lib/types";
import { createAppointment } from "@/app/(app)/agenda/actions";

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

export type BusinessHours = Record<string, string | number | null | undefined>;

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
  if (typeof range !== "string" || !range.includes("-")) return null;
  const [start, end] = range.split("-").map((s) => s.trim());
  return [toMinutes(start), toMinutes(end)];
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(date + "T12:00:00Z"),
  );
}

export function AgendaCalendar({
  month,
  today,
  nowMinutes,
  appointments,
  businessHours,
  patients,
}: {
  month: string; // YYYY-MM
  today: string; // YYYY-MM-DD (hora de Chile)
  nowMinutes: number; // minutos desde medianoche, hora de Chile
  appointments: CalendarAppointment[];
  businessHours: BusinessHours;
  patients: { id: string; full_name: string }[];
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard?mes=${shiftMonth(month, -1)}`}
            className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <p className="font-display font-bold text-lg text-[var(--oc-blue-950)] capitalize w-44 text-center">{monthLabel}</p>
          <Link
            href={`/dashboard?mes=${shiftMonth(month, 1)}`}
            className="h-9 w-9 rounded-lg border border-[var(--oc-slate-200)] bg-white flex items-center justify-center hover:bg-[var(--oc-slate-100)]"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {month !== today.slice(0, 7) && (
            <Link href="/dashboard" className="text-xs font-medium text-[var(--oc-blue-700)]">Volver a hoy</Link>
          )}
          <button
            type="button"
            onClick={() => setOpenDay(today)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-800)]"
          >
            <Plus className="h-4 w-4" /> Dar hora hoy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-[var(--oc-slate-200)] rounded-xl overflow-hidden">
        {WEEKDAYS.map((w) => (
          <p
            key={w}
            className="text-xs font-semibold text-[var(--oc-slate-500)] py-2 text-center bg-[var(--oc-slate-100)] border-r border-b border-[var(--oc-slate-200)]"
          >
            {w}
          </p>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} className="bg-[var(--oc-slate-100)]/40 border-r border-b border-[var(--oc-slate-200)]" />;
          const all = byDay.get(date) ?? [];
          const active = all.filter((a) => !INACTIVE.has(a.status));
          const isToday = date === today;
          const isPast = date < today;
          const closed = !hoursFor(date, businessHours);
          return (
            <button
              key={date}
              type="button"
              onClick={() => setOpenDay(date)}
              className={`text-left min-h-[4.5rem] md:min-h-[7rem] p-1.5 md:p-2 border-r border-b border-[var(--oc-slate-200)] flex flex-col gap-1 transition-colors
                ${active.length > 0 ? "bg-[var(--oc-red-bg)] hover:brightness-[0.97]" : closed ? "bg-[var(--oc-slate-100)]/60 hover:bg-[var(--oc-slate-100)]" : "bg-white hover:bg-[var(--oc-blue-50)]"}
                ${isPast ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-semibold h-7 w-7 rounded-full flex items-center justify-center
                    ${isToday ? "bg-[var(--oc-blue-700)] text-white" : active.length > 0 ? "text-[var(--oc-red)]" : "text-[var(--oc-slate-700)]"}`}
                >
                  {Number(date.slice(8))}
                </span>
                {active.length > 0 && (
                  <span className="text-[10px] md:text-xs font-semibold text-[var(--oc-red)]">
                    {active.length}<span className="hidden md:inline"> {active.length === 1 ? "hora" : "horas"}</span>
                  </span>
                )}
              </div>
              <div className="hidden md:flex flex-col gap-0.5">
                {active.slice(0, 3).map((a) => (
                  <p key={a.id} className="truncate text-[11px] leading-tight rounded px-1 py-0.5 bg-white/70 text-[var(--oc-red)] font-medium">
                    {a.appointment_time.slice(0, 5)} {a.patient_name}
                  </p>
                ))}
                {active.length > 3 && <p className="text-[11px] text-[var(--oc-red)] px-1">+{active.length - 3} más</p>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[var(--oc-slate-500)]">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[var(--oc-red-bg)] border border-[var(--oc-red)]" /> Días con pacientes</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[var(--oc-blue-700)]" /> Hoy</span>
        <span>Toca un día para ver sus horarios y dar hora.</span>
      </div>

      {openDay && (
        <DayPanel
          key={openDay}
          date={openDay}
          today={today}
          nowMinutes={nowMinutes}
          appointments={byDay.get(openDay) ?? []}
          range={hoursFor(openDay, businessHours)}
          slotMinutes={Number(businessHours.slot_minutes) || 15}
          patients={patients}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}

type Row = { time: string; appointments: CalendarAppointment[] };

function DayPanel({
  date,
  today,
  nowMinutes,
  appointments,
  range,
  patients,
  onClose,
  slotMinutes,
}: {
  slotMinutes: number;
  date: string;
  today: string;
  nowMinutes: number;
  appointments: CalendarAppointment[];
  range: [number, number] | null;
  patients: { id: string; full_name: string }[];
  onClose: () => void;
}) {
  const [booking, setBooking] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Todos los bloques del horario + cualquier hora agendada fuera de esos bloques
  const rows: Row[] = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    if (range) for (let t = range[0]; t + slotMinutes <= range[1]; t += slotMinutes) map.set(toHHMM(t), []);
    for (const a of appointments) {
      const t = a.appointment_time.slice(0, 5);
      map.set(t, [...(map.get(t) ?? []), a]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, list]) => ({ time, appointments: list }));
  }, [appointments, range, slotMinutes]);

  const isPast = date < today;
  const isBookable = (time: string) => !isPast && !(date === today && toMinutes(time) <= nowMinutes);
  const freeCount = rows.filter((r) => isBookable(r.time) && r.appointments.every((a) => INACTIVE.has(a.status))).length;
  const busyCount = appointments.filter((a) => !INACTIVE.has(a.status)).length;

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-[var(--oc-blue-950)]/40 p-0 md:p-6" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--oc-slate-200)]">
          <div>
            <p className="font-display font-bold text-lg text-[var(--oc-blue-950)] capitalize">
              {date === today ? `Hoy, ${longDate(date)}` : longDate(date)}
            </p>
            <p className="text-xs text-[var(--oc-slate-500)] mt-0.5">
              {busyCount} {busyCount === 1 ? "paciente" : "pacientes"}
              {range && !isPast ? ` · ${freeCount} ${freeCount === 1 ? "hora disponible" : "horas disponibles"}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-[var(--oc-slate-100)] flex items-center justify-center" aria-label="Cerrar">
            <X className="h-5 w-5 text-[var(--oc-slate-500)]" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-3">
          {!range && appointments.length === 0 ? (
            <p className="text-sm text-[var(--oc-slate-500)] py-6 text-center">La óptica no atiende este día.</p>
          ) : (
            <ul className="divide-y divide-[var(--oc-slate-100)]">
              {rows.map((row) => {
                const active = row.appointments.filter((a) => !INACTIVE.has(a.status));
                const cancelled = row.appointments.filter((a) => INACTIVE.has(a.status));
                const bookable = isBookable(row.time) && active.length === 0;
                return (
                  <li key={row.time} className="py-2.5 flex gap-4">
                    <p className={`font-display font-bold w-12 shrink-0 tabular-nums pt-1.5 ${active.length ? "text-[var(--oc-red)]" : "text-[var(--oc-slate-500)]"}`}>
                      {row.time}
                    </p>
                    <div className="flex-1 min-w-0 space-y-2">
                      {[...active, ...cancelled].map((a) => (
                        <AppointmentRow key={a.id} a={a} />
                      ))}
                      {bookable &&
                        (booking === row.time ? (
                          <QuickBookForm
                            date={date}
                            time={row.time}
                            patients={patients}
                            onCancel={() => setBooking(null)}
                            onDone={() => setBooking(null)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBooking(row.time)}
                            className="w-full text-left flex items-center justify-between rounded-lg border border-dashed border-[var(--oc-green)] bg-[var(--oc-green-bg)]/50 px-3 py-2 text-sm text-[var(--oc-green)] hover:bg-[var(--oc-green-bg)]"
                          >
                            <span className="font-medium">Disponible</span>
                            <span className="inline-flex items-center gap-1 font-semibold"><Plus className="h-4 w-4" /> Dar hora</span>
                          </button>
                        ))}
                      {!bookable && active.length === 0 && cancelled.length === 0 && (
                        <p className="text-sm text-[var(--oc-slate-500)] pt-1.5">—</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentRow({ a }: { a: CalendarAppointment }) {
  const wa = whatsappLink(a.phone);
  const cancelled = INACTIVE.has(a.status);
  return (
    <div className={`rounded-lg border border-[var(--oc-red)]/30 bg-[var(--oc-red-bg)] px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 ${cancelled ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-[8rem]">
        <p className="text-sm font-semibold text-[var(--oc-blue-950)]">{a.patient_name}</p>
        <p className="text-xs text-[var(--oc-slate-500)]">{a.reason || "Sin motivo"}{a.professional ? ` · ${a.professional}` : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        {a.phone ? (
          <>
            <a
              href={`tel:${a.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[var(--oc-slate-200)] px-3 py-1 text-sm font-medium text-[var(--oc-blue-900)] hover:bg-[var(--oc-slate-100)] tabular-nums"
            >
              <Phone className="h-3.5 w-3.5" /> {a.phone}
            </a>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                title="Escribir por WhatsApp"
                className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[var(--oc-green-bg)] text-[var(--oc-green)] hover:opacity-80"
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
    </div>
  );
}

function QuickBookForm({
  date,
  time,
  patients,
  onCancel,
  onDone,
}: {
  date: string;
  time: string;
  patients: { id: string; full_name: string }[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createAppointment, { error: "" });
  const listId = `quick-patients-${time.replace(":", "")}`;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <form action={formAction} className="rounded-lg border border-[var(--oc-blue-500)] bg-[var(--oc-blue-50)] p-3 space-y-2">
      <input type="hidden" name="appointment_date" value={date} />
      <input type="hidden" name="appointment_time" value={time} />
      <input
        name="patient_name"
        required
        autoFocus
        list={listId}
        autoComplete="off"
        className={inputCls}
        placeholder="Nombre del paciente"
      />
      <datalist id={listId}>
        {patients.map((p) => (
          <option key={p.id} value={p.full_name} />
        ))}
      </datalist>
      <div className="grid grid-cols-2 gap-2">
        <input name="patient_phone" type="tel" className={inputCls} placeholder="Teléfono (opcional)" />
        <input name="reason" className={inputCls} placeholder="Motivo (opcional)" />
      </div>
      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-medium text-[var(--oc-slate-700)] hover:bg-white">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-800)] disabled:opacity-60"
        >
          {pending ? "Agendando…" : `Agendar ${time}`}
        </button>
      </div>
    </form>
  );
}
