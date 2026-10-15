"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ShoppingCart,
  PackageCheck,
  Glasses,
  Sparkles,
  FileText,
  Megaphone,
  BarChart3,
  UserCog,
  Settings,
  Eye,
  Wallet,
  HandCoins,
} from "lucide-react";
import { canSeeSection } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/ordenes", label: "Órdenes", icon: PackageCheck },
  { href: "/cobranza", label: "Cuentas por cobrar", icon: HandCoins },
  { href: "/caja", label: "Caja diaria", icon: Wallet },
  { href: "/armazones", label: "Armazones", icon: Glasses },
  { href: "/cristales", label: "Cristales", icon: Sparkles },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

function navFor(role: string) {
  return NAV.filter((item) => canSeeSection(role, item.href));
}

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-[var(--oc-slate-200)] bg-white">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-[var(--oc-slate-200)]">
        <div className="h-8 w-8 rounded-lg bg-[var(--oc-blue-700)] flex items-center justify-center shrink-0">
          <Eye className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <p className="font-display font-bold text-[15px] text-[var(--oc-blue-950)]">Opticacontrol</p>
          <p className="text-[11px] text-[var(--oc-slate-500)]">Óptica Retiro</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navFor(role).map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--oc-blue-100)] text-[var(--oc-blue-800)]"
                  : "text-[var(--oc-slate-700)] hover:bg-[var(--oc-slate-100)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navFor(role).slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[var(--oc-slate-200)] flex justify-around z-30">
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2 px-2 text-[10px] font-medium ${
              active ? "text-[var(--oc-blue-700)]" : "text-[var(--oc-slate-500)]"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
