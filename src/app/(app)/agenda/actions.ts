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

  const payload = {
    patient_id: String(formData.get("patient_id") || ""),
    appointment_date: String(formData.get("appointment_date") || ""),
    appointment_time: String(formData.get("appointment_time") || ""),
    professional: String(formData.get("professional") || "") || null,
    reason: String(formData.get("reason") || "") || null,
    notes: String(formData.get("notes") || "") || null,
    created_by: user?.id ?? null,
  };

  if (!payload.patient_id || !payload.appointment_date || !payload.appointment_time) {
    return { error: "Selecciona paciente, fecha y hora." };
  }

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
