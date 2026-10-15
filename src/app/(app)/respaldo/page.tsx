import { redirect } from "next/navigation";
import { Download, ShieldCheck } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { formatDateTime, isAdmin } from "@/lib/types";
import { getSession } from "@/lib/session";

const TABLES: { key: string; label: string }[] = [
  { key: "patients", label: "Pacientes" },
  { key: "prescriptions", label: "Recetas" },
  { key: "appointments", label: "Agenda" },
  { key: "sales", label: "Ventas" },
  { key: "sale_payments", label: "Pagos y abonos" },
  { key: "orders", label: "Pedidos y laboratorio" },
  { key: "frames", label: "Armazones" },
  { key: "inventory_movements", label: "Movimientos de inventario" },
  { key: "cash_expenses", label: "Gastos" },
  { key: "cash_closings", label: "Cierres de caja" },
  { key: "communications", label: "Comunicaciones" },
  { key: "activity_log", label: "Auditoría" },
];

export default async function RespaldoPage() {
  const { supabase, user, role } = await getSession();
  if (!user) redirect("/login");
  if (!isAdmin(role)) redirect("/dashboard");

  const { data: last } = await supabase.from("activity_log").select("created_at, details").eq("action", "descargar_respaldo").order("created_at", { ascending: false }).limit(1).maybeSingle();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Respaldo y seguridad" description="Descarga una copia de toda la información de la óptica" />

      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-[var(--oc-blue-100)] flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-[var(--oc-blue-700)]" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Respaldo completo</h2>
            <p className="text-sm text-[var(--oc-slate-700)] mt-1">Un solo archivo con todas las tablas. Guárdalo en un lugar seguro (por ejemplo, tu Google Drive) al menos una vez por semana.</p>
            <p className="text-xs text-[var(--oc-slate-500)] mt-1">Último respaldo descargado: {last ? formatDateTime(last.created_at) : "nunca"}</p>
            <a href="/respaldo/descargar" className="inline-flex items-center gap-2 mt-4 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)]">
              <Download className="h-4 w-4" /> Descargar respaldo completo
            </a>
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Por tabla (para abrir en Excel)</h2>
        <p className="text-sm text-[var(--oc-slate-500)] mb-4">Archivos CSV que se abren directamente en Excel o Google Sheets.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {TABLES.map((t) => (
            <a key={t.key} href={`/respaldo/descargar?tabla=${t.key}`} className="flex items-center justify-between rounded-lg border border-[var(--oc-slate-200)] px-4 py-2.5 text-sm hover:bg-[var(--oc-slate-100)]">
              <span className="text-[var(--oc-blue-950)]">{t.label}</span>
              <Download className="h-4 w-4 text-[var(--oc-slate-500)]" />
            </a>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-[var(--oc-green-bg)] flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-[var(--oc-green)]" />
          </div>
          <div className="text-sm text-[var(--oc-slate-700)] space-y-2">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Cómo se protege la información</h2>
            <p><b>Acceso por usuario:</b> cada persona entra con su cuenta y solo ve lo que su rol permite. La base de datos aplica las mismas reglas, no solo la pantalla.</p>
            <p><b>Sin borrados financieros:</b> ventas, pagos, gastos y cierres no se eliminan; se anulan o se reversan con motivo, y quedan en el historial.</p>
            <p><b>Auditoría:</b> cada acción importante guarda fecha, hora, usuario y motivo. Solo tú puedes verla.</p>
            <p><b>Datos de pacientes:</b> los mensajes de marketing respetan a quien pide no ser contactado, y los respaldos solo los puede descargar la administradora.</p>
            <p className="text-xs text-[var(--oc-slate-500)]">La base de datos está en el plan gratuito de Supabase, que no incluye copias automáticas diarias. Por eso es importante descargar este respaldo con regularidad, o pasar al plan Pro, que sí las incluye.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
