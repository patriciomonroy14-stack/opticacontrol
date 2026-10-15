"use client";

import { MessageCircle } from "lucide-react";
import { logWhatsApp } from "@/app/(app)/comunicaciones/actions";
import type { WhatsAppKind } from "@/lib/whatsapp";
import { whatsappMessageLink } from "@/lib/whatsapp";

/** Abre WhatsApp con el mensaje escrito y lo registra en la ficha del paciente. */
export function WhatsAppButton({
  patientId,
  phone,
  kind,
  message,
  label,
  compact = false,
}: {
  patientId: string;
  phone: string | null | undefined;
  kind: WhatsAppKind;
  message: string;
  label: string;
  compact?: boolean;
}) {
  const href = whatsappMessageLink(phone, message);
  if (!href) {
    return <span className="text-xs text-[var(--oc-slate-500)]">{compact ? "Sin teléfono" : "Sin teléfono válido para WhatsApp"}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void logWhatsApp(patientId, kind, message);
      }}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--oc-green-bg)] text-[var(--oc-green)] font-semibold hover:brightness-95 whitespace-nowrap ${
        compact ? "text-xs px-2.5 py-1" : "text-sm px-3.5 py-2"
      }`}
    >
      <MessageCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> {label}
    </a>
  );
}
