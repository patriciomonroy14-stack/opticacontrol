import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { formatCLP } from "@/lib/types";
import { NewLensForm } from "./NewLensForm";

export default async function CristalesPage() {
  const supabase = await createClient();
  const { data: lenses } = await supabase.from("lenses").select("*").order("lens_type");

  return (
    <div>
      <PageHeader title="Cristales" description="Tipos de cristales y tratamientos disponibles" action={<NewLensForm />} />

      <Card>
        {!lenses || lenses.length === 0 ? (
          <EmptyState title="Aún no hay cristales registrados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-5 font-medium">Código</th>
                  <th className="py-3 px-5 font-medium">Tipo</th>
                  <th className="py-3 px-5 font-medium">Material / índice</th>
                  <th className="py-3 px-5 font-medium">Tratamientos</th>
                  <th className="py-3 px-5 font-medium">Precio</th>
                  <th className="py-3 px-5 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {lenses.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{l.code || "—"}</td>
                    <td className="py-3 px-5 font-medium text-[var(--oc-blue-950)]">{l.lens_type}{l.focal_type ? ` · ${l.focal_type}` : ""}</td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{l.material || "—"} {l.lens_index ? `· ${l.lens_index}` : ""}</td>
                    <td className="py-3 px-5">
                      <div className="flex flex-wrap gap-1">
                        {l.photochromic && <Badge tone="blue">Fotocromático</Badge>}
                        {l.antireflective && <Badge tone="blue">Antirreflejo</Badge>}
                        {(l.treatments || []).map((t: string) => <Badge key={t}>{t}</Badge>)}
                      </div>
                    </td>
                    <td className="py-3 px-5 font-semibold text-[var(--oc-blue-950)]">{formatCLP(l.price)}</td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{l.stock ?? "—"}</td>
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
