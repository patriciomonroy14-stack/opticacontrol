"use server";

import { logActivity } from "@/app/(app)/actions";
import { revalidatePath } from "next/cache";
import { canSell, type OrderStatus } from "@/lib/types";
import { getSession } from "@/lib/session";

export async function advanceOrderStatus(orderId: string, status: OrderStatus) {
  // "Entregado" y "Cancelado" solo desde la venta (cobro del saldo / anulación)
  if (status === "entregado" || status === "cancelado") return;
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return;
  await supabase.from("orders").update({ status }).eq("id", orderId);
  await logActivity({ action: "actualizar_estado_orden", entity_type: "order", entity_id: orderId, details: { status } });
  revalidatePath("/ordenes");
  revalidatePath("/dashboard");
}

export async function markOrderContacted(orderId: string) {
  const { supabase, user, role } = await getSession();
  if (!user || !canSell(role)) return;
  await supabase.from("orders").update({ contacted: true, contacted_at: new Date().toISOString() }).eq("id", orderId);
  await logActivity({ action: "contactar_paciente_orden", entity_type: "order", entity_id: orderId });
  revalidatePath("/ordenes");
}
