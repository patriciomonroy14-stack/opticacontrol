"use client";

import { useActionState, useMemo, useState } from "react";
import { setLensFilterPrice } from "./actions";
import { Field, inputCls } from "@/components/ui";

type LensFilter = { id: string; name: string; has_color: boolean };
type LensMaterial = { id: string; name: string };
type LensFilterColor = { id: string; name: string; filter_id: string };

export function FilterPriceForm({ lensFilters, lensMaterials, lensFilterColors }: { lensFilters: LensFilter[]; lensMaterials: LensMaterial[]; lensFilterColors: LensFilterColor[] }) {
  const [state, formAction, pending] = useActionState(setLensFilterPrice, { error: "" });
  const [filterId, setFilterId] = useState("");

  const colorsForFilter = useMemo(() => lensFilterColors.filter((c) => c.filter_id === filterId), [lensFilterColors, filterId]);

  return (
    <form action={formAction} className="grid sm:grid-cols-4 gap-3 items-end bg-[var(--oc-slate-100)] rounded-xl p-4">
      <Field label="Filtro">
        <select name="filter_id" required value={filterId} onChange={(e) => setFilterId(e.target.value)} className={inputCls}>
          <option value="" disabled>Selecciona…</option>
          {lensFilters.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </Field>
      <Field label="Material (opcional)" hint="Deja vacío si el precio es el mismo sin importar el material">
        <select name="material_id" className={inputCls} defaultValue="">
          <option value="">Cualquier material</option>
          {lensMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label={colorsForFilter.length > 0 ? "Color (opcional)" : "Color (no aplica)"}>
        <select name="color_id" className={inputCls} defaultValue="" disabled={colorsForFilter.length === 0}>
          <option value="">Cualquier color</option>
          {colorsForFilter.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Precio">
        <input name="price" type="number" min={0} required className={inputCls} placeholder="15000" />
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
