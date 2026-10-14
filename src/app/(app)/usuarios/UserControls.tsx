"use client";

import { useTransition } from "react";
import { updateUserRole, toggleUserActive } from "./actions";
import type { UserRole } from "@/lib/types";

export function RoleSelect({ userId, role }: { userId: string; role: UserRole }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      disabled={pending}
      value={role}
      onChange={(e) => startTransition(() => updateUserRole(userId, e.target.value as UserRole))}
      className="text-xs font-medium rounded-lg border border-[var(--oc-slate-200)] px-2.5 py-1.5 bg-white outline-none focus:border-[var(--oc-blue-500)] disabled:opacity-60"
    >
      <option value="administrador">Administrador</option>
      <option value="encargada">Encargada</option>
      <option value="recepcionista">Recepcionista</option>
      <option value="vendedor">Vendedor</option>
      <option value="solo_consulta">Solo consulta</option>
    </select>
  );
}

export function ActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleUserActive(userId, !active))}
      className={`text-xs font-medium px-2.5 py-1 rounded-full disabled:opacity-60 ${active ? "bg-[var(--oc-green-bg)] text-[var(--oc-green)]" : "bg-[var(--oc-slate-100)] text-[var(--oc-slate-500)]"}`}
    >
      {active ? "Activo" : "Inactivo"}
    </button>
  );
}
