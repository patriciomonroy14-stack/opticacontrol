"use client";

import { useActionState, useState } from "react";
import { createFrame } from "./actions";
import { Field, inputCls, PrimaryButton } from "@/components/ui";
import { Plus, X } from "lucide-react";

export function NewFrameForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createFrame, { error: "" });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-blue-800)]">
        <Plus className="h-4 w-4" /> Nuevo armazón
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--oc-slate-200)] shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Nuevo armazón</h2>
        <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg hover:bg-[var(--oc-slate-100)] flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Código *"><input name="code" required className={inputCls} placeholder="ARM-007" /></Field>
          <Field label="Marca"><input name="brand" className={inputCls} /></Field>
          <Field label="Modelo"><input name="model" className={inputCls} /></Field>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Color"><input name="color" className={inputCls} /></Field>
          <Field label="Material"><input name="material" className={inputCls} /></Field>
          <Field label="Forma"><input name="shape" className={inputCls} /></Field>
          <Field label="Género"><input name="gender" className={inputCls} placeholder="Unisex" /></Field>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Talla"><input name="size" className={inputCls} /></Field>
          <Field label="Precio compra"><input name="purchase_price" type="number" className={inputCls} /></Field>
          <Field label="Precio venta"><input name="sale_price" type="number" className={inputCls} /></Field>
          <Field label="Stock"><input name="stock" type="number" defaultValue={1} className={inputCls} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Proveedor"><input name="supplier" className={inputCls} /></Field>
          <Field label="Ubicación"><input name="location" className={inputCls} placeholder="Vitrina 1" /></Field>
        </div>
        <Field label="Fotografía"><input name="photo" type="file" accept="image/*" className={`${inputCls} py-1.5`} /></Field>
        <Field label="Observaciones"><textarea name="notes" rows={2} className={inputCls} /></Field>

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
