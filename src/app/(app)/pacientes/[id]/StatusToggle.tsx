"use client";

import { useTransition } from "react";
import { updatePatientStatus } from "../actions";
import { SecondaryButton } from "@/components/ui";

export function StatusToggle({ patientId, status }: { patientId: string; status: "activo" | "inactivo" }) {
  const [pending, startTransition] = useTransition();
  const next = status === "activo" ? "inactivo" : "activo";

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => updatePatientStatus(patientId, next))}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--oc-slate-200)] bg-white text-[var(--oc-blue-950)] text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-slate-100)] transition-colors disabled:opacity-60"
    >
      {pending ? "Actualizando…" : status === "activo" ? "Marcar inactivo" : "Marcar activo"}
    </button>
  );
}
