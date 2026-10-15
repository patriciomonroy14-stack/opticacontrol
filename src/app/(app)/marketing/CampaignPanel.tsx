"use client";

import { useTransition } from "react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { setMarketingOptOut } from "@/app/(app)/comunicaciones/actions";
import { buildMessage } from "@/lib/whatsapp";
import { formatDate } from "@/lib/types";

type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  detail?: string;
  months?: number | null;
  optOut?: boolean;
  contactPreference?: string | null;
  lastContact?: string | null;
};

function OptOutToggle({ patientId, optOut }: { patientId: string; optOut: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setMarketingOptOut(patientId, !optOut))}
      className="text-xs text-[var(--oc-slate-500)] hover:text-[var(--oc-blue-700)] hover:underline disabled:opacity-50"
    >
      {optOut ? "Volver a permitir mensajes" : "No quiere mensajes"}
    </button>
  );
}

export function CampaignPanel({ patients }: { patients: Patient[] }) {
  const reachable = patients.filter((p) => !p.optOut);
  const contacted = patients.filter((p) => p.lastContact).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-4 text-sm text-[var(--oc-slate-700)]">
        <p><b>{reachable.length}</b> pacientes contactables</p>
        <p><b>{patients.length - reachable.length}</b> pidieron no recibir mensajes</p>
        <p><b>{contacted}</b> ya contactados en los últimos 30 días</p>
      </div>
      <p className="text-xs text-[var(--oc-slate-500)] mb-4">
        Cada botón abre WhatsApp con el mensaje escrito; solo debes presionar Enviar. El mensaje incluye la opción de pedir no ser contactado, y el envío queda registrado en la ficha del paciente.
      </p>

      {patients.length === 0 ? (
        <p className="text-sm text-[var(--oc-slate-500)] py-8 text-center">No hay pacientes en este segmento.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                <th className="py-2 pr-3 font-medium">Paciente</th>
                <th className="py-2 pr-3 font-medium">Detalle</th>
                <th className="py-2 pr-3 font-medium">Último contacto</th>
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className={`border-b border-[var(--oc-slate-100)] last:border-0 ${p.optOut ? "opacity-50" : ""}`}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-[var(--oc-blue-950)]">{p.full_name}</p>
                    <p className="text-xs text-[var(--oc-slate-500)]">
                      {p.phone || p.email || "Sin contacto"}
                      {p.contactPreference ? ` · prefiere ${p.contactPreference}` : ""}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--oc-slate-500)]">{p.detail || "—"}</td>
                  <td className="py-2.5 pr-3 text-[var(--oc-slate-500)]">{p.lastContact ? formatDate(p.lastContact) : "—"}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-col items-start gap-1">
                      {p.optOut ? (
                        <span className="text-xs font-medium text-[var(--oc-red)]">No desea mensajes</span>
                      ) : (
                        <WhatsAppButton
                          compact
                          patientId={p.id}
                          phone={p.phone}
                          kind="renovacion"
                          label={p.lastContact ? "Escribir otra vez" : "Invitar por WhatsApp"}
                          message={buildMessage("renovacion", { name: p.full_name, months: p.months ?? null })}
                        />
                      )}
                      <OptOutToggle patientId={p.id} optOut={Boolean(p.optOut)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
