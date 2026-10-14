"use client";

import { useActionState } from "react";
import { createPatient } from "../actions";
import { Field, inputCls, Card } from "@/components/ui";

export function PatientForm() {
  const [state, formAction, pending] = useActionState(createPatient, { error: "" });

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre completo *">
            <input name="full_name" required className={inputCls} placeholder="Ej: Juan Pérez Soto" />
          </Field>
          <Field label="RUT">
            <input name="rut" className={inputCls} placeholder="11.111.111-1" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Fecha de nacimiento">
            <input name="birth_date" type="date" className={inputCls} />
          </Field>
          <Field label="Preferencia de contacto">
            <select name="contact_preference" className={inputCls} defaultValue="">
              <option value="">Selecciona…</option>
              <option value="Correo">Correo</option>
              <option value="Teléfono">Teléfono</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Teléfono">
            <input name="phone" className={inputCls} placeholder="+56 9 1234 5678" />
          </Field>
          <Field label="Correo electrónico">
            <input name="email" type="email" className={inputCls} placeholder="paciente@correo.com" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Dirección">
            <input name="address" className={inputCls} />
          </Field>
          <Field label="Comuna">
            <input name="comuna" className={inputCls} />
          </Field>
        </div>
        <Field label="Observaciones generales">
          <textarea name="notes" rows={3} className={inputCls} />
        </Field>

        {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar paciente"}
          </button>
        </div>
      </form>
    </Card>
  );
}
