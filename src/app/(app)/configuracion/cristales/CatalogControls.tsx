"use client";

import { useActionState, useTransition } from "react";
import { createLensColor, toggleCatalogItem, createLensFilter, createLensFilterColor } from "./actions";
import { inputCls } from "@/components/ui";
import { Plus } from "lucide-react";

export function AddColorForm({ lensTypes }: { lensTypes: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createLensColor, { error: "" });
  return (
    <form action={formAction} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
      <select name="lens_type_id" required className={`${inputCls} sm:max-w-[200px]`} defaultValue="">
        <option value="" disabled>Tipo…</option>
        {lensTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <input name="name" required placeholder="Nombre del color (ej: Gris)" className={inputCls} />
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--oc-blue-700)] text-white text-xs font-semibold px-3.5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60 shrink-0">
        <Plus className="h-3.5 w-3.5" /> {pending ? "Agregando…" : "Agregar color"}
      </button>
      {state.error && <p className="text-xs text-[var(--oc-red)]">{state.error}</p>}
    </form>
  );
}

export function AddFilterForm() {
  const [state, formAction, pending] = useActionState(createLensFilter, { error: "" });
  return (
    <form action={formAction} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
      <input name="name" required placeholder="Ej: Filtro azul" className={inputCls} />
      <label className="flex items-center gap-2 text-xs text-[var(--oc-slate-700)] whitespace-nowrap px-1">
        <input type="checkbox" name="has_color" className="rounded" /> Tiene color
      </label>
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--oc-blue-700)] text-white text-xs font-semibold px-3.5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60 shrink-0">
        <Plus className="h-3.5 w-3.5" /> {pending ? "Agregando…" : "Agregar filtro"}
      </button>
      {state.error && <p className="text-xs text-[var(--oc-red)]">{state.error}</p>}
    </form>
  );
}

export function AddFilterColorForm({ lensFilters }: { lensFilters: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createLensFilterColor, { error: "" });
  return (
    <form action={formAction} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
      <select name="filter_id" required className={`${inputCls} sm:max-w-[200px]`} defaultValue="">
        <option value="" disabled>Filtro…</option>
        {lensFilters.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <input name="name" required placeholder="Nombre del color (ej: Gris)" className={inputCls} />
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--oc-blue-700)] text-white text-xs font-semibold px-3.5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60 shrink-0">
        <Plus className="h-3.5 w-3.5" /> {pending ? "Agregando…" : "Agregar color"}
      </button>
      {state.error && <p className="text-xs text-[var(--oc-red)]">{state.error}</p>}
    </form>
  );
}

export function ActiveToggleSmall({ table, id, active }: { table: "lens_types" | "lens_materials" | "lens_colors" | "lens_catalog_prices" | "lens_filters" | "lens_filter_colors" | "lens_filter_prices"; id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleCatalogItem(table, id, !active))}
      className={`text-xs font-medium px-2.5 py-1 rounded-full disabled:opacity-60 ${active ? "bg-[var(--oc-green-bg)] text-[var(--oc-green)]" : "bg-[var(--oc-slate-100)] text-[var(--oc-slate-500)]"}`}
    >
      {active ? "Activo" : "Inactivo"}
    </button>
  );
}
