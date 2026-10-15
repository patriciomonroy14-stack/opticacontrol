import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { CampaignPanel } from "./CampaignPanel";

const FILTERS = [
  { key: "sin_12", label: "Sin compra hace 12 meses" },
  { key: "sin_24", label: "Sin compra hace 24 meses" },
  { key: "sin_6", label: "Sin compra hace 6 meses" },
  { key: "sin_18", label: "Sin compra hace 18 meses" },
  { key: "cumpleanos", label: "Cumpleaños este mes" },
  { key: "frecuentes", label: "Clientes frecuentes" },
  { key: "nuevos", label: "Clientes nuevos (30 días)" },
  { key: "inactivos", label: "Clientes inactivos" },
];

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "sin_12" } = await searchParams;
  const supabase = await createClient();

  let patients: { id: string; full_name: string; phone: string | null; email: string | null; detail?: string; months?: number | null }[] = [];

  if (filter.startsWith("sin_")) {
    const months = Number(filter.replace("sin_", ""));
    const { data } = await supabase
      .from("patient_last_purchase")
      .select("*")
      .eq("status", "activo")
      .gte("months_since_last_purchase", months)
      .order("months_since_last_purchase", { ascending: false });
    patients = (data || []).map((p: any) => ({
      id: p.patient_id,
      full_name: p.full_name,
      phone: p.phone,
      email: p.email,
      detail: p.last_purchase_date ? `${Math.floor(p.months_since_last_purchase)} meses sin comprar` : "Nunca ha comprado",
      months: p.last_purchase_date ? Math.floor(p.months_since_last_purchase) : null,
    }));
  } else if (filter === "cumpleanos") {
    const { data } = await supabase.from("patients").select("id, full_name, phone, email, birth_date").eq("status", "activo");
    const today = new Date();
    patients = (data || [])
      .filter((p) => p.birth_date && new Date(p.birth_date).getMonth() === today.getMonth())
      .map((p) => ({ id: p.id, full_name: p.full_name, phone: p.phone, email: p.email, detail: `Cumpleaños: ${new Date(p.birth_date!).getDate()}/${today.getMonth() + 1}` }));
  } else if (filter === "nuevos") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from("patients").select("id, full_name, phone, email, created_at").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false });
    patients = (data || []).map((p) => ({ id: p.id, full_name: p.full_name, phone: p.phone, email: p.email, detail: "Registrado hace menos de 30 días" }));
  } else if (filter === "inactivos") {
    const { data } = await supabase.from("patients").select("id, full_name, phone, email").eq("status", "inactivo");
    patients = (data || []).map((p) => ({ id: p.id, full_name: p.full_name, phone: p.phone, email: p.email, detail: "Marcado como inactivo" }));
  } else if (filter === "frecuentes") {
    const { data: sales } = await supabase.from("sales").select("patient_id");
    const counts: Record<string, number> = {};
    (sales || []).forEach((s) => { counts[s.patient_id] = (counts[s.patient_id] || 0) + 1; });
    const frequentIds = Object.entries(counts).filter(([, c]) => c >= 2).map(([id]) => id);
    if (frequentIds.length > 0) {
      const { data } = await supabase.from("patients").select("id, full_name, phone, email").in("id", frequentIds);
      patients = (data || []).map((p) => ({ id: p.id, full_name: p.full_name, phone: p.phone, email: p.email, detail: `${counts[p.id]} compras registradas` }));
    }
  }

  // Preferencias de contacto y último mensaje (últimos 30 días)
  const ids = patients.map((p) => p.id);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: prefs }, { data: comms }] = ids.length
    ? await Promise.all([
        supabase.from("patients").select("id, marketing_opt_out, contact_preference").in("id", ids),
        supabase.from("communications").select("patient_id, sent_at").in("patient_id", ids).gte("sent_at", since).order("sent_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const lastContact = new Map<string, string>();
  for (const c of comms || []) if (c.sent_at && !lastContact.has(c.patient_id)) lastContact.set(c.patient_id, c.sent_at);
  const enriched = patients.map((p) => {
    const pref = prefs?.find((x) => x.id === p.id);
    return { ...p, optOut: Boolean(pref?.marketing_opt_out), contactPreference: pref?.contact_preference ?? null, lastContact: lastContact.get(p.id) ?? null };
  });

  return (
    <div>
      <PageHeader title="Marketing" description="Segmentación y fidelización de pacientes" />

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={`/marketing?filter=${f.key}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
              filter === f.key ? "bg-[var(--oc-blue-700)] text-white border-[var(--oc-blue-700)]" : "bg-white text-[var(--oc-slate-700)] border-[var(--oc-slate-200)] hover:bg-[var(--oc-slate-100)]"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <Card className="p-5">
        <CampaignPanel patients={enriched} />
      </Card>
    </div>
  );
}
