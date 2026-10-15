import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { formatDateTime, isAdmin } from "@/lib/types";
import { getSession } from "@/lib/session";

const ACTION_LABELS: Record<string, string> = {
  crear_venta: "Venta registrada",
  registrar_abono: "Abono registrado",
  entregar_pedido: "Pedido entregado",
  anular_venta: "Venta anulada",
  reversar_pago: "Pago reversado",
  registrar_gasto: "Gasto registrado",
  anular_gasto: "Gasto anulado",
  cerrar_caja: "Caja cerrada",
  reabrir_caja: "Caja reabierta",
  recerrar_caja: "Caja cerrada nuevamente",
  ajuste_inventario: "Ajuste de inventario",
  ingreso_inventario: "Ingreso de mercadería",
  crear_armazon: "Armazón creado",
  editar_armazon: "Armazón editado",
  actualizar_laboratorio: "Seguimiento de laboratorio",
  actualizar_costo_laboratorio: "Costo de laboratorio",
  modificar_costos_venta: "Costos de venta modificados",
  actualizar_estado_orden: "Estado de pedido",
  cambiar_fecha_entrega: "Fecha de entrega",
  cambiar_fecha_compromiso_pago: "Compromiso de pago",
  actualizar_politicas: "Política de descuentos",
  actualizar_rol_usuario: "Rol de usuario",
  activar_usuario: "Usuario activado",
  desactivar_usuario: "Usuario desactivado",
  crear_paciente: "Paciente creado",
  crear_hora: "Hora agendada",
  paciente_rechaza_marketing: "Paciente no quiere mensajes",
  paciente_acepta_marketing: "Paciente acepta mensajes",
};

const GROUPS: { key: string; label: string; actions: string[] }[] = [
  { key: "", label: "Todo", actions: [] },
  { key: "sensibles", label: "Anulaciones y ajustes", actions: ["anular_venta", "reversar_pago", "anular_gasto", "reabrir_caja", "recerrar_caja", "ajuste_inventario", "modificar_costos_venta", "actualizar_politicas", "actualizar_rol_usuario", "desactivar_usuario"] },
  { key: "dinero", label: "Dinero", actions: ["crear_venta", "registrar_abono", "entregar_pedido", "registrar_gasto", "cerrar_caja", "actualizar_costo_laboratorio"] },
  { key: "inventario", label: "Inventario", actions: ["ajuste_inventario", "ingreso_inventario", "crear_armazon", "editar_armazon"] },
];

function summarize(details: Record<string, unknown> | null) {
  if (!details) return "";
  const parts: string[] = [];
  const pick = (k: string, label: string) => {
    const v = details[k];
    if (v !== undefined && v !== null && v !== "") parts.push(`${label}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  };
  pick("motivo", "Motivo");
  pick("orden", "Orden");
  pick("total", "Total");
  pick("amount", "Monto");
  pick("monto", "Monto");
  pick("abono_inicial", "Abono");
  pick("saldo_pendiente", "Saldo");
  pick("autorizado_por", "Autorizó");
  pick("cambio", "Cambio");
  pick("date", "Día");
  pick("difference", "Diferencia");
  pick("status", "Estado");
  pick("role", "Rol");
  return parts.join(" · ");
}

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ grupo?: string; usuario?: string }> }) {
  const { grupo = "", usuario } = await searchParams;
  const { supabase, user, role } = await getSession();
  if (!user) redirect("/login");
  if (!isAdmin(role)) redirect("/dashboard");

  let query = supabase.from("activity_log").select("id, user_id, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(400);
  const group = GROUPS.find((g) => g.key === grupo);
  if (group && group.actions.length) query = query.in("action", group.actions);
  if (usuario) query = query.eq("user_id", usuario);
  const [{ data: rows }, { data: people }] = await Promise.all([query, supabase.from("profiles").select("id, full_name").order("full_name")]);
  const nameOf = (id: string | null) => people?.find((p) => p.id === id)?.full_name ?? (id ? "—" : "Sistema");

  const link = (entity: string, id: string | null) => {
    if (!id) return null;
    if (entity === "sale") return `/ventas/${id}`;
    if (entity === "frame") return `/armazones/${id}`;
    if (entity === "patient") return `/pacientes/${id}`;
    return null;
  };

  return (
    <div>
      <PageHeader title="Auditoría" description="Registro de quién hizo qué, cuándo y por qué. No se puede modificar ni borrar." />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {GROUPS.map((g) => (
          <Link
            key={g.key}
            href={`/auditoria${g.key ? `?grupo=${g.key}` : ""}${usuario ? `${g.key ? "&" : "?"}usuario=${usuario}` : ""}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border ${
              grupo === g.key ? "bg-[var(--oc-blue-700)] text-white border-[var(--oc-blue-700)]" : "bg-white text-[var(--oc-slate-700)] border-[var(--oc-slate-200)] hover:bg-[var(--oc-slate-100)]"
            }`}
          >
            {g.label}
          </Link>
        ))}
        <form action="/auditoria" className="ml-auto flex items-center gap-2">
          {grupo && <input type="hidden" name="grupo" value={grupo} />}
          <select name="usuario" defaultValue={usuario ?? ""} className="rounded-full border border-[var(--oc-slate-200)] bg-white px-3 py-1.5 text-sm">
            <option value="">Todos los usuarios</option>
            {people?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <button className="text-sm font-medium text-[var(--oc-blue-700)]">Filtrar</button>
        </form>
      </div>

      <Card>
        {!rows || rows.length === 0 ? (
          <EmptyState title="Sin registros" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-4 font-medium">Fecha y hora</th>
                  <th className="py-3 px-4 font-medium">Usuario</th>
                  <th className="py-3 px-4 font-medium">Acción</th>
                  <th className="py-3 px-4 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const href = link(r.entity_type, r.entity_id);
                  const sensitive = GROUPS[1].actions.includes(r.action);
                  return (
                    <tr key={r.id} className="border-b border-[var(--oc-slate-100)] last:border-0 align-top">
                      <td className="py-2.5 px-4 text-[var(--oc-slate-500)] whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">{nameOf(r.user_id)}</td>
                      <td className={`py-2.5 px-4 font-medium whitespace-nowrap ${sensitive ? "text-[var(--oc-red)]" : "text-[var(--oc-blue-950)]"}`}>
                        {href ? <Link href={href} className="hover:underline">{ACTION_LABELS[r.action] ?? r.action}</Link> : ACTION_LABELS[r.action] ?? r.action}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--oc-slate-700)] text-xs max-w-xl break-words">{summarize(r.details as Record<string, unknown> | null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-[var(--oc-slate-500)] mt-3">Se muestran los últimos 400 registros del filtro elegido.</p>
    </div>
  );
}
