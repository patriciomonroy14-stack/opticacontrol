"use client";

import { useActionState, useMemo, useState } from "react";
import { createQuote } from "../actions";
import { Field, inputCls } from "@/components/ui";
import { formatCLP } from "@/lib/types";

type Patient = { id: string; full_name: string };
type Frame = { id: string; code: string; brand: string | null; model: string | null; sale_price: number | null; stock: number };
type LensType = { id: string; name: string };
type LensMaterial = { id: string; name: string };
type LensBasePrice = { lens_type_id: string; material_id: string; price: number };
type LensFilter = { id: string; name: string; has_color: boolean };
type LensFilterColor = { id: string; name: string; filter_id: string };
type LensFilterPrice = { filter_id: string; material_id: string | null; color_id: string | null; price: number };

function findFilterPrice(prices: LensFilterPrice[], filterId: string, materialId: string | null, colorId: string | null) {
  const attempts = [
    { material_id: materialId, color_id: colorId },
    { material_id: materialId, color_id: null },
    { material_id: null, color_id: colorId },
    { material_id: null, color_id: null },
  ];
  for (const a of attempts) {
    const hit = prices.find((p) => p.filter_id === filterId && p.material_id === a.material_id && p.color_id === a.color_id);
    if (hit) return hit.price;
  }
  return null;
}

export function NewQuoteForm({
  patients,
  frames,
  lensTypes,
  lensMaterials,
  lensBasePrices,
  lensFilters,
  lensFilterColors,
  lensFilterPrices,
}: {
  patients: Patient[];
  frames: Frame[];
  lensTypes: LensType[];
  lensMaterials: LensMaterial[];
  lensBasePrices: LensBasePrice[];
  lensFilters: LensFilter[];
  lensFilterColors: LensFilterColor[];
  lensFilterPrices: LensFilterPrice[];
}) {
  const [state, formAction, pending] = useActionState(createQuote, { error: "" });
  const [usePatient, setUsePatient] = useState(true);
  const [clientOwnsFrame, setClientOwnsFrame] = useState(false);
  const [frameId, setFrameId] = useState("");
  const [discount, setDiscount] = useState(0);

  const [lensTypeId, setLensTypeId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string | null>>({}); // filter_id -> color_id | null

  const basePrice = useMemo(() => {
    if (!lensTypeId || !materialId) return null;
    const hit = lensBasePrices.find((p) => p.lens_type_id === lensTypeId && p.material_id === materialId);
    return hit ? hit.price : null;
  }, [lensTypeId, materialId, lensBasePrices]);

  const filtersBreakdown = useMemo(() => {
    return Object.entries(selectedFilters).map(([filterId, colorId]) => {
      const filter = lensFilters.find((f) => f.id === filterId)!;
      const price = findFilterPrice(lensFilterPrices, filterId, materialId || null, colorId);
      return { filter, colorId, price };
    });
  }, [selectedFilters, materialId, lensFilterPrices, lensFilters]);

  const filtersTotal = filtersBreakdown.reduce((sum, f) => sum + (f.price || 0), 0);
  const lensPrice = (basePrice || 0) + filtersTotal;
  const framePrice = frames.find((f) => f.id === frameId)?.sale_price || 0;
  const total = Math.max((clientOwnsFrame ? 0 : framePrice) + lensPrice - discount, 0);

  const filtersJson = JSON.stringify(Object.entries(selectedFilters).map(([filter_id, color_id]) => ({ filter_id, color_id })));

  const toggleFilter = (filterId: string) => {
    setSelectedFilters((prev) => {
      const next = { ...prev };
      if (filterId in next) delete next[filterId];
      else next[filterId] = null;
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setUsePatient(true)} className={`text-xs font-medium px-3 py-1.5 rounded-full ${usePatient ? "bg-[var(--oc-blue-700)] text-white" : "bg-[var(--oc-slate-100)] text-[var(--oc-slate-700)]"}`}>
            Paciente registrado
          </button>
          <button type="button" onClick={() => setUsePatient(false)} className={`text-xs font-medium px-3 py-1.5 rounded-full ${!usePatient ? "bg-[var(--oc-blue-700)] text-white" : "bg-[var(--oc-slate-100)] text-[var(--oc-slate-700)]"}`}>
            Persona sin ficha (walk-in)
          </button>
        </div>
        {usePatient ? (
          <Field label="Paciente *">
            <select name="patient_id" className={inputCls} defaultValue="">
              <option value="" disabled>Selecciona un paciente…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Nombre de la persona *" hint="Podrás asociar esta cotización a una ficha más tarde si decide comprar">
            <input name="walkin_name" className={inputCls} placeholder="Nombre y apellido" />
          </Field>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-[var(--oc-blue-950)] mb-2">Receta</p>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <Field label="OD Esfera"><input name="od_sphere" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="OD Cilindro"><input name="od_cylinder" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="OD Eje"><input name="od_axis" type="number" className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <Field label="OI Esfera"><input name="oi_sphere" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="OI Cilindro"><input name="oi_cylinder" type="number" step="0.25" className={inputCls} /></Field>
          <Field label="OI Eje"><input name="oi_axis" type="number" className={inputCls} /></Field>
        </div>
        <Field label="Adición (si usa multifocal/bifocal)"><input name="addition" type="number" step="0.25" className={`${inputCls} max-w-[160px]`} /></Field>
      </div>

      <div className="bg-[var(--oc-slate-100)] rounded-xl p-4 space-y-4">
        <p className="text-sm font-semibold text-[var(--oc-blue-950)]">Cristal</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tipo de cristal">
            <select name="lens_type_id" required value={lensTypeId} onChange={(e) => setLensTypeId(e.target.value)} className={inputCls}>
              <option value="" disabled>Selecciona…</option>
              {lensTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Material">
            <select name="material_id" required value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputCls}>
              <option value="" disabled>Selecciona…</option>
              {lensMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-[var(--oc-slate-200)]">
          <span className="text-sm text-[var(--oc-slate-500)]">Precio del cristal base</span>
          <span className="font-display font-bold text-[var(--oc-blue-950)] tabular-nums">
            {lensTypeId && materialId ? (basePrice != null ? formatCLP(basePrice) : "No configurado") : "—"}
          </span>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--oc-blue-950)] mb-2">Filtros (puedes combinar varios)</p>
          <div className="space-y-2">
            {lensFilters.map((f) => {
              const checked = f.id in selectedFilters;
              const colorsForFilter = lensFilterColors.filter((c) => c.filter_id === f.id);
              const bd = filtersBreakdown.find((x) => x.filter.id === f.id);
              return (
                <div key={f.id} className="bg-white rounded-lg border border-[var(--oc-slate-200)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-[var(--oc-blue-950)]">
                      <input type="checkbox" checked={checked} onChange={() => toggleFilter(f.id)} className="rounded border-[var(--oc-slate-300)]" />
                      {f.name}
                    </label>
                    <span className="text-sm font-medium text-[var(--oc-slate-700)] tabular-nums">
                      {checked ? (bd?.price != null ? `+ ${formatCLP(bd.price)}` : "Sin precio") : ""}
                    </span>
                  </div>
                  {checked && f.has_color && colorsForFilter.length > 0 && (
                    <select
                      value={selectedFilters[f.id] || ""}
                      onChange={(e) => setSelectedFilters((prev) => ({ ...prev, [f.id]: e.target.value || null }))}
                      className={`${inputCls} mt-2`}
                    >
                      <option value="">Selecciona un color…</option>
                      {colorsForFilter.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          <input type="hidden" name="filters_json" value={filtersJson} />
        </div>

        <div className="flex items-center justify-between bg-[var(--oc-blue-100)] rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-[var(--oc-blue-800)]">Precio total del cristal</span>
          <span className="font-display font-bold text-[var(--oc-blue-950)] tabular-nums">{formatCLP(lensPrice)}</span>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-[var(--oc-slate-700)] mb-2">
          <input type="checkbox" checked={clientOwnsFrame} onChange={(e) => setClientOwnsFrame(e.target.checked)} className="rounded border-[var(--oc-slate-300)]" name="client_owns_frame" />
          El paciente trae su propio armazón
        </label>
        {!clientOwnsFrame && (
          <Field label="Armazón (opcional)">
            <select name="frame_id" value={frameId} onChange={(e) => setFrameId(e.target.value)} className={inputCls}>
              <option value="">Sin armazón…</option>
              {frames.map((f) => <option key={f.id} value={f.id}>{f.code} · {f.brand} {f.model} · {formatCLP(f.sale_price)}</option>)}
            </select>
            <input type="hidden" name="frame_price" value={framePrice} />
          </Field>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Descuento">
          <input type="number" name="discount" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Total cotizado">
          <input readOnly value={total} className={`${inputCls} bg-[var(--oc-blue-100)] font-semibold tabular-nums`} />
        </Field>
      </div>

      <Field label="Observaciones"><textarea name="notes" rows={2} className={inputCls} /></Field>

      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar cotización"}
        </button>
      </div>
    </form>
  );
}
