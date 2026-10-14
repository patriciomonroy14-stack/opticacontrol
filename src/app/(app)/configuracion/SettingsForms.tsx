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

export function BusinessHoursForm({ weekdays, saturday }: { weekdays: string; saturday: string }) {
  const [state, formAction, pending] = useActionState(updateBusinessHours, { error: "", success: "" });
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Lunes a viernes">
        <input name="lunes_viernes" defaultValue={weekdays} className={inputCls} placeholder="09:00-19:00" />
      </Field>
      <Field label="Sábado">
        <input name="sabado" defaultValue={saturday} className={inputCls} placeholder="09:00-14:00" />
      </Field>
      {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--oc-green)] bg-[var(--oc-green-bg)] rounded-lg px-3 py-2">{state.success}</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar horarios"}
      </button>
    </form>
  );
}
