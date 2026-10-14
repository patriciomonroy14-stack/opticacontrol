import { Search } from "lucide-react";
import { signOut } from "@/app/(app)/actions";

export function Topbar({ userName, role }: { userName: string; role: string }) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-[var(--oc-slate-200)] bg-white/90 backdrop-blur flex items-center gap-4 px-4 md:px-6">
      <form action="/pacientes" className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--oc-slate-500)]" />
          <input
            name="q"
            placeholder="Buscar paciente, RUT, código de armazón…"
            className="w-full rounded-full border border-[var(--oc-slate-200)] bg-[var(--oc-slate-100)] pl-9 pr-4 py-2 text-sm outline-none focus:border-[var(--oc-blue-500)] focus:bg-white transition-colors"
          />
        </div>
      </form>
      <div className="flex items-center gap-3 ml-auto">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-[var(--oc-blue-950)] leading-tight">{userName}</p>
          <p className="text-xs text-[var(--oc-slate-500)] leading-tight capitalize">{role}</p>
        </div>
        <div className="h-9 w-9 rounded-full bg-[var(--oc-blue-700)] text-white flex items-center justify-center text-sm font-semibold">
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <form action={signOut}>
          <button className="text-xs font-medium text-[var(--oc-slate-500)] hover:text-[var(--oc-blue-700)] transition-colors">
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
}
