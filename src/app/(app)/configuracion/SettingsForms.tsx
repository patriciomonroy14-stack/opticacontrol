"use client";

import { useActionState } from "react";
import { updateOpticaInfo, updateBusinessHours } from "./actions";
import { Field, inputCls } from "@/components/ui";

export function OpticaInfoForm({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [state, formAction, pending] = useActionState(updateOpticaInfo, { error: "", success: "" });
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nombre de la óptica">
        <input name="name" defaultValue={name} className={inputCls} />
      </Field>
      <Field label="URL del logo" hint="Pega la URL de una imagen alojada (opcional)">
        <input name="logo_url" defaultValue={logoUrl || ""} className={inputCls} />
      </Field>
      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--oc-green)] bg-[var(--oc-green-bg)] rounded-lg px-3 py-2">{state.success}</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar datos"}
      </button>
    </form>
  );
}

export function BusinessHoursForm({
  weekdays,
  saturday,
  sunday,
  slotMinutes,
}: {
  weekdays: string;
  saturday: string;
  sunday: string;
  slotMinutes: number;
}) {
  const [state, formAction, pending] = useActionState(updateBusinessHours, { error: "", success: "" });
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Lunes a viernes">
        <input name="lunes_viernes" defaultValue={weekdays} className={inputCls} placeholder="17:30-22:00" />
      </Field>
      <Field label="Sábado">
        <input name="sabado" defaultValue={saturday} className={inputCls} placeholder="10:00-16:00" />
      </Field>
      <Field label="Domingo">
        <input name="domingo" defaultValue={sunday} className={inputCls} placeholder="Vacío si no se atiende" />
      </Field>
      <Field label="Duración de cada hora (minutos)">
        <input name="slot_minutes" type="number" min={5} max={120} step={5} defaultValue={slotMinutes} className={inputCls} />
      </Field>
      <p className="text-xs text-[var(--oc-slate-500)]">Escribe cada horario como inicio-fin, por ejemplo 17:30-22:00. Deja vacío un día para marcarlo como cerrado.</p>
      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--oc-green)] bg-[var(--oc-green-bg)] rounded-lg px-3 py-2">{state.success}</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar horarios"}
      </button>
    </form>
  );
}
