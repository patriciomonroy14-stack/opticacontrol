"use client";

import { useActionState, useState } from "react";
import { Field, inputCls } from "@/components/ui";
import { adjustStock, updateFrame } from "../actions";
import { FRAME_TYPES } from "../NewFrameForm";

type State = { error: string; ok?: boolean };

type FrameValues = {
  frame_type: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  material: string | null;
  supplier: string | null;
  notes: string | null;
  sale_price: number | null;
  purchase_price?: number | null;
};

export function EditFrameForm({ frameId, values, admin }: { frameId: string; values: FrameValues; admin: boolean }) {
  const [saved, setSaved] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData) => {
      const result = await updateFrame(frameId, prev, formData);
      setSaved(Boolean(result.ok));
      return result;
    },
    { error: "" },
  );
  return (
    <form action={formAction} onChange={() => setSaved(false)} className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Tipo">
          <input name="frame_type" list="frame-types-edit" defaultValue={values.frame_type ?? ""} autoComplete="off" className={inputCls} />
          <datalist id="frame-types-edit">
            {FRAME_TYPES.map((t) => <option key={t} value={t} />)}
          </datalist>
        </Field>
        <Field label="Marca"><input name="brand" defaultValue={values.brand ?? ""} className={inputCls} /></Field>
        <Field label="Modelo"><input name="model" defaultValue={values.model ?? ""} className={inputCls} /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Color"><input name="color" defaultValue={values.color ?? ""} className={inputCls} /></Field>
        <Field label="Material"><input name="material" defaultValue={values.material ?? ""} className={inputCls} /></Field>
        <Field label="Proveedor"><input name="supplier" defaultValue={values.supplier ?? ""} className={inputCls} /></Field>
      </div>
      {admin ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Costo de adquisición"><input name="purchase_price" type="number" min={0} defaultValue={values.purchase_price ?? 0} className={inputCls} /></Field>
          <Field label="Precio de venta"><input name="sale_price" type="number" min={0} defaultValue={values.sale_price ?? 0} className={inputCls} /></Field>
        </div>
      ) : (
        <p className="text-xs text-[var(--oc-slate-500)]">El precio solo lo puede cambiar la administradora.</p>
      )}
      <Field label="Cambiar foto (opcional)"><input name="photo" type="file" accept="image/*" className={`${inputCls} py-1.5`} /></Field>
      <Field label="Observaciones"><textarea name="notes" rows={2} defaultValue={values.notes ?? ""} className={inputCls} /></Field>
      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-[var(--oc-green)]">Guardado ✓</span>}
        <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

export function AdjustStockForm({ frameId }: { frameId: string }) {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData) => {
      const result = await adjustStock(frameId, prev, formData);
      if (result.ok) setFormKey((k) => k + 1);
      return result;
    },
    { error: "" },
  );
  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select name="kind" defaultValue="ingreso" className={inputCls}>
            <option value="ingreso">Ingreso de mercadería</option>
            <option value="ajuste">Ajuste (conteo, merma, daño)</option>
          </select>
        </Field>
        <Field label="Unidades (+ suma, − resta)">
          <input name="delta" type="number" step={1} required className={inputCls} placeholder="Ej: 3 o -1" />
        </Field>
      </div>
      <Field label="Motivo *">
        <input name="reason" required minLength={4} className={inputCls} placeholder="Ej: compra a proveedor, conteo mensual, armazón dañado" />
      </Field>
      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-800)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-900)] disabled:opacity-60">
          {pending ? "Guardando…" : "Registrar movimiento"}
        </button>
      </div>
    </form>
  );
}
