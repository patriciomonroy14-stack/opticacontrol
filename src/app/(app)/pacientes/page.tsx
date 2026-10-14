import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, PrimaryButton, EmptyState, inputCls } from "@/components/ui";
import { formatDate } from "@/lib/types";
import { UserPlus, Search } from "lucide-react";
import Link from "next/link";

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("patients")
    .select("id, full_name, rut, phone, email, comuna, status, created_at")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(`full_name.ilike.%${term}%,rut.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data: patients } = await query.limit(100);

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Busca, crea y administra las fichas de pacientes de Óptica Retiro"
        action={<PrimaryButton href="/pacientes/nuevo"><UserPlus className="h-4 w-4" /> Nuevo paciente</PrimaryButton>}
      />

      <form action="/pacientes" className="mb-5 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--oc-slate-500)]" />
          <input name="q" defaultValue={q} placeholder="Nombre, RUT, teléfono o correo…" className={`${inputCls} pl-9 rounded-full`} />
        </div>
      </form>

      <Card>
        {!patients || patients.length === 0 ? (
          <EmptyState title="No se encontraron pacientes" description="Prueba con otro término de búsqueda o crea un nuevo paciente." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-5 font-medium">Paciente</th>
                  <th className="py-3 px-5 font-medium">RUT</th>
                  <th className="py-3 px-5 font-medium">Contacto</th>
                  <th className="py-3 px-5 font-medium">Comuna</th>
                  <th className="py-3 px-5 font-medium">Estado</th>
                  <th className="py-3 px-5 font-medium">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--oc-slate-100)] last:border-0 hover:bg-[var(--oc-slate-100)]/50">
                    <td className="py-3 px-5">
                      <Link href={`/pacientes/${p.id}`} className="font-medium text-[var(--oc-blue-800)] hover:underline">
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{p.rut || "—"}</td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">
                      <div>{p.phone || "—"}</div>
                      <div className="text-xs">{p.email || ""}</div>
                    </td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{p.comuna || "—"}</td>
                    <td className="py-3 px-5"><Badge tone={p.status === "activo" ? "green" : "slate"}>{p.status}</Badge></td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{formatDate(p.created_at)}</td>
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
