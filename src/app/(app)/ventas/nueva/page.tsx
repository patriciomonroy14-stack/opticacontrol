import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { NewSaleForm } from "./NewSaleForm";

export default async function NuevaVentaPage({ searchParams }: { searchParams: Promise<{ paciente?: string }> }) {
  const { paciente } = await searchParams;
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
      <PageHeader title="Nueva venta" description="Registra el pedido, el abono inicial y la fecha de entrega" />
      <Card className="p-6">
        <NewSaleForm
          patients={patients || []}
          frames={frames || []}
          lensTypes={lensTypes || []}
          lensMaterials={lensMaterials || []}
          lensBasePrices={lensBasePrices || []}
          lensFilters={lensFilters || []}
          lensFilterColors={lensFilterColors || []}
          lensFilterPrices={lensFilterPrices || []}
          defaultPatientName={(patients || []).find((p) => p.id === paciente)?.full_name}
        />
      </Card>
    </div>
  );
}
