"use client";

import { useActionState, useMemo, useState } from "react";
import { setLensPrice } from "./actions";
import { Field, inputCls } from "@/components/ui";

type LensType = { id: string; name: string };
type LensMaterial = { id: string; name: string };
type LensColor = { id: string; name: string; lens_type_id: string };

export function PriceForm({ lensTypes, lensMaterials, lensColors }: { lensTypes: LensType[]; lensMaterials: LensMaterial[]; lensColors: LensColor[] }) {
  const [state, formAction, pending] = useActionState(setLensPrice, { error: "" });
  const [typeId, setTypeId] = useState("");

  const colorsForType = useMemo(() => lensColors.filter((c) => c.lens_type_id === typeId), [lensColors, typeId]);

  return (
    <form action={formAction} className="grid sm:grid-cols-4 gap-3 items-end bg-[var(--oc-slate-100)] rounded-xl p-4">
      <Field label="Tipo de cristal">
        <select name="lens_type_id" required value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inputCls}>
          <option value="" disabled>Selecciona…</option>
          {lensTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Material">
        <select name="material_id" required className={inputCls} defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {lensMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label={colorsForType.length > 0 ? "Color (opcional)" : "Color (no aplica)"}>
        <select name="color_id" className={inputCls} defaultValue="" disabled={colorsForType.length === 0}>
          <option value="">Cualquier color / sin color</option>
          {colorsForType.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Precio">
        <input name="price" type="number" min={0} required className={inputCls} placeholder="30000" />
      </Field>
      <div className="sm:col-span-4 flex items-center justify-between">
        {state.error && <p className="text-xs text-[var(--oc-red)]">{state.error}</p>}
        <button type="submit" disabled={pending} className="ml-auto rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar precio"}
        </button>
      </div>
    </form>
  );
}
