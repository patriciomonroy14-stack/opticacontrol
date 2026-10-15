"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import { Field, inputCls } from "@/components/ui";
import { formatCLP, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderStatus } from "@/lib/types";
import { addPayment, deliverOrder, setOrderStatus, updateEstimatedDelivery, updateOtherCosts, updatePaymentDueDate } from "../actions";
import { updateLabCost, updateLabInfo } from "../labActions";

const METHODS = ["efectivo", "transferencia", "debito", "credito"] as const;
const EDITABLE_STATUSES: OrderStatus[] = ["venta_ingresada", "en_fabricacion", "listo_para_entregar"];

function MethodSelect({ required }: { required?: boolean }) {
  return (
    <select name="method" defaultValue="" required={required} className={inputCls}>
      <option value="">Selecciona…</option>
      {METHODS.map((m) => (
        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
      ))}
    </select>
  );
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{message}</p>;
}

export function AddPaymentForm({ saleId, balance }: { saleId: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => {
      const result = await addPayment(saleId, prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { error: "" },
  );

  if (balance <= 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--oc-blue-700)] text-[var(--oc-blue-700)] text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-50)]"
      >
        <Plus className="h-4 w-4" /> Registrar abono
      </button>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-[var(--oc-blue-500)] bg-[var(--oc-blue-50)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--oc-blue-950)]">Nuevo abono · saldo {formatCLP(balance)}</p>
        <button type="button" onClick={() => setOpen(false)} className="h-7 w-7 rounded-lg hover:bg-white flex items-center justify-center" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Monto">
          <input name="amount" type="number" min={1} max={balance} required autoFocus className={inputCls} />
        </Field>
        <Field label="Medio de pago">
          <MethodSelect required />
        </Field>
      </div>
      <Field label="Nota (opcional)">
        <input name="notes" className={inputCls} />
      </Field>
      <ErrorBox message={state.error} />
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar abono"}
        </button>
      </div>
    </form>
  );
}

export function DeliverPanel({ saleId, balance }: { saleId: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(balance);
  const [allowBalance, setAllowBalance] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => {
      const result = await deliverOrder(saleId, prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { error: "" },
  );

  const remaining = Math.max(balance - (Number(amount) || 0), 0);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-green)] text-white text-sm font-semibold px-5 py-2.5 hover:opacity-90"
      >
        <CheckCircle2 className="h-5 w-5" /> Marcar como entregado
      </button>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border-2 border-[var(--oc-green)] bg-[var(--oc-green-bg)]/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[var(--oc-blue-950)]">Entrega de lentes ✓</p>
        <button type="button" onClick={() => setOpen(false)} className="h-7 w-7 rounded-lg hover:bg-white flex items-center justify-center" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-[var(--oc-slate-200)]">
        <span className="text-sm text-[var(--oc-slate-700)]">Saldo pendiente</span>
        <span className={`font-display font-bold tabular-nums ${balance > 0 ? "text-[var(--oc-amber)]" : "text-[var(--oc-green)]"}`}>{formatCLP(balance)}</span>
      </div>

      {balance > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Pago al retirar">
            <input
              name="final_amount"
              type="number"
              min={0}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Medio de pago">
            <MethodSelect required={Number(amount) > 0} />
          </Field>
        </div>
      )}

      {remaining > 0 && (
        <div className="rounded-lg border border-[var(--oc-amber)] bg-[var(--oc-amber-bg)] p-3 space-y-3">
          <p className="text-sm font-medium text-[var(--oc-amber)]">
            El cliente se lleva los lentes debiendo {formatCLP(remaining)}. La deuda quedará registrada y visible.
          </p>
          <label className="flex items-start gap-2 text-sm text-[var(--oc-blue-950)]">
            <input type="checkbox" name="allow_balance" checked={allowBalance} onChange={(e) => setAllowBalance(e.target.checked)} className="mt-0.5 rounded" />
            Confirmo que esta entrega con saldo pendiente está autorizada
          </label>
          {allowBalance && (
            <Field label="Autorizado por *">
              <input name="authorized_by" required className={inputCls} placeholder="Nombre de quien autoriza" />
            </Field>
          )}
        </div>
      )}

      <Field label="Observación (opcional)">
        <input name="note" className={inputCls} />
      </Field>

      <ErrorBox message={state.error} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || (remaining > 0 && !allowBalance)}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-green)] text-white text-sm font-semibold px-5 py-2.5 hover:opacity-90 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" /> {pending ? "Guardando…" : "Confirmar entrega"}
        </button>
      </div>
    </form>
  );
}

export function OrderStatusSelect({ saleId, status }: { saleId: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();
  const options = EDITABLE_STATUSES.includes(status) ? EDITABLE_STATUSES : [status, ...EDITABLE_STATUSES];
  return (
    <select
      disabled={pending}
      value={status}
      onChange={(e) => startTransition(() => setOrderStatus(saleId, e.target.value as OrderStatus))}
      className="text-sm font-medium rounded-lg border border-[var(--oc-slate-200)] px-3 py-2 bg-white outline-none focus:border-[var(--oc-blue-500)] disabled:opacity-60"
    >
      {options.map((s) => (
        <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}

export function EstimatedDeliveryInput({ saleId, value }: { saleId: string; value: string | null }) {
  const [pending, startTransition] = useTransition();
  return (
    <input
      type="date"
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        startTransition(() => updateEstimatedDelivery(saleId, v));
      }}
      className="text-sm rounded-lg border border-[var(--oc-slate-200)] px-3 py-2 bg-white outline-none focus:border-[var(--oc-blue-500)] disabled:opacity-60"
    />
  );
}

export function PaymentDueDateInput({ saleId, value }: { saleId: string; value: string | null }) {
  const [pending, startTransition] = useTransition();
  return (
    <input
      type="date"
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        startTransition(() => updatePaymentDueDate(saleId, v));
      }}
      className="text-sm rounded-lg border border-[var(--oc-slate-200)] px-3 py-2 bg-white outline-none focus:border-[var(--oc-blue-500)] disabled:opacity-60"
    />
  );
}

type LabValues = {
  lab_name: string | null;
  lab_order_ref: string | null;
  lab_sent_at: string | null;
  lab_promised_date: string | null;
  lab_received_at: string | null;
};

export function LabInfoForm({ saleId, values, disabled }: { saleId: string; values: LabValues; disabled?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => {
      const result = await updateLabInfo(saleId, prev, formData);
      setSaved(Boolean(result.ok));
      return result;
    },
    { error: "" },
  );
  return (
    <form action={formAction} onChange={() => setSaved(false)} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Laboratorio proveedor">
          <input name="lab_name" defaultValue={values.lab_name ?? ""} disabled={disabled} className={inputCls} placeholder="Nombre del laboratorio" />
        </Field>
        <Field label="N° de pedido en el laboratorio">
          <input name="lab_order_ref" defaultValue={values.lab_order_ref ?? ""} disabled={disabled} className={inputCls} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Fecha de envío">
          <input type="date" name="lab_sent_at" defaultValue={values.lab_sent_at ?? ""} disabled={disabled} className={inputCls} />
        </Field>
        <Field label="Fecha comprometida">
          <input type="date" name="lab_promised_date" defaultValue={values.lab_promised_date ?? ""} disabled={disabled} className={inputCls} />
        </Field>
        <Field label="Fecha de recepción">
          <input type="date" name="lab_received_at" defaultValue={values.lab_received_at ?? ""} disabled={disabled} className={inputCls} />
        </Field>
      </div>
      <ErrorBox message={state.error} />
      {!disabled && (
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs text-[var(--oc-green)]">Guardado ✓</span>}
          <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar seguimiento"}
          </button>
        </div>
      )}
      <p className="text-xs text-[var(--oc-slate-500)]">Al registrar el envío el pedido pasa a «En fabricación»; al registrar la recepción, a «Listo para entregar».</p>
    </form>
  );
}

export function LabCostForm({ saleId, labCost, labPaid, labPaidAt }: { saleId: string; labCost: number | null; labPaid: boolean; labPaidAt: string | null }) {
  const [paid, setPaid] = useState(labPaid);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => updateLabCost(saleId, prev, formData),
    { error: "" },
  );
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Costo cobrado por el laboratorio">
          <input name="lab_cost" type="number" min={0} defaultValue={labCost ?? ""} disabled={labPaid} className={inputCls} />
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-[var(--oc-blue-950)]">
            <input type="checkbox" name="lab_paid" checked={paid} disabled={labPaid} onChange={(e) => setPaid(e.target.checked)} className="rounded" />
            {labPaid ? `Pagado${labPaidAt ? ` el ${labPaidAt.split("-").reverse().join("-")}` : ""}` : "Ya fue pagado al laboratorio"}
          </label>
          {labPaid && <input type="hidden" name="lab_paid" value="on" />}
        </div>
      </div>
      {paid && !labPaid && (
        <div className="rounded-lg bg-[var(--oc-slate-100)] p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-[var(--oc-blue-950)]">
            <input type="checkbox" name="register_in_cash" defaultChecked className="rounded" />
            Registrar este pago como gasto en la caja de hoy
          </label>
          <select name="method" defaultValue="transferencia" className={inputCls}>
            {METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
      )}
      <ErrorBox message={state.error} />
      {!labPaid && (
        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar costo"}
          </button>
        </div>
      )}
      {labPaid && <p className="text-xs text-[var(--oc-slate-500)]">Para corregir un pago ya registrado, anula el gasto en la Caja diaria.</p>}
    </form>
  );
}

export function OtherCostsForm({ saleId, value }: { saleId: string; value: number }) {
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => updateOtherCosts(saleId, prev, formData),
    { error: "" },
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="w-32">
        <input name="other_costs" type="number" min={0} defaultValue={value} className={inputCls} aria-label="Otros costos directos" />
      </div>
      <input name="reason" className={`${inputCls} flex-1 min-w-[8rem]`} placeholder="Detalle (opcional)" />
      <button type="submit" disabled={pending} className="rounded-full border border-[var(--oc-blue-700)] text-[var(--oc-blue-700)] text-xs font-semibold px-3 py-2 disabled:opacity-60">
        {pending ? "…" : "Guardar"}
      </button>
      {state.error && <p className="w-full text-xs text-[var(--oc-red)]">{state.error}</p>}
    </form>
  );
}
