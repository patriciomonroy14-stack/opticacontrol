import Link from "next/link";
import { PageHeader, Card, Badge, EmptyState, inputCls } from "@/components/ui";
import { formatCLP, isAdmin } from "@/lib/types";
import { getSession } from "@/lib/session";
import { NewFrameForm } from "./NewFrameForm";
import { Search, Glasses } from "lucide-react";

const LOW_STOCK = 1;

export default async function ArmazonesPage({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string }> }) {
  const { q, filtro } = await searchParams;
  const { supabase, role } = await getSession();
  const admin = isAdmin(role);

  // El costo de adquisición solo se consulta para la administradora
  const columns = "id, code, frame_type, brand, model, color, material, supplier, sale_price, stock, reserved, photo_url, notes" + (admin ? ", purchase_price" : "");
  let query = supabase.from("frames").select(columns).neq("status", "baja").order("code").order("frame_type");
  if (q?.trim()) {
    const term = q.trim().replace(/[,()]/g, " ");
    query = query.or(`frame_type.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,code.ilike.%${term}%,color.ilike.%${term}%,material.ilike.%${term}%,supplier.ilike.%${term}%`);
  }
  const { data } = await query.limit(300);
  const all = ((data as any[]) || []).map((f) => ({ ...f, available: Number(f.stock) - Number(f.reserved || 0) }));
  const frames = filtro === "bajo" ? all.filter((f) => f.available <= LOW_STOCK) : all;
  const lowCount = all.filter((f) => f.available <= LOW_STOCK).length;
  const units = all.reduce((s, f) => s + Number(f.stock), 0);
  const value = admin ? all.reduce((s, f) => s + Number(f.stock) * Number(f.purchase_price || 0), 0) : 0;

  return (
    <div>
      <PageHeader title="Armazones" description="Inventario: stock físico, reservados para ventas y disponibles" action={<NewFrameForm showPurchasePrice={admin} existing={all.map((f) => ({ code: f.code, frame_type: f.frame_type, brand: f.brand, sale_price: f.sale_price }))} />} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <form action="/armazones" className="flex-1 min-w-[14rem] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--oc-slate-500)]" />
            <input name="q" defaultValue={q} placeholder="Código, tipo, marca, color…" className={`${inputCls} pl-9 rounded-full`} />
          </div>
        </form>
        <Link
          href={filtro === "bajo" ? "/armazones" : "/armazones?filtro=bajo"}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border ${
            filtro === "bajo" ? "bg-[var(--oc-red)] text-white border-[var(--oc-red)]" : "bg-white text-[var(--oc-red)] border-[var(--oc-red)]"
          }`}
        >
          Stock bajo ({lowCount})
        </Link>
        <p className="text-xs text-[var(--oc-slate-500)] ml-auto">
          {all.length} modelos · {units} unidades{admin ? ` · valor al costo ${formatCLP(value)}` : ""}
        </p>
      </div>

      {frames.length === 0 ? (
        <Card><EmptyState title="No se encontraron armazones" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {frames.map((f) => (
            <Link key={f.id} href={`/armazones/${f.id}`}>
              <Card className="overflow-hidden h-full hover:border-[var(--oc-blue-500)] transition-colors">
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
                      <p className="font-medium text-[var(--oc-blue-950)] text-sm">{f.code}{f.frame_type ? <span className="ml-1.5 rounded bg-[var(--oc-blue-100)] px-1.5 py-0.5 text-xs font-semibold text-[var(--oc-blue-800)]">{f.frame_type}</span> : null}</p>
                      <p className="text-xs text-[var(--oc-slate-500)]">{[f.brand, f.model, f.color].filter(Boolean).join(" · ") || "Sin marca"}</p>
                    </div>
                    <Badge tone={f.available > LOW_STOCK ? "green" : f.available > 0 ? "amber" : "red"}>
                      {f.available > 0 ? `${f.available} disp.` : "Sin stock"}
                    </Badge>
                  </div>
                  <p className="font-display font-bold text-[var(--oc-blue-950)] mt-2">{formatCLP(f.sale_price)}</p>
                  <p className="text-xs text-[var(--oc-slate-500)] mt-0.5">
                    Stock {f.stock}{Number(f.reserved) > 0 ? ` · ${f.reserved} reservado${f.reserved === 1 ? "" : "s"}` : ""}
                    {admin ? ` · costo ${formatCLP(f.purchase_price)}` : ""}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
