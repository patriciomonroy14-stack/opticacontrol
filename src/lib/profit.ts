/**
 * Rentabilidad estimada de una venta. Es independiente del flujo de caja:
 * un abono es dinero recibido, no utilidad.
 *
 *  ingreso       = total vendido (ya con descuento)
 *  armazón       = costo del armazón al momento de la venta (frames.purchase_price congelado en sales.frame_cost)
 *  cristales     = cobro real del laboratorio si ya se registró; si no, el costo estimado del catálogo
 *                  (costo del cristal + costo de los filtros)
 *  otros costos  = costos directos adicionales (montaje, envío, etc.)
 */
export type ProfitInput = {
  total: number | string | null;
  frame_cost?: number | string | null;
  lens_cost?: number | string | null;
  other_costs?: number | string | null;
  client_owns_frame?: boolean | null;
  filters_cost?: number | null;
  lab_cost?: number | string | null;
  voided_at?: string | null;
};

export function computeProfit(s: ProfitInput) {
  const n = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
  const revenue = s.voided_at ? 0 : n(s.total);
  const frame = s.client_owns_frame ? 0 : n(s.frame_cost);
  const catalogLens = n(s.lens_cost) + n(s.filters_cost);
  const hasLab = s.lab_cost != null && s.lab_cost !== "";
  const lenses = hasLab ? n(s.lab_cost) : catalogLens;
  const other = n(s.other_costs);
  const cost = s.voided_at ? 0 : frame + lenses + other;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, frame, lenses, lensesSource: hasLab ? ("laboratorio" as const) : ("catalogo" as const), other, cost, profit, margin };
}
