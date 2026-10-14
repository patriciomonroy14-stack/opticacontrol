"use client";

import { useActionState } from "react";
import { Eye } from "lucide-react";
import { signInWithPassword } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInWithPassword, { error: "" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--oc-blue-50)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-[var(--oc-blue-700)] flex items-center justify-center mb-4">
            <Eye className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--oc-blue-950)]">Opticacontrol</h1>
          <p className="text-sm text-[var(--oc-slate-500)]">Óptica Retiro</p>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--oc-slate-200)] shadow-sm p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--oc-blue-950)] mb-1.5">Correo electrónico</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-[var(--oc-slate-200)] px-3 py-2.5 text-sm outline-none focus:border-[var(--oc-blue-500)] focus:ring-2 focus:ring-[var(--oc-blue-100)]"
                placeholder="nombre@opticaretiro.cl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--oc-blue-950)] mb-1.5">Contraseña</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-[var(--oc-slate-200)] px-3 py-2.5 text-sm outline-none focus:border-[var(--oc-blue-500)] focus:ring-2 focus:ring-[var(--oc-blue-100)]"
                placeholder="••••••••"
              />
            </div>

            {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--oc-blue-800)] transition-colors disabled:opacity-60"
            >
              {pending ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--oc-slate-500)] mt-6">
          Acceso exclusivo para el personal de Óptica Retiro.
        </p>
      </div>
    </div>
  );
}
