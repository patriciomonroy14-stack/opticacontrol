"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import { Field, inputCls } from "@/components/ui";
import { formatCLP, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderStatus } from "@/lib/types";
import { addPayment, deliverOrder, setOrderStatus, updateEstimatedDelivery } from "../actions";

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
