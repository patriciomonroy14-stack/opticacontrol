"use client";

import { useTransition } from "react";
import { advanceOrderStatus, markOrderContacted } from "./actions";
import { ORDER_STATUS_LABELS, ORDER_STATUS_SEQUENCE } from "@/lib/types";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();
  if (status === "entregado") return <span className="text-xs font-semibold text-[var(--oc-green)]">✓ Entregado</span>;
  // "Entregado" se marca desde el detalle de la venta, para cobrar el saldo
  const options: OrderStatus[] = ORDER_STATUS_SEQUENCE.filter((s) => s !== "entregado");
  if (!options.includes(status) && status !== "cancelado") options.unshift(status);

  return (
    <select
      disabled={pending}
      value={status}
      onChange={(e) => startTransition(() => advanceOrderStatus(orderId, e.target.value as OrderStatus))}
      className="text-xs font-medium rounded-lg border border-[var(--oc-slate-200)] px-2.5 py-1.5 bg-white outline-none focus:border-[var(--oc-blue-500)] disabled:opacity-60"
    >
      {options.concat("cancelado").map((s) => (
        <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}

export function ContactButton({ orderId, contacted }: { orderId: string; contacted: boolean }) {
  const [pending, startTransition] = useTransition();
  if (contacted) return <span className="text-xs text-[var(--oc-green)] font-medium">Contactado</span>;
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => markOrderContacted(orderId))}
      className="text-xs font-medium text-[var(--oc-blue-700)] hover:underline disabled:opacity-60"
    >
      {pending ? "Marcando…" : "Marcar contactado"}
    </button>
  );
}
