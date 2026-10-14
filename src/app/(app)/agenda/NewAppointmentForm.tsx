"use client";

import { useActionState } from "react";
import { createAppointment } from "./actions";
import { Field, inputCls } from "@/components/ui";
import { todayCL } from "@/lib/types";

export function NewAppointmentForm({
  patients,
  defaultDate,
  defaultTime,
}: {
  patients: { id: string; full_name: string }[];
  defaultDate?: string;
  defaultTime?: string;
}) {
  const [state, formAction, pending] = useActionState(createAppointment, { error: "" });

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nombre del paciente">
        <input
          name="patient_name"
          required
          list="agenda-patients"
          autoComplete="off"
          autoFocus={Boolean(defaultTime)}
          className={inputCls}
          placeholder="Escribe el nombre…"
        />
        <datalist id="agenda-patients">
          {patients.map((p) => (
            <option key={p.id} value={p.full_name} />
          ))}
        </datalist>
      </Field>
      <Field label="Teléfono (opcional)">
        <input name="patient_phone" type="tel" className={inputCls} placeholder="+56 9 1234 5678" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input name="appointment_date" type="date" required className={inputCls} defaultValue={defaultDate ?? todayCL()} />
        </Field>
        <Field label="Hora">
          <input name="appointment_time" type="time" required className={inputCls} defaultValue={defaultTime} />
        </Field>
      </div>
      <Field label="Profesional">
        <input name="professional" className={inputCls} placeholder="Dra. Camila Vergara" />
      </Field>
      <Field label="Motivo">
        <input name="reason" className={inputCls} placeholder="Control anual, toma de medidas…" />
      </Field>
      <Field label="Observaciones">
        <textarea name="notes" rows={2} className={inputCls} />
      </Field>

      <p className="text-xs text-[var(--oc-slate-500)]">
        Si el paciente no está registrado, se crea automáticamente con este nombre.
      </p>

      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
          {pending ? "Agendando…" : "Agendar hora"}
        </button>
      </div>
    </form>
  );
}
