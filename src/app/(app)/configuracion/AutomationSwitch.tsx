"use client";

import { useTransition } from "react";
import { toggleAutomation } from "./actions";

export function AutomationSwitch({ id, enabled }: { id: string; enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleAutomation(id, !enabled))}
      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 ${enabled ? "bg-[var(--oc-blue-700)]" : "bg-[var(--oc-slate-300)]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
