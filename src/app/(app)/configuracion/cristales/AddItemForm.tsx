"use client";

import { useActionState } from "react";
import { inputCls } from "@/components/ui";
import { Plus } from "lucide-react";

export function AddItemForm({
  action,
  placeholder,
  buttonLabel,
}: {
  action: (prevState: { error: string }, formData: FormData) => Promise<{ error: string }>;
  placeholder: string;
  buttonLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex-1">
        <input name="name" required placeholder={placeholder} className={inputCls} />
      </div>
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--oc-blue-700)] text-white text-xs font-semibold px-3.5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60 shrink-0">
        <Plus className="h-3.5 w-3.5" /> {pending ? "Agregando…" : buttonLabel}
      </button>
      {state.error && <p className="text-xs text-[var(--oc-red)] absolute mt-12">{state.error}</p>}
    </form>
  );
}
