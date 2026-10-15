"use client";

import { useActionState, useState } from "react";

type State = { error: string; ok?: boolean };

/**
 * Botón que, antes de ejecutar una acción delicada (anular, reversar, reabrir),
 * pide el motivo. La acción recibe el motivo en el campo "reason".
 */
export function ReasonAction({
  action,
  label,
  confirmLabel,
  description,
  tone = "red",
  small = false,
  children,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  label: string;
  confirmLabel?: string;
  description?: string;
  tone?: "red" | "blue";
  small?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { error: "" },
  );

  const color = tone === "red" ? "var(--oc-red)" : "var(--oc-blue-700)";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${small ? "text-xs" : "text-sm"} font-medium hover:underline print:hidden`}
        style={{ color }}
      >
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full rounded-lg border p-3 space-y-2 bg-white print:hidden" style={{ borderColor: color }}>
      {description && <p className="text-xs text-[var(--oc-slate-700)]">{description}</p>}
      {children}
      <textarea
        name="reason"
        required
        minLength={4}
        rows={2}
        autoFocus
        placeholder="Motivo (obligatorio, queda registrado)"
        className="w-full rounded-lg border border-[var(--oc-slate-200)] px-3 py-2 text-sm outline-none focus:border-[var(--oc-blue-500)]"
      />
      {state.error && <p className="text-xs text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded px-2 py-1">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--oc-slate-500)] hover:underline">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: color }}
        >
          {pending ? "Guardando…" : confirmLabel ?? label}
        </button>
      </div>
    </form>
  );
}
