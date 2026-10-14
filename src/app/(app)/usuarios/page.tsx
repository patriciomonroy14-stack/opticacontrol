import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { RoleSelect, ActiveToggle } from "./UserControls";
import { redirect } from "next/navigation";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "administrador") redirect("/dashboard");
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestiona el personal con acceso a Opticacontrol y sus permisos"
      />

      <Card>
        {!profiles || profiles.length === 0 ? (
          <EmptyState title="No hay usuarios" description="Los usuarios se crean cuando alguien inicia sesión por primera vez con una invitación." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-5 font-medium">Nombre</th>
                  <th className="py-3 px-5 font-medium">Rol</th>
                  <th className="py-3 px-5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                    <td className="py-3 px-5 font-medium text-[var(--oc-blue-950)]">{p.full_name}</td>
                    <td className="py-3 px-5"><RoleSelect userId={p.id} role={p.role} /></td>
                    <td className="py-3 px-5"><ActiveToggle userId={p.id} active={p.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-[var(--oc-slate-500)] mt-4">
        Permisos por rol — Administrador: acceso completo. Recepcionista: pacientes, agenda, recetas y ventas. Vendedor: pacientes, ventas e inventario. Solo consulta: solo lectura.
      </p>
    </div>
  );
}
