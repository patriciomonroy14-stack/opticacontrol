"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type FormState = { error: string };

export async function createPatient(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    full_name: String(formData.get("full_name") || "").trim(),
    rut: String(formData.get("rut") || "").trim() || null,
    birth_date: String(formData.get("birth_date") || "") || null,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    comuna: String(formData.get("comuna") || "").trim() || null,
    contact_preference: String(formData.get("contact_preference") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user?.id ?? null,
  };

  if (!payload.full_name) {
    return { error: "El nombre completo es obligatorio." };
  }

  const { data, error } = await supabase.from("patients").insert(payload).select("id").single();

  if (error) {
    return { error: error.message.includes("duplicate") ? "Ya existe un paciente con ese RUT." : "No se pudo crear el paciente." };
  }

  await logActivity({ action: "crear_paciente", entity_type: "patient", entity_id: data.id, details: { full_name: payload.full_name } });
  redirect(`/pacientes/${data.id}`);
}

export async function updatePatientStatus(patientId: string, status: "activo" | "inactivo") {
  const supabase = await createClient();
  await supabase.from("patients").update({ status }).eq("id", patientId);
  await logActivity({ action: status === "activo" ? "activar_paciente" : "desactivar_paciente", entity_type: "patient", entity_id: patientId });
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/pacientes");
}

export async function addPrescription(patientId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();

  const num = (key: string) => {
    const v = formData.get(key);
    return v && String(v).trim() !== "" ? Number(v) : null;
  };

  const payload = {
    patient_id: patientId,
    date: String(formData.get("date") || new Date().toISOString().slice(0, 10)),
    professional_name: String(formData.get("professional_name") || "") || null,
    od_sphere: num("od_sphere"),
    od_cylinder: num("od_cylinder"),
    od_axis: num("od_axis"),
    od_addition: num("od_addition"),
    oi_sphere: num("oi_sphere"),
    oi_cylinder: num("oi_cylinder"),
    oi_axis: num("oi_axis"),
    oi_addition: num("oi_addition"),
    dp: num("dp"),
    height: num("height"),
    notes: String(formData.get("notes") || "") || null,
  };

  const { data, error } = await supabase.from("prescriptions").insert(payload).select("id").single();
  if (error) return { error: "No se pudo guardar la receta." };

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    const path = `${patientId}/${data.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("prescriptions").upload(path, file, { upsert: true });
    if (!uploadError) {
      await supabase.from("prescriptions").update({ attachment_url: path, attachment_type: file.type }).eq("id", data.id);
    }
  }

  await logActivity({ action: "crear_receta", entity_type: "prescription", entity_id: data.id, details: { patient_id: patientId } });
  revalidatePath(`/pacientes/${patientId}`);
  return { error: "" };
}
