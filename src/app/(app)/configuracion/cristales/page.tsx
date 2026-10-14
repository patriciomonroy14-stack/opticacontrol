import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { formatCLP, formatDateTime, isManager } from "@/lib/types";
import { AddItemForm } from "./AddItemForm";
import { AddColorForm, AddFilterForm, AddFilterColorForm, ActiveToggleSmall } from "./CatalogControls";
import { PriceForm } from "./PriceForm";
import { FilterPriceForm } from "./FilterPriceForm";
import { createLensType, createLensMaterial } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CristalesCatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isManager(profile?.role)) {
    return (
      <div>
        <PageHeader title="Catálogo de cristales" />
        <Card className="p-8 text-center">
          <p className="text-[var(--oc-slate-700)]">Solo un administrador o la encargada pueden ver y editar esta sección.</p>
        </Card>
      </div>
    );
  }

  const [
    { data: lensTypes },
    { data: lensMaterials },
    { data: lensColors },
    { data: prices },
    { data: lensFilters },
    { data: lensFilterColors },
    { data: filterPrices },
  ] = await Promise.all([
    supabase.from("lens_types").select("*").order("sort_order"),
    supabase.from("lens_materials").select("*").order("sort_order"),
    supabase.from("lens_colors").select("*").order("sort_order"),
    supabase.from("lens_catalog_prices").select("*, lens_types(name), lens_materials(name), lens_colors(name)").order("created_at", { ascending: false }),
    supabase.from("lens_filters").select("*").order("sort_order"),
    supabase.from("lens_filter_colors").select("*").order("sort_order"),
    supabase.from("lens_filter_prices").select("*, lens_filters(name), lens_materials(name), lens_filter_colors(name)").order("created_at", { ascending: false }),
  ]);

  const typeNameById = Object.fromEntries((lensTypes || []).map((t) => [t.id, t.name]));
  const filterNameById = Object.fromEntries((lensFilters || []).map((f) => [f.id, f.name]));
  const activeLensTypes = (lensTypes || []).filter((t) => t.active);

  return (
    <div>
      <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--oc-blue-700)] mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a Configuración
      </Link>
      <PageHeader title="Catálogo de cristales" description="Administra tipos, materiales, filtros, colores y precios. Solo tú (administrador) puedes editar esto." />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Tipos de cristal (base)</h2>
          <p className="text-xs text-[var(--oc-slate-500)] mb-4">El diseño óptico del lente: Monofocal, Bifocal, Multifocal, etc.</p>
          <div className="relative mb-4">
            <AddItemForm action={createLensType} placeholder="Ej: Ocupacional" buttonLabel="Agregar tipo" />
          </div>
          <ul className="divide-y divide-[var(--oc-slate-100)]">
            {(lensTypes || []).map((t) => (
              <li key={t.id} className="py-2.5 flex items-center justify-between">
                <span className="text-sm text-[var(--oc-blue-950)]">{t.name}</span>
                <ActiveToggleSmall table="lens_types" id={t.id} active={t.active} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Materiales</h2>
          <div className="relative mb-4">
            <AddItemForm action={createLensMaterial} placeholder="Ej: Trivex" buttonLabel="Agregar material" />
          </div>
          <ul className="divide-y divide-[var(--oc-slate-100)]">
            {(lensMaterials || []).map((m) => (
              <li key={m.id} className="py-2.5 flex items-center justify-between">
                <span className="text-sm text-[var(--oc-blue-950)]">{m.name}</span>
                <ActiveToggleSmall table="lens_materials" id={m.id} active={m.active} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Precios base (Tipo + Material)</h2>
        <p className="text-sm text-[var(--oc-slate-500)] mb-4">
          El precio del cristal según su diseño óptico y material, antes de sumar filtros.
        </p>
        <div className="mb-6">
          <PriceForm lensTypes={activeLensTypes} lensMaterials={lensMaterials || []} lensColors={[]} />
        </div>
        {!prices || prices.length === 0 ? (
          <EmptyState title="Aún no hay precios base configurados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Material</th>
                  <th className="py-2 pr-4 font-medium">Precio</th>
                  <th className="py-2 pr-4 font-medium">Actualizado</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p: any) => (
                  <tr key={p.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                    <td className="py-2 pr-4 font-medium text-[var(--oc-blue-950)]">{p.lens_types?.name}</td>
                    <td className="py-2 pr-4 text-[var(--oc-slate-700)]">{p.lens_materials?.name}</td>
                    <td className="py-2 pr-4 font-semibold text-[var(--oc-blue-950)] tabular-nums">{formatCLP(p.price)}</td>
                    <td className="py-2 pr-4 text-xs text-[var(--oc-slate-500)]">{formatDateTime(p.updated_at)}</td>
                    <td className="py-2 pr-4"><ActiveToggleSmall table="lens_catalog_prices" id={p.id} active={p.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 mb-6">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Filtros / tratamientos</h2>
        <p className="text-sm text-[var(--oc-slate-500)] mb-4">Fotocromático, Polarizado, Teñido de sol, Filtro azul, Antirreflejo… se pueden combinar varios a la vez.</p>
        <div className="mb-4">
          <AddFilterForm />
        </div>
        <ul className="divide-y divide-[var(--oc-slate-100)]">
          {(lensFilters || []).map((f) => (
            <li key={f.id} className="py-2.5 flex items-center justify-between">
              <span className="text-sm text-[var(--oc-blue-950)]">{f.name} {f.has_color && <span className="text-xs text-[var(--oc-slate-500)]">(tiene color)</span>}</span>
              <ActiveToggleSmall table="lens_filters" id={f.id} active={f.active} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 mb-6">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Colores de filtro</h2>
        <p className="text-sm text-[var(--oc-slate-500)] mb-4">Un color queda asociado a un filtro específico (ej: Gris/Negro/Café solo para Fotocromático).</p>
        <div className="mb-4">
          <AddFilterColorForm lensFilters={lensFilters || []} />
        </div>
        {!lensFilterColors || lensFilterColors.length === 0 ? (
          <p className="text-sm text-[var(--oc-slate-500)]">Aún no hay colores configurados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lensFilterColors.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-[var(--oc-slate-100)] rounded-full pl-3 pr-1.5 py-1">
                <span className="text-xs text-[var(--oc-slate-700)]">{c.name} · {filterNameById[c.filter_id]}</span>
                <ActiveToggleSmall table="lens_filter_colors" id={c.id} active={c.active} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Precios de filtros</h2>
        <p className="text-sm text-[var(--oc-slate-500)] mb-4">
          Define cuánto suma cada filtro. Puedes dejar material y color en "cualquiera" para un precio plano, o ser más específico si el precio varía. Los precios ya usados en cotizaciones o ventas anteriores no cambian retroactivamente.
        </p>
        <div className="mb-6">
          <FilterPriceForm lensFilters={lensFilters || []} lensMaterials={lensMaterials || []} lensFilterColors={lensFilterColors || []} />
        </div>

        {!filterPrices || filterPrices.length === 0 ? (
          <EmptyState title="Aún no hay precios de filtros configurados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-2 pr-4 font-medium">Filtro</th>
                  <th className="py-2 pr-4 font-medium">Material</th>
                  <th className="py-2 pr-4 font-medium">Color</th>
                  <th className="py-2 pr-4 font-medium">Precio</th>
                  <th className="py-2 pr-4 font-medium">Actualizado</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filterPrices.map((p: any) => (
                  <tr key={p.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                    <td className="py-2 pr-4 font-medium text-[var(--oc-blue-950)]">{p.lens_filters?.name}</td>
                    <td className="py-2 pr-4 text-[var(--oc-slate-700)]">{p.lens_materials?.name || "Cualquiera"}</td>
                    <td className="py-2 pr-4 text-[var(--oc-slate-500)]">{p.lens_filter_colors?.name || "Cualquiera"}</td>
                    <td className="py-2 pr-4 font-semibold text-[var(--oc-blue-950)] tabular-nums">{formatCLP(p.price)}</td>
                    <td className="py-2 pr-4 text-xs text-[var(--oc-slate-500)]">{formatDateTime(p.updated_at)}</td>
                    <td className="py-2 pr-4"><ActiveToggleSmall table="lens_filter_prices" id={p.id} active={p.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
