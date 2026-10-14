"use client";

import { useActionState } from "react";
import { createAppointment } from "./actions";
import { Field, inputCls } from "@/components/ui";

export function NewAppointmentForm({ patients }: { patients: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(createAppointment, { error: "" });

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Paciente">
        <select name="patient_id" required className={inputCls} defaultValue="">
          <option value="" disabled>Selecciona un paciente…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input name="appointment_date" type="date" required className={inputCls} defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Hora">
          <input name="appointment_time" type="time" required className={inputCls} />
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

      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
          {pending ? "Agendando…" : "Agendar hora"}
        </button>
      </div>
    </form>
  );
}
