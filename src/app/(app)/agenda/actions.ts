"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import type { AppointmentStatus } from "@/lib/types";

export async function createAppointment(_prevState: { error: string }, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patientName = String(formData.get("patient_name") || "").trim().replace(/\s+/g, " ");
  const patientPhone = String(formData.get("patient_phone") || "").trim() || null;
  const appointmentDate = String(formData.get("appointment_date") || "");
  const appointmentTime = String(formData.get("appointment_time") || "");

  if (!patientName || !appointmentDate || !appointmentTime) {
    return { error: "Escribe el nombre del paciente, la fecha y la hora." };
  }

  // Buscar si el paciente ya existe (mismo nombre, sin importar mayúsculas)
  const escaped = patientName.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data: matches } = await supabase
    .from("patients")
    .select("id, phone, status")
    .ilike("full_name", escaped)
    .order("status", { ascending: true })
    .limit(1);

  let patientId = matches?.[0]?.id as string | undefined;

  if (patientId) {
    if (patientPhone && !matches?.[0]?.phone) {
      await supabase.from("patients").update({ phone: patientPhone }).eq("id", patientId);
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from("patients")
      .insert({ full_name: patientName, phone: patientPhone, created_by: user?.id ?? null })
      .select("id")
      .single();
    if (createError || !created) return { error: "No se pudo registrar al paciente." };
    patientId = created.id;
    await logActivity({ action: "crear_paciente", entity_type: "patient", entity_id: created.id, details: { full_name: patientName, origen: "agenda" } });
    revalidatePath("/pacientes");
  }

  const payload = {
    patient_id: patientId,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    professional: String(formData.get("professional") || "") || null,
    reason: String(formData.get("reason") || "") || null,
    notes: String(formData.get("notes") || "") || null,
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from("appointments").insert(payload);
  if (error) return { error: "No se pudo agendar la hora." };

  await logActivity({ action: "crear_hora", entity_type: "appointment", details: payload });
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: "" };
}

export async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const supabase = await createClient();
  await supabase.from("appointments").update({ status }).eq("id", appointmentId);
  await logActivity({ action: "actualizar_estado_hora", entity_type: "appointment", entity_id: appointmentId, details: { status } });
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
