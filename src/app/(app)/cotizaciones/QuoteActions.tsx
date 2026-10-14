"use client";

import { useTransition } from "react";
import { convertQuoteToSale, updateQuoteStatus } from "./actions";
import { ShoppingCart, X, Clock } from "lucide-react";

export function QuoteActions({ quoteId, status, hasPatient }: { quoteId: string; status: string; hasPatient: boolean }) {
  const [pending, startTransition] = useTransition();

  if (status !== "pendiente") return null;

  return (
    <div className="flex gap-1.5 justify-end">
      {hasPatient && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => convertQuoteToSale(quoteId))}
          title="Convertir en venta"
          className="h-8 w-8 rounded-lg bg-[var(--oc-green-bg)] text-[var(--oc-green)] flex items-center justify-center hover:bg-[var(--oc-green)] hover:text-white transition-colors disabled:opacity-50"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => startTransition(() => updateQuoteStatus(quoteId, "vencida"))}
        title="Marcar vencida"
        className="h-8 w-8 rounded-lg bg-[var(--oc-amber-bg)] text-[var(--oc-amber)] flex items-center justify-center hover:bg-[var(--oc-amber)] hover:text-white transition-colors disabled:opacity-50"
      >
        <Clock className="h-4 w-4" />
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => updateQuoteStatus(quoteId, "rechazada"))}
        title="Marcar rechazada"
        className="h-8 w-8 rounded-lg bg-[var(--oc-red-bg)] text-[var(--oc-red)] flex items-center justify-center hover:bg-[var(--oc-red)] hover:text-white transition-colors disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
