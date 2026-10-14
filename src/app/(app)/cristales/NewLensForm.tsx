"use client";

import { useActionState, useState } from "react";
import { createLens } from "./actions";
import { Field, inputCls } from "@/components/ui";
import { Plus, X } from "lucide-react";

export function NewLensForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createLens, { error: "" });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-blue-800)]">
        <Plus className="h-4 w-4" /> Nuevo cristal
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--oc-slate-200)] shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Nuevo cristal</h2>
        <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg hover:bg-[var(--oc-slate-100)] flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Código"><input name="code" className={inputCls} placeholder="CRI-006" /></Field>
          <Field label="Tipo de cristal *"><input name="lens_type" required className={inputCls} placeholder="Progresivo Premium" /></Field>
          <Field label="Material"><input name="material" className={inputCls} placeholder="Policarbonato" /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Índice"><input name="lens_index" type="number" step="0.01" className={inputCls} placeholder="1.61" /></Field>
          <Field label="Tipo focal">
            <select name="focal_type" className={inputCls} defaultValue="">
              <option value="">Selecciona…</option>
              <option value="monofocal">Monofocal</option>
              <option value="bifocal">Bifocal</option>
              <option value="progresivo">Progresivo</option>
            </select>
          </Field>
          <Field label="Precio"><input name="price" type="number" className={inputCls} /></Field>
        </div>
        <div className="flex gap-6 text-sm text-[var(--oc-slate-700)]">
          <label className="flex items-center gap-2"><input type="checkbox" name="photochromic" className="rounded" /> Fotocromático</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="antireflective" className="rounded" /> Antirreflejo</label>
        </div>
        <Field label="Otros tratamientos (separados por coma)"><input name="treatments" className={inputCls} placeholder="filtro azul, antirayas" /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Proveedor"><input name="supplier" className={inputCls} /></Field>
          <Field label="Stock"><input name="stock" type="number" className={inputCls} /></Field>
        </div>

        {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar cristal"}
          </button>
        </div>
      </form>
    </div>
  );
}
