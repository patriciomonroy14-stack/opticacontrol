import type { SupabaseClient } from "@supabase/supabase-js";

export async function getBaseLensPrice(supabase: SupabaseClient, lensTypeId: string, materialId: string): Promise<number | null> {
  const { data } = await supabase
    .from("lens_catalog_prices")
    .select("price")
    .eq("lens_type_id", lensTypeId)
    .eq("material_id", materialId)
    .is("color_id", null)
    .eq("active", true)
    .maybeSingle();
  return data ? Number(data.price) : null;
}

export type SelectedFilter = { filter_id: string; color_id?: string | null };
export type PricedFilter = { filter_id: string; filter_name: string; color_id: string | null; color_name: string | null; price: number };

/**
 * Busca el precio de un filtro de más específico a menos específico:
 * filtro+material+color > filtro+material > filtro+color > filtro solo.
 */
export async function priceSelectedFilters(
  supabase: SupabaseClient,
  selected: SelectedFilter[],
  materialId: string | null
): Promise<{ filters: PricedFilter[]; total: number } | { error: string }> {
  const results: PricedFilter[] = [];
  let total = 0;

  for (const sel of selected) {
    const { data: filter } = await supabase.from("lens_filters").select("id, name, has_color").eq("id", sel.filter_id).eq("active", true).maybeSingle();
    if (!filter) return { error: "Uno de los filtros seleccionados ya no está disponible." };

    let colorName: string | null = null;
    if (filter.has_color && sel.color_id) {
      const { data: color } = await supabase.from("lens_filter_colors").select("name").eq("id", sel.color_id).maybeSingle();
      colorName = color?.name || null;
    }

    const attempts: Array<{ material_id?: string; color_id?: string }> = [];
    if (materialId && sel.color_id) attempts.push({ material_id: materialId, color_id: sel.color_id });
    if (materialId) attempts.push({ material_id: materialId });
    if (sel.color_id) attempts.push({ color_id: sel.color_id });
    attempts.push({});

    let price: number | null = null;
    for (const attempt of attempts) {
      let q = supabase.from("lens_filter_prices").select("price").eq("filter_id", filter.id).eq("active", true);
      q = attempt.material_id ? q.eq("material_id", attempt.material_id) : q.is("material_id", null);
      q = attempt.color_id ? q.eq("color_id", attempt.color_id) : q.is("color_id", null);
      const { data } = await q.maybeSingle();
      if (data) {
        price = Number(data.price);
        break;
      }
    }

    if (price == null) return { error: `No hay un precio configurado para el filtro "${filter.name}" con esa combinación.` };

    results.push({ filter_id: filter.id, filter_name: filter.name, color_id: sel.color_id || null, color_name: colorName, price });
    total += price;
  }

  return { filters: results, total };
}
