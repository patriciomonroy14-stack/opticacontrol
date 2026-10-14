"use client";

import { useActionState, useState } from "react";
import { sendCampaign } from "./actions";
import { inputCls } from "@/components/ui";
import { Send } from "lucide-react";

type Patient = { id: string; full_name: string; phone: string | null; email: string | null; detail?: string };
type Template = { id: string; name: string };

export function CampaignPanel({ patients, templates, filterType }: { patients: Patient[]; templates: Template[]; filterType: string }) {
  const [state, formAction, pending] = useActionState(sendCampaign, { error: "", success: "" });
  const [selected, setSelected] = useState<string[]>(patients.map((p) => p.id));

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(selected.length === patients.length ? [] : patients.map((p) => p.id));

  return (
    <form action={formAction}>
      <input type="hidden" name="filter_type" value={filterType} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <select name="template_id" required className={`${inputCls} sm:max-w-xs`}>
          <option value="">Selecciona una plantilla…</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          type="submit"
          disabled={pending || selected.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-50 shrink-0"
        >
          <Send className="h-4 w-4" /> {pending ? "Enviando…" : `Enviar a ${selected.length} paciente(s)`}
        </button>
      </div>

      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2 mb-3">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--oc-green)] bg-[var(--oc-green-bg)] rounded-lg px-3 py-2 mb-3">{state.success}</p>}

      {patients.length === 0 ? (
        <p className="text-sm text-[var(--oc-slate-500)] py-8 text-center">No hay pacientes en este segmento.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                <th className="py-2 pr-3"><input type="checkbox" checked={selected.length === patients.length} onChange={toggleAll} className="rounded" /></th>
                <th className="py-2 pr-3 font-medium">Paciente</th>
                <th className="py-2 pr-3 font-medium">Contacto</th>
                <th className="py-2 pr-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                  <td className="py-2 pr-3">
                    <input type="checkbox" name="patient_ids" value={p.id} checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="rounded" />
                  </td>
                  <td className="py-2 pr-3 font-medium text-[var(--oc-blue-950)]">{p.full_name}</td>
                  <td className="py-2 pr-3 text-[var(--oc-slate-500)]">{p.phone || p.email || "—"}</td>
                  <td className="py-2 pr-3 text-[var(--oc-slate-500)]">{p.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
