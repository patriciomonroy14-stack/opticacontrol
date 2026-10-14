"use client";

import { useTransition } from "react";
import { updateAppointmentStatus } from "./actions";
import type { AppointmentStatus } from "@/lib/types";
import { Check, X, UserX, CalendarCheck } from "lucide-react";

export function AppointmentActions({ id, status }: { id: string; status: AppointmentStatus }) {
  const [pending, startTransition] = useTransition();

  const set = (s: AppointmentStatus) => startTransition(() => updateAppointmentStatus(id, s));

  if (status === "atendida" || status === "cancelada" || status === "no_asistio") {
    return null;
  }

  return (
    <div className="flex gap-1.5">
      {status === "reservada" && (
        <button disabled={pending} onClick={() => set("confirmada")} title="Confirmar" className="h-8 w-8 rounded-lg bg-[var(--oc-blue-100)] text-[var(--oc-blue-700)] flex items-center justify-center hover:bg-[var(--oc-blue-700)] hover:text-white transition-colors disabled:opacity-50">
          <CalendarCheck className="h-4 w-4" />
        </button>
      )}
      <button disabled={pending} onClick={() => set("atendida")} title="Marcar atendido" className="h-8 w-8 rounded-lg bg-[var(--oc-green-bg)] text-[var(--oc-green)] flex items-center justify-center hover:bg-[var(--oc-green)] hover:text-white transition-colors disabled:opacity-50">
        <Check className="h-4 w-4" />
      </button>
      <button disabled={pending} onClick={() => set("no_asistio")} title="Marcar ausente" className="h-8 w-8 rounded-lg bg-[var(--oc-amber-bg)] text-[var(--oc-amber)] flex items-center justify-center hover:bg-[var(--oc-amber)] hover:text-white transition-colors disabled:opacity-50">
        <UserX className="h-4 w-4" />
      </button>
      <button disabled={pending} onClick={() => set("cancelada")} title="Cancelar" className="h-8 w-8 rounded-lg bg-[var(--oc-red-bg)] text-[var(--oc-red)] flex items-center justify-center hover:bg-[var(--oc-red)] hover:text-white transition-colors disabled:opacity-50">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
