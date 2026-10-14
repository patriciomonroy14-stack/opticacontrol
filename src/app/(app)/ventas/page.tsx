import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, PrimaryButton, EmptyState } from "@/components/ui";
import { formatDateTime, formatCLP, PURCHASE_TYPE_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/types";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export default async function VentasPage() {
  const supabase = await createClient();
  const { data: sales } = await supabase
    .from("sales")
    .select("id, sale_date, total, purchase_type, payment_status, patients(id, full_name)")
    .order("sale_date", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Registro completo de ventas de Óptica Retiro"
        action={<PrimaryButton href="/ventas/nueva"><ShoppingCart className="h-4 w-4" /> Nueva venta</PrimaryButton>}
      />

      <Card>
        {!sales || sales.length === 0 ? (
          <EmptyState title="Aún no hay ventas registradas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--oc-slate-500)] border-b border-[var(--oc-slate-200)]">
                  <th className="py-3 px-5 font-medium">Fecha</th>
                  <th className="py-3 px-5 font-medium">Paciente</th>
                  <th className="py-3 px-5 font-medium">Tipo de compra</th>
                  <th className="py-3 px-5 font-medium">Total</th>
                  <th className="py-3 px-5 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s: any) => (
                  <tr key={s.id} className="border-b border-[var(--oc-slate-100)] last:border-0 hover:bg-[var(--oc-slate-100)]/50">
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{formatDateTime(s.sale_date)}</td>
                    <td className="py-3 px-5">
                      <Link href={`/pacientes/${s.patients?.id}?tab=compras`} className="font-medium text-[var(--oc-blue-800)] hover:underline">
                        {s.patients?.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-[var(--oc-slate-500)]">{PURCHASE_TYPE_LABELS[s.purchase_type as keyof typeof PURCHASE_TYPE_LABELS]}</td>
                    <td className="py-3 px-5 font-semibold text-[var(--oc-blue-950)]">{formatCLP(s.total)}</td>
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
    </div>
  );
}
