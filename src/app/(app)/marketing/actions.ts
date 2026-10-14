"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";

/**
 * NOTA DE ARQUITECTURA:
 * El envío real de correos aún no está conectado a un proveedor (Resend, SendGrid, etc.).
 * Esta acción deja registrada la comunicación en la base de datos (tabla `communications`)
 * con estado "enviado_simulado", lista para que --cuando se configure un proveedor--
 * solo sea necesario reemplazar el bloque marcado como TODO por la llamada real a la API
 * de correo, sin cambiar el resto del flujo ni la base de datos.
 */
type CampaignState = { error: string; success: string };

export async function sendCampaign(_prevState: CampaignState, formData: FormData): Promise<CampaignState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const templateId = String(formData.get("template_id") || "");
  const filterType = String(formData.get("filter_type") || "manual");
  const patientIds = formData.getAll("patient_ids").map(String);

  if (!templateId) return { error: "Selecciona una plantilla de correo.", success: "" };
  if (patientIds.length === 0) return { error: "Selecciona al menos un paciente.", success: "" };

  const { data: template } = await supabase.from("email_templates").select("*").eq("id", templateId).single();
  if (!template) return { error: "Plantilla no encontrada.", success: "" };

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({ name: `${template.name} · ${new Date().toLocaleDateString("es-CL")}`, filter_type: filterType, template_id: templateId, created_by: user?.id ?? null })
    .select("id")
    .single();
  if (campaignError || !campaign) return { error: "No se pudo crear la campaña.", success: "" };

  const { data: patients } = await supabase.from("patients").select("id, full_name").in("id", patientIds);

  const rows = (patients || []).map((p) => ({
    patient_id: p.id,
    campaign_id: campaign.id,
    template_id: templateId,
    subject: template.subject,
    body: template.body.replaceAll("{{nombre}}", p.full_name),
    sent_at: new Date().toISOString(),
    status: "enviado_simulado", // TODO: reemplazar por estado real del proveedor de correo
    created_by: user?.id ?? null,
  }));

  const { error: commError } = await supabase.from("communications").insert(rows);
  if (commError) return { error: "No se pudo registrar el envío.", success: "" };

  // TODO: aquí se llamaría a la API del proveedor de correo real, ej:
  // for (const row of rows) await emailProvider.send({ to: ..., subject: row.subject, html: row.body })

  await logActivity({ action: "enviar_campana", entity_type: "campaign", entity_id: campaign.id, details: { filterType, count: rows.length } });
  revalidatePath("/marketing");
  return { error: "", success: `Campaña enviada a ${rows.length} paciente(s).` };
}
