"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/lib/types";

export async function advanceOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("id", orderId);
  await logActivity({ action: "actualizar_estado_orden", entity_type: "order", entity_id: orderId, details: { status } });
  revalidatePath("/ordenes");
  revalidatePath("/dashboard");
}

export async function markOrderContacted(orderId: string) {
  const supabase = await createClient();
  await supabase.from("orders").update({ contacted: true, contacted_at: new Date().toISOString() }).eq("id", orderId);
  await logActivity({ action: "contactar_paciente_orden", entity_type: "order", entity_id: orderId });
  revalidatePath("/ordenes");
}
