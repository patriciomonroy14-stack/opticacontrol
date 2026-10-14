import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { NewQuoteForm } from "./NewQuoteForm";

export default async function NuevaCotizacionPage() {
  const supabase = await createClient();

  const [
    { data: patients },
    { data: frames },
    { data: lensTypes },
    { data: lensMaterials },
    { data: lensBasePrices },
    { data: lensFilters },
    { data: lensFilterColors },
    { data: lensFilterPrices },
  ] = await Promise.all([
    supabase.from("patients").select("id, full_name").eq("status", "activo").order("full_name"),
    supabase.from("frames").select("id, code, brand, model, sale_price, stock").gt("stock", 0).order("brand"),
    supabase.from("lens_types").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("lens_materials").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("lens_catalog_prices").select("lens_type_id, material_id, price").eq("active", true).is("color_id", null),
    supabase.from("lens_filters").select("id, name, has_color").eq("active", true).order("sort_order"),
    supabase.from("lens_filter_colors").select("id, name, filter_id").eq("active", true).order("sort_order"),
    supabase.from("lens_filter_prices").select("filter_id, material_id, color_id, price").eq("active", true),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nueva cotización" description="Ingresa la receta y arma una cotización para el paciente" />
      <Card className="p-6">
        <NewQuoteForm
          patients={patients || []}
          frames={frames || []}
          lensTypes={lensTypes || []}
          lensMaterials={lensMaterials || []}
          lensBasePrices={lensBasePrices || []}
          lensFilters={lensFilters || []}
          lensFilterColors={lensFilterColors || []}
          lensFilterPrices={lensFilterPrices || []}
        />
      </Card>
    </div>
  );
}
