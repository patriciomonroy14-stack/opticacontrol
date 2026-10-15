import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { OpticaInfoForm, BusinessHoursForm, PoliciesForm } from "./SettingsForms";
import { getSession } from "@/lib/session";
import { AutomationSwitch } from "./AutomationSwitch";
import { Layers, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { role } = await getSession();
  const [{ data: opticaInfo }, { data: hours }, { data: automations }, { data: policies }] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "optica_info").maybeSingle(),
    supabase.from("settings").select("value").eq("key", "business_hours").maybeSingle(),
    supabase.from("automation_rules").select("*").order("key"),
    supabase.from("settings").select("value").eq("key", "policies").maybeSingle(),
  ]);

  return (
    <div>
      <PageHeader title="Configuración" description="Parámetros generales de Opticacontrol" />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Datos de la óptica</h2>
          <OpticaInfoForm name={opticaInfo?.value?.name || "Óptica Retiro"} logoUrl={opticaInfo?.value?.logo_url || null} />
        </Card>

        {role === "administrador" && (
          <Card className="p-6">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Descuentos</h2>
            <PoliciesForm maxDiscountPct={Number((policies?.value as { max_discount_pct?: number } | null)?.max_discount_pct ?? 10)} />
          </Card>
        )}

        <Card className="p-6">
          <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4">Horarios de atención</h2>
          <BusinessHoursForm
            weekdays={hours?.value?.lunes_viernes || ""}
            saturday={hours?.value?.sabado || ""}
            sunday={hours?.value?.domingo || ""}
            slotMinutes={Number(hours?.value?.slot_minutes) || 15}
          />
        </Card>
      </div>

      <Link href="/configuracion/cristales" className="block mt-6">
        <Card className="p-5 flex items-center justify-between hover:bg-[var(--oc-slate-100)]/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[var(--oc-blue-100)] text-[var(--oc-blue-700)] flex items-center justify-center">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-display font-semibold text-[var(--oc-blue-950)]">Catálogo de cristales</p>
              <p className="text-sm text-[var(--oc-slate-500)]">Tipos, materiales, colores y precios (solo administrador)</p>
            </div>
          </div>
          <ChevronRight className="h-4.5 w-4.5 text-[var(--oc-slate-500)]" />
        </Card>
      </Link>

      <Card className="p-6 mt-6">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Automatizaciones</h2>
        <p className="text-sm text-[var(--oc-slate-500)] mb-4">Activa o desactiva los avisos automáticos de fidelización y seguimiento.</p>
        <ul className="divide-y divide-[var(--oc-slate-100)]">
          {(automations || []).map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--oc-blue-950)]">{a.label}</p>
                <p className="text-xs text-[var(--oc-slate-500)]">{a.description}</p>
              </div>
              <AutomationSwitch id={a.key} enabled={a.enabled} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-1">Integraciones preparadas</h2>
        <p className="text-sm text-[var(--oc-slate-500)]">
          La arquitectura está lista para conectar, cuando se decida: envío real de correos (Resend/SendGrid), WhatsApp, SMS, boleta electrónica e integración con laboratorios. Cada uno de estos puntos ya tiene su lugar reservado en la base de datos y en el código.
        </p>
      </Card>
    </div>
  );
}
