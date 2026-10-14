import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, PrimaryButton, EmptyState } from "@/components/ui";
import { formatCLP, formatDate } from "@/lib/types";
import { QuoteActions } from "./QuoteActions";
import { FileText } from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  convertida: "Convertida en venta",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

export default async function CotizacionesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*, patients(id, full_name), frames(brand, model), lens_types(name), lens_materials(name), quote_filters(filter_name, color_name)")
    .order("quote_date", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        description="Cotiza recetas con cristales y armazones antes de concretar la venta"
        action={<PrimaryButton href="/cotizaciones/nueva"><FileText className="h-4 w-4" /> Nueva cotización</PrimaryButton>}
      />

      <Card>
        {!quotes || quotes.length === 0 ? (
          <EmptyState title="Aún no hay cotizaciones" description="Crea una nueva cotización desde el botón de arriba." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-5 font-medium">Fecha</th>
                  <th className="py-3 px-5 font-medium">Paciente</th>
                  <th className="py-3 px-5 font-medium">Cristal / Armazón</th>
                  <th className="py-3 px-5 font-medium">Total</th>
                  <th className="py-3 px-5 font-medium">Estado</th>
                  <th className="py-3 px-5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q: any) => (
                  <tr key={q.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{formatDate(q.quote_date)}</td>
                    <td className="py-3 px-5">
                      {q.patients ? (
                        <Link href={`/pacientes/${q.patients.id}`} className="font-medium text-[var(--oc-blue-800)] hover:underline">
                          {q.patients.full_name}
                        </Link>
                      ) : (
                        <span className="font-medium text-[var(--oc-blue-950)]">{q.walkin_name} <span className="text-xs text-[var(--oc-slate-500)]">(sin ficha)</span></span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">
                      {q.lens_types ? `${q.lens_types.name}${q.lens_materials ? " · " + q.lens_materials.name : ""}` : "—"}
                      {q.quote_filters && q.quote_filters.length > 0 && (
                        <span className="block text-xs text-[var(--oc-blue-700)]">
                          {q.quote_filters.map((f: any) => f.color_name ? `${f.filter_name} (${f.color_name})` : f.filter_name).join(", ")}
                        </span>
                      )}
                      {q.frames ? ` · Armazón: ${q.frames.brand} ${q.frames.model}` : q.client_owns_frame ? " · Armazón del cliente" : ""}
                    </td>
                    <td className="py-3 px-5 font-semibold text-[var(--oc-blue-950)]">{formatCLP(q.total)}</td>
                    <td className="py-3 px-5">
                      <Badge tone={q.status === "convertida" ? "green" : q.status === "rechazada" || q.status === "vencida" ? "red" : "blue"}>
                        {STATUS_LABELS[q.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-5"><QuoteActions quoteId={q.id} status={q.status} hasPatient={!!q.patients} /></td>
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
