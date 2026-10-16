"use client";

import { useActionState, useMemo, useState } from "react";
import { createFrame } from "./actions";
import { Field, inputCls } from "@/components/ui";
import { Plus, X } from "lucide-react";

/** Variantes de color de un mismo modelo (mismo código). */
export const FRAME_TYPES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"];

export type ExistingFrame = { code: string; frame_type: string | null; brand: string | null; sale_price: number | null };

export function NewFrameForm({ showPurchasePrice, existing = [] }: { showPurchasePrice: boolean; existing?: ExistingFrame[] }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [code, setCode] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("");

  const sameCode = useMemo(
    () => existing.filter((f) => f.code.trim().toUpperCase() === code.trim().toUpperCase() && code.trim() !== ""),
    [existing, code],
  );
  const usedTypes = new Set(sameCode.map((f) => (f.frame_type ?? "").toUpperCase()));
  const nextFree = FRAME_TYPES.find((t) => !usedTypes.has(t)) ?? "";

  const reset = () => {
    setCode("");
    setBrand("");
    setPrice("");
    setType("");
    setFormKey((k) => k + 1);
  };

  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => {
      const result = await createFrame(prev, formData);
      if (result.ok) reset();
      return result;
    },
    { error: "" },
  );

  // Al escribir un código que ya existe: se sugiere la marca, el precio y el siguiente tipo libre
  const onCodeChange = (value: string) => {
    setCode(value);
    const match = existing.find((f) => f.code.trim().toUpperCase() === value.trim().toUpperCase());
    if (match) {
      if (!brand && match.brand) setBrand(match.brand);
      if (!price && match.sale_price) setPrice(String(match.sale_price));
      const used = new Set(existing.filter((f) => f.code.trim().toUpperCase() === value.trim().toUpperCase()).map((f) => (f.frame_type ?? "").toUpperCase()));
      if (!type || used.has(type)) setType(FRAME_TYPES.find((t) => !used.has(t)) ?? "");
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-blue-800)]">
        <Plus className="h-4 w-4" /> Nuevo armazón
      </button>
    );
  }

  const codes = [...new Set(existing.map((f) => f.code))].sort();

  return (
    <div className="bg-white rounded-2xl border border-[var(--oc-slate-200)] shadow-sm p-6 mb-6 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Nuevo armazón</h2>
        <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg hover:bg-[var(--oc-slate-100)] flex items-center justify-center" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form key={formKey} action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Código *">
            <input
              name="code"
              required
              autoFocus
              list="frame-codes"
              autoComplete="off"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              className={inputCls}
              placeholder="DSFO055"
            />
            <datalist id="frame-codes">
              {codes.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Tipo *">
            <select name="frame_type" required value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              <option value="" disabled>Selecciona…</option>
              {FRAME_TYPES.map((t) => (
                <option key={t} value={t} disabled={usedTypes.has(t)}>
                  {t}{usedTypes.has(t) ? " (ya existe)" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {sameCode.length > 0 && (
          <p className="-mt-2 text-xs text-[var(--oc-blue-700)] bg-[var(--oc-blue-50)] rounded-lg px-3 py-2">
            Este código ya existe en: {sameCode.map((f) => f.frame_type || "sin tipo").join(", ")}.
            {nextFree ? ` Se sugiere ${nextFree}.` : " Ya están usados C1 a C8."}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Marca"><input name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} /></Field>
          <Field label="Color"><input name="color" className={inputCls} placeholder="Negro, carey, azul…" /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Precio de venta">
            <input name="sale_price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Stock"><input name="stock" type="number" min={0} defaultValue={1} className={inputCls} /></Field>
        </div>
        {showPurchasePrice && (
          <Field label="Costo (opcional, solo lo ves tú)" hint="Sirve para calcular la ganancia de cada venta">
            <input name="purchase_price" type="number" min={0} className={inputCls} />
          </Field>
        )}

        {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}
        {state.ok && <p className="text-sm text-[var(--oc-green)] bg-[var(--oc-green-bg)] rounded-lg px-3 py-2">Armazón guardado. Puedes agregar otro.</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--oc-slate-700)] hover:bg-[var(--oc-slate-100)]">
            Cerrar
          </button>
          <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar armazón"}
          </button>
        </div>
      </form>
    </div>
  );
}
