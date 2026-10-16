"use client";

import { useActionState, useState } from "react";
import { createFrame } from "./actions";
import { Field, inputCls } from "@/components/ui";
import { Plus, X } from "lucide-react";

export const FRAME_TYPES = ["Óptico", "Sol", "Niño", "Deportivo", "Lectura"];

export function NewFrameForm({ showPurchasePrice }: { showPurchasePrice: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => {
      const result = await createFrame(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { error: "" },
  );

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-blue-800)]">
        <Plus className="h-4 w-4" /> Nuevo armazón
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--oc-slate-200)] shadow-sm p-6 mb-6 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Nuevo armazón</h2>
        <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg hover:bg-[var(--oc-slate-100)] flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Código *"><input name="code" required autoFocus className={inputCls} placeholder="ARM-007" /></Field>
          <Field label="Tipo">
            <input name="frame_type" list="frame-types" autoComplete="off" className={inputCls} placeholder="Óptico, sol, niño…" />
            <datalist id="frame-types">
              {FRAME_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Marca"><input name="brand" className={inputCls} /></Field>
          <Field label="Color"><input name="color" className={inputCls} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Precio de venta"><input name="sale_price" type="number" min={0} className={inputCls} /></Field>
          <Field label="Stock"><input name="stock" type="number" min={0} defaultValue={1} className={inputCls} /></Field>
        </div>
        {showPurchasePrice && (
          <Field label="Costo (opcional, solo lo ves tú)" hint="Sirve para calcular la ganancia de cada venta">
            <input name="purchase_price" type="number" min={0} className={inputCls} />
          </Field>
        )}

        {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar armazón"}
          </button>
        </div>
      </form>
    </div>
  );
}
