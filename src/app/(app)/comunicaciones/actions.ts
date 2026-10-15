"use server";

import { revalidatePath } from "next/cache";
import { canSell } from "@/lib/types";
import { getSession } from "@/lib/session";
import { WHATSAPP_KIND_LABELS, MARKETING_KINDS, type WhatsAppKind } from "@/lib/whatsapp";

/** Registra en la ficha del paciente que se le abrió un mensaje de WhatsApp. */
export async function logWhatsApp(patientId: string, kind: WhatsAppKind, body: string) {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role) || !WHATSAPP_KIND_LABELS[kind]) return { ok: false };

  if (MARKETING_KINDS.includes(kind)) {
    const { data: p } = await supabase.from("patients").select("marketing_opt_out, contact_preference").eq("id", patientId).maybeSingle();
    if (p?.marketing_opt_out) return { ok: false };
  }

  await supabase.from("communications").insert({
    patient_id: patientId,
    subject: `WhatsApp · ${WHATSAPP_KIND_LABELS[kind]}`,
    body: body.slice(0, 2000),
    sent_at: new Date().toISOString(),
    status: "enviado",
    result: "whatsapp_manual",
    created_by: user.id,
  });
  revalidatePath(`/pacientes/${patientId}`);
  return { ok: true };
}

/** El paciente pidió no recibir mensajes de marketing (o vuelve a aceptarlos). */
export async function setMarketingOptOut(patientId: string, optOut: boolean) {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return;
  await supabase.from("patients").update({ marketing_opt_out: optOut }).eq("id", patientId);
  await supabase.from("activity_log").insert({
    user_id: user.id,
    action: optOut ? "paciente_rechaza_marketing" : "paciente_acepta_marketing",
    entity_type: "patient",
    entity_id: patientId,
    details: {},
  });
  revalidatePath("/marketing");
  revalidatePath(`/pacientes/${patientId}`);
}
