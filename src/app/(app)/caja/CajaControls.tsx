"use client";

import { useActionState, useState } from "react";
import { Lock, Printer } from "lucide-react";
import { Field, inputCls } from "@/components/ui";
import { formatCLP, PAYMENT_METHOD_LABELS, EXPENSE_CATEGORY_LABELS } from "@/lib/types";
import { addExpense, closeDay } from "./actions";

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{message}</p>;
}

export function ExpenseForm({ date }: { date: string }) {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => {
      const result = await addExpense(prev, formData);
      if (result.ok) setFormKey((k) => k + 1);
      return result;
    },
    { error: "" },
  );

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <input type="hidden" name="expense_date" value={date} />
      <Field label="Descripción">
        <input name="description" required className={inputCls} placeholder="Ej: Insumos de limpieza, pago a proveedor…" />
      </Field>
      <Field label="Tipo de gasto">
        <select name="category" defaultValue="general" className={inputCls}>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto">
          <input name="amount" type="number" min={1} required className={inputCls} />
        </Field>
        <Field label="Pagado con">
          <select name="method" defaultValue="efectivo" className={inputCls}>
            {(["efectivo", "transferencia", "debito", "credito"] as const).map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </Field>
      </div>
      <ErrorBox message={state.error} />
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
          {pending ? "Guardando…" : "Registrar gasto"}
        </button>
      </div>
    </form>
  );
}

export function CloseDayForm({
  date,
  cashIncome,
  cashExpenses,
  suggestedOpening,
}: {
  date: string;
  cashIncome: number;
  cashExpenses: number;
  suggestedOpening: number;
}) {
  const [opening, setOpening] = useState(suggestedOpening);
  const [counted, setCounted] = useState<string>("");
  const [state, formAction, pending] = useActionState(closeDay, { error: "" });

  const expected = (Number(opening) || 0) + cashIncome - cashExpenses;
  const difference = counted === "" ? null : Number(counted) - expected;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="closing_date" value={date} />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Efectivo al abrir la caja" hint="Monto con que partió el día (sencillo)">
          <input name="opening_amount" type="number" min={0} value={opening} onChange={(e) => setOpening(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Efectivo contado al cerrar *" hint="Cuenta los billetes y monedas de la caja">
          <input name="counted_cash" type="number" min={0} required value={counted} onChange={(e) => setCounted(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div className="rounded-xl bg-[var(--oc-slate-100)] p-4 space-y-1.5 text-sm tabular-nums">
        <div className="flex justify-between"><span>Efectivo al abrir</span><span>{formatCLP(Number(opening) || 0)}</span></div>
        <div className="flex justify-between"><span>+ Ingresos en efectivo</span><span className="text-[var(--oc-green)]">{formatCLP(cashIncome)}</span></div>
        <div className="flex justify-between"><span>− Gastos en efectivo</span><span className="text-[var(--oc-red)]">{formatCLP(cashExpenses)}</span></div>
        <div className="flex justify-between border-t border-[var(--oc-slate-200)] pt-1.5 font-semibold text-[var(--oc-blue-950)]">
          <span>Efectivo que debería haber</span><span>{formatCLP(expected)}</span>
        </div>
        {difference !== null && (
          <div
            className={`flex justify-between rounded-lg px-3 py-2 mt-2 font-semibold ${
              difference === 0
                ? "bg-[var(--oc-green-bg)] text-[var(--oc-green)]"
                : "bg-[var(--oc-red-bg)] text-[var(--oc-red)]"
            }`}
          >
            <span>{difference === 0 ? "✓ La caja cuadra" : difference > 0 ? "Sobra dinero" : "Falta dinero"}</span>
            <span>{difference === 0 ? "" : formatCLP(Math.abs(difference))}</span>
          </div>
        )}
      </div>

      <Field label="Observaciones del cierre (opcional)">
        <textarea name="notes" rows={2} className={inputCls} placeholder={difference ? "Explica la diferencia, si la sabes" : ""} />
      </Field>

      <ErrorBox message={state.error} />

      <div className="flex justify-end">
        <button type="submit" disabled={pending || counted === ""} className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-800)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-900)] disabled:opacity-50">
          <Lock className="h-4 w-4" /> {pending ? "Cerrando…" : "Cerrar caja del día"}
        </button>
      </div>
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--oc-slate-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--oc-slate-700)] hover:bg-[var(--oc-slate-100)] print:hidden">
      <Printer className="h-4 w-4" /> Imprimir
    </button>
  );
}
