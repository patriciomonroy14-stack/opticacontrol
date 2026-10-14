"use client";

import { useActionState } from "react";
import { addPrescription } from "../actions";
import { Field, inputCls } from "@/components/ui";

export function PrescriptionForm({ patientId }: { patientId: string }) {
  const action = addPrescription.bind(null, patientId);
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className="space-y-5 bg-[var(--oc-slate-50,#f8fafc)] border border-[var(--oc-slate-200)] rounded-xl p-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Fecha">
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
        </Field>
        <Field label="Médico / optometrista">
          <input name="professional_name" className={inputCls} placeholder="Dra. Camila Vergara" />
        </Field>
      </div>

      <div>
        <p className="text-sm font-semibold text-[var(--oc-blue-950)] mb-2">Ojo derecho (OD)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Esfera"><input name="od_sphere" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="Cilindro"><input name="od_cylinder" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="Eje"><input name="od_axis" type="number" className={inputCls} /></Field>
          <Field label="Adición"><input name="od_addition" type="number" step="0.25" className={inputCls} /></Field>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-[var(--oc-blue-950)] mb-2">Ojo izquierdo (OI)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Esfera"><input name="oi_sphere" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="Cilindro"><input name="oi_cylinder" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="Eje"><input name="oi_axis" type="number" className={inputCls} /></Field>
          <Field label="Adición"><input name="oi_addition" type="number" step="0.25" className={inputCls} /></Field>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="DP (mm)"><input name="dp" type="number" step="0.5" className={inputCls} /></Field>
        <Field label="Altura (mm)"><input name="height" type="number" step="0.5" className={inputCls} /></Field>
      </div>

      <Field label="Observaciones"><textarea name="notes" rows={2} className={inputCls} /></Field>

      <Field label="Adjuntar receta (foto o PDF)" hint="El OCR es una ayuda de transcripción; siempre revisa los datos antes de guardar.">
        <input name="attachment" type="file" accept="image/*,application/pdf" capture="environment" className={`${inputCls} py-1.5`} />
      </Field>

      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar receta"}
        </button>
      </div>
    </form>
  );
}
