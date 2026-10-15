import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Inventario de armazones:
 *   stock     = unidades físicas en la óptica
 *   reserved  = unidades apartadas para ventas aún no entregadas
 *   disponible = stock - reserved
 *
 * Cada cambio usa "comparar y actualizar" sobre el valor leído, para que dos
 * ventas simultáneas no puedan tomar la misma unidad. Todo queda registrado
 * en inventory_movements.
 */

type Change = { stock?: number; reserved?: number };
type Result = { ok: true } | { error: string };

async function applyChange(
  supabase: SupabaseClient,
  frameId: string,
  change: Change,
  movement: { kind: string; sale_id?: string | null; reason?: string | null },
  check?: (f: { stock: number; reserved: number }) => string | null,
): Promise<Result> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: frame } = await supabase.from("frames").select("id, stock, reserved").eq("id", frameId).maybeSingle();
    if (!frame) return { error: "No se encontró el armazón." };

    const problem = check?.(frame);
    if (problem) return { error: problem };

    const newStock = frame.stock + (change.stock ?? 0);
    const newReserved = Math.max(frame.reserved + (change.reserved ?? 0), 0);
    if (newStock < 0) return { error: "El stock no puede quedar negativo." };

    const { data: updated } = await supabase
      .from("frames")
      .update({
        stock: newStock,
        reserved: newReserved,
        status: newStock - newReserved > 0 ? "disponible" : newStock > 0 ? "reservado" : "vendido",
      })
      .eq("id", frameId)
      .eq("stock", frame.stock)
      .eq("reserved", frame.reserved)
      .select("id");

    if (updated && updated.length === 1) {
      await supabase.from("inventory_movements").insert({
        frame_id: frameId,
        kind: movement.kind,
        stock_change: change.stock ?? 0,
        reserved_change: newReserved - frame.reserved,
        sale_id: movement.sale_id ?? null,
        reason: movement.reason ?? null,
      });
      return { ok: true };
    }
    // Otro usuario cambió el armazón al mismo tiempo: se reintenta con los datos nuevos
  }
  return { error: "El armazón se está modificando en este momento. Intenta de nuevo." };
}

/** Aparta una unidad para una venta. Falla si no quedan unidades disponibles. */
export function reserveFrame(supabase: SupabaseClient, frameId: string, saleId: string) {
  return applyChange(supabase, frameId, { reserved: 1 }, { kind: "reserva", sale_id: saleId }, (f) =>
    f.stock - f.reserved <= 0 ? "Ese armazón ya no tiene unidades disponibles (puede estar reservado para otra venta)." : null,
  );
}

/** Libera la reserva (venta anulada antes de entregar). */
export function releaseFrame(supabase: SupabaseClient, frameId: string, saleId: string, reason: string) {
  return applyChange(supabase, frameId, { reserved: -1 }, { kind: "liberacion", sale_id: saleId, reason });
}

/** Entrega al cliente: sale del stock y de la reserva. */
export function deliverFrame(supabase: SupabaseClient, frameId: string, saleId: string) {
  return applyChange(supabase, frameId, { stock: -1, reserved: -1 }, { kind: "entrega", sale_id: saleId });
}

/** Devolución de un armazón ya entregado: vuelve al stock. */
export function returnFrame(supabase: SupabaseClient, frameId: string, saleId: string | null, reason: string) {
  return applyChange(supabase, frameId, { stock: 1 }, { kind: "devolucion", sale_id: saleId, reason });
}

/** Ajuste manual de stock (conteo, merma, ingreso de mercadería). */
export function adjustFrameStock(supabase: SupabaseClient, frameId: string, delta: number, kind: "ajuste" | "ingreso", reason: string) {
  return applyChange(supabase, frameId, { stock: delta }, { kind, reason }, (f) =>
    f.stock + delta < f.reserved ? `No se puede bajar el stock por debajo de las ${f.reserved} unidades reservadas.` : null,
  );
}
