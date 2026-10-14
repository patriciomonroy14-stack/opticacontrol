import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, EmptyState, inputCls } from "@/components/ui";
import { formatCLP } from "@/lib/types";
import { NewFrameForm } from "./NewFrameForm";
import { Search, Glasses } from "lucide-react";

export default async function ArmazonesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = profile?.role === "administrador";

  // El precio de compra solo se consulta para el administrador
  const columns = "id, code, brand, model, color, material, sale_price, stock, photo_url, notes" + (isAdmin ? ", purchase_price" : "");
  let query = supabase.from("frames").select(columns).order("brand");
  if (q?.trim()) {
    const term = q.trim();
    query = query.or(`brand.ilike.%${term}%,model.ilike.%${term}%,code.ilike.%${term}%,color.ilike.%${term}%,material.ilike.%${term}%`);
  }
  const { data: frames } = await query.limit(100);

  return (
    <div>
      <PageHeader title="Armazones" description="Catálogo e inventario de armazones" action={<NewFrameForm showPurchasePrice={isAdmin} />} />

      <form action="/armazones" className="mb-5 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--oc-slate-500)]" />
          <input name="q" defaultValue={q} placeholder="Código, marca o material…" className={`${inputCls} pl-9 rounded-full`} />
        </div>
      </form>

      {!frames || frames.length === 0 ? (
        <Card><EmptyState title="No se encontraron armazones" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(frames as any[]).map((f) => (
            <Card key={f.id} className="overflow-hidden">
              <div className="h-36 bg-[var(--oc-slate-100)] flex items-center justify-center">
                {f.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.photo_url} alt={f.code} className="h-full w-full object-cover" />
                ) : (
                  <Glasses className="h-10 w-10 text-[var(--oc-slate-300)]" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--oc-blue-950)] text-sm">{[f.brand, f.model].filter(Boolean).join(" ") || "Sin marca"}</p>
                    <p className="text-xs text-[var(--oc-slate-500)]">{[f.code, f.material].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Badge tone={f.stock > 0 ? "green" : "red"}>{f.stock > 0 ? `${f.stock} en stock` : "Sin stock"}</Badge>
                </div>
                <p className="font-display font-bold text-[var(--oc-blue-950)] mt-2">{formatCLP(f.sale_price)}</p>
                {isAdmin && (
                  <p className="text-xs text-[var(--oc-slate-500)] mt-0.5">Compra: {formatCLP(f.purchase_price)}</p>
                )}
                {f.notes && <p className="text-xs text-[var(--oc-slate-500)] mt-1 line-clamp-2">{f.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
