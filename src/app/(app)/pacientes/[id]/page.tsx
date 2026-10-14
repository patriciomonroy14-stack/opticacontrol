import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Badge, PrimaryButton, SecondaryButton, EmptyState } from "@/components/ui";
import { formatCLP, formatDate, formatDateTime, PURCHASE_TYPE_LABELS, PAYMENT_STATUS_LABELS, APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { PrescriptionForm } from "./PrescriptionForm";
import { StatusToggle } from "./StatusToggle";
import { ScanLine, ShoppingCart, Mail, Phone, MapPin } from "lucide-react";

const TABS = [
  { key: "info", label: "Información personal" },
  { key: "historial", label: "Historial de atenciones" },
  { key: "recetas", label: "Recetas" },
  { key: "compras", label: "Historial de compras" },
  { key: "comunicaciones", label: "Comunicaciones" },
];

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "info" } = await searchParams;
  const supabase = await createClient();

  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (!patient) notFound();

  const [{ data: appointments }, { data: prescriptions }, { data: sales }, { data: communications }] = await Promise.all([
    supabase.from("appointments").select("*").eq("patient_id", id).order("appointment_date", { ascending: false }),
    supabase.from("prescriptions").select("*").eq("patient_id", id).order("date", { ascending: false }),
    supabase
      .from("sales")
      .select("*, frames(brand, model, code), lens_types(name), lens_materials(name), sale_filters(filter_name, color_name)")
      .eq("patient_id", id)
      .order("sale_date", { ascending: false }),
    supabase.from("communications").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title={patient.full_name}
        description={`${patient.rut || "Sin RUT"} · Paciente desde ${formatDate(patient.created_at)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone={patient.status === "activo" ? "green" : "slate"}>{patient.status}</Badge>
            <StatusToggle patientId={patient.id} status={patient.status} />
            <PrimaryButton href={`/ventas/nueva?paciente=${patient.id}`}><ShoppingCart className="h-4 w-4" /> Nueva venta</PrimaryButton>
          </div>
        }
      />

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--oc-slate-200)] mb-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/pacientes/${id}?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-[var(--oc-blue-700)] text-[var(--oc-blue-800)]" : "border-transparent text-[var(--oc-slate-500)] hover:text-[var(--oc-blue-800)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "info" && (
        <Card className="p-6 max-w-2xl">
          <dl className="grid sm:grid-cols-2 gap-5 text-sm">
            <div><dt className="text-[var(--oc-slate-500)] mb-1">Nombre completo</dt><dd className="font-medium text-[var(--oc-blue-950)]">{patient.full_name}</dd></div>
            <div><dt className="text-[var(--oc-slate-500)] mb-1">RUT</dt><dd className="font-medium text-[var(--oc-blue-950)]">{patient.rut || "—"}</dd></div>
            <div><dt className="text-[var(--oc-slate-500)] mb-1">Fecha de nacimiento</dt><dd className="font-medium text-[var(--oc-blue-950)]">{formatDate(patient.birth_date)}</dd></div>
            <div><dt className="text-[var(--oc-slate-500)] mb-1">Preferencia de contacto</dt><dd className="font-medium text-[var(--oc-blue-950)]">{patient.contact_preference || "—"}</dd></div>
            <div><dt className="text-[var(--oc-slate-500)] mb-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Teléfono</dt><dd className="font-medium text-[var(--oc-blue-950)]">{patient.phone || "—"}</dd></div>
            <div><dt className="text-[var(--oc-slate-500)] mb-1 flex items-center gap-1"><Mail className="h-3.5 w-3.5" />Correo</dt><dd className="font-medium text-[var(--oc-blue-950)]">{patient.email || "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[var(--oc-slate-500)] mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Dirección</dt><dd className="font-medium text-[var(--oc-blue-950)]">{patient.address || "—"} {patient.comuna ? `· ${patient.comuna}` : ""}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[var(--oc-slate-500)] mb-1">Observaciones</dt><dd className="text-[var(--oc-blue-950)]">{patient.notes || "Sin observaciones."}</dd></div>
          </dl>
        </Card>
      )}

      {tab === "historial" && (
        <Card>
          {!appointments || appointments.length === 0 ? (
            <EmptyState title="Sin atenciones registradas" description="Este paciente aún no tiene horas en su historial." />
          ) : (
            <ul className="divide-y divide-[var(--oc-slate-100)]">
              {appointments.map((a) => (
                <li key={a.id} className="p-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--oc-blue-950)]">{formatDate(a.appointment_date)} · {a.appointment_time?.slice(0, 5)}</p>
                    <p className="text-sm text-[var(--oc-slate-500)]">{a.reason || "Sin motivo"} · {a.professional || "Sin asignar"}</p>
                    {a.notes && <p className="text-sm text-[var(--oc-slate-500)] mt-1">{a.notes}</p>}
                  </div>
                  <Badge tone={a.status === "atendida" ? "green" : a.status === "cancelada" || a.status === "no_asistio" ? "red" : "blue"}>
                    {APPOINTMENT_STATUS_LABELS[a.status as keyof typeof APPOINTMENT_STATUS_LABELS]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "recetas" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display font-semibold text-[var(--oc-blue-950)] mb-4 flex items-center gap-2"><ScanLine className="h-4.5 w-4.5" /> Escanear / registrar receta</h2>
            <PrescriptionForm patientId={id} />
          </Card>

          <Card>
            {!prescriptions || prescriptions.length === 0 ? (
              <EmptyState title="Sin recetas registradas" />
            ) : (
              <ul className="divide-y divide-[var(--oc-slate-100)]">
                {prescriptions.map((r) => (
                  <li key={r.id} className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-[var(--oc-blue-950)]">{formatDate(r.date)} · {r.professional_name || "Sin profesional"}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm text-[var(--oc-slate-700)]">
                      <p>OD: {r.od_sphere ?? "—"} / {r.od_cylinder ?? "—"} x {r.od_axis ?? "—"} (Add {r.od_addition ?? "—"})</p>
                      <p>OI: {r.oi_sphere ?? "—"} / {r.oi_cylinder ?? "—"} x {r.oi_axis ?? "—"} (Add {r.oi_addition ?? "—"})</p>
                      <p>DP: {r.dp ?? "—"} mm</p>
                      <p>Altura: {r.height ?? "—"} mm</p>
                    </div>
                    {r.notes && <p className="text-sm text-[var(--oc-slate-500)] mt-2">{r.notes}</p>}
                    {r.attachment_url && <p className="text-xs text-[var(--oc-blue-700)] mt-2">Adjunto guardado ({r.attachment_type})</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "compras" && (
        <Card>
          {!sales || sales.length === 0 ? (
            <EmptyState title="Sin compras registradas" description="Este paciente aún no ha realizado compras." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                    <th className="py-3 px-5 font-medium">Fecha</th>
                    <th className="py-3 px-5 font-medium">Tipo</th>
                    <th className="py-3 px-5 font-medium">Armazón / Cristales</th>
                    <th className="py-3 px-5 font-medium">Total</th>
                    <th className="py-3 px-5 font-medium">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s: any) => (
                    <tr key={s.id} className="border-b border-[var(--oc-slate-100)] last:border-0">
                      <td className="py-3 px-5">{formatDate(s.sale_date)}</td>
                      <td className="py-3 px-5">
                        {PURCHASE_TYPE_LABELS[s.purchase_type as keyof typeof PURCHASE_TYPE_LABELS]}
                        {s.client_owns_frame && <span className="block text-xs text-[var(--oc-slate-500)]">Armazón del cliente</span>}
                      </td>
                      <td className="py-3 px-5 text-[var(--oc-slate-500)]">
                        {s.frames ? `${s.frames.brand} ${s.frames.model}` : "—"}{s.lens_types ? ` · ${s.lens_types.name}${s.lens_materials ? " " + s.lens_materials.name : ""}` : ""}
                        {s.sale_filters && s.sale_filters.length > 0 && (
                          <span className="block text-xs text-[var(--oc-blue-700)]">
                            {s.sale_filters.map((f: any) => f.color_name ? `${f.filter_name} (${f.color_name})` : f.filter_name).join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 font-medium text-[var(--oc-blue-950)]">{formatCLP(s.total)}</td>
                      <td className="py-3 px-5">
                        <Badge tone={s.payment_status === "pagado" ? "green" : s.payment_status === "abono" ? "amber" : "red"}>
                          {PAYMENT_STATUS_LABELS[s.payment_status as keyof typeof PAYMENT_STATUS_LABELS]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "comunicaciones" && (
        <Card>
          {!communications || communications.length === 0 ? (
            <EmptyState title="Sin comunicaciones registradas" description="Aún no se han enviado correos a este paciente." />
          ) : (
            <ul className="divide-y divide-[var(--oc-slate-100)]">
              {communications.map((c) => (
                <li key={c.id} className="p-5">
                  <p className="font-medium text-[var(--oc-blue-950)]">{c.subject}</p>
                  <p className="text-sm text-[var(--oc-slate-500)]">{formatDateTime(c.sent_at || c.created_at)} · {c.status}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
