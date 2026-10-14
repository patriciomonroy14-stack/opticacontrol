import { LucideIcon } from "lucide-react";
import Link from "next/link";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[var(--oc-slate-200)] shadow-[0_1px_2px_rgba(15,36,64,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--oc-blue-950)]">{title}</h1>
        {description && <p className="text-sm text-[var(--oc-slate-500)] mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({
  children,
  href,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  className?: string;
}) {
  const cls = `inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-blue-800)] transition-colors shadow-sm ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} className={cls}>{children}</button>;
}

export function SecondaryButton({
  children,
  href,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  className?: string;
}) {
  const cls = `inline-flex items-center gap-2 rounded-full border border-[var(--oc-slate-200)] bg-white text-[var(--oc-blue-950)] text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-slate-100)] transition-colors ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} className={cls}>{children}</button>;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red";
  hint?: string;
}) {
  const toneMap: Record<string, string> = {
    blue: "bg-[var(--oc-blue-100)] text-[var(--oc-blue-700)]",
    green: "bg-[var(--oc-green-bg)] text-[var(--oc-green)]",
    amber: "bg-[var(--oc-amber-bg)] text-[var(--oc-amber)]",
    red: "bg-[var(--oc-red-bg)] text-[var(--oc-red)]",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--oc-slate-500)]">{label}</p>
          <p className="font-display text-2xl font-bold text-[var(--oc-blue-950)] mt-1 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-[var(--oc-slate-500)] mt-1">{hint}</p>}
        </div>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
        </div>
      </div>
    </Card>
  );
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "blue" | "green" | "amber" | "red" }) {
  const toneMap: Record<string, string> = {
    slate: "bg-[var(--oc-slate-100)] text-[var(--oc-slate-700)]",
    blue: "bg-[var(--oc-blue-100)] text-[var(--oc-blue-700)]",
    green: "bg-[var(--oc-green-bg)] text-[var(--oc-green)]",
    amber: "bg-[var(--oc-amber-bg)] text-[var(--oc-amber)]",
    red: "bg-[var(--oc-red-bg)] text-[var(--oc-red)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneMap[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-16 px-6">
      <p className="font-display font-semibold text-[var(--oc-blue-950)]">{title}</p>
      {description && <p className="text-sm text-[var(--oc-slate-500)] mt-1">{description}</p>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[var(--oc-blue-950)] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--oc-slate-500)] mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-[var(--oc-slate-200)] px-3 py-2 text-sm outline-none focus:border-[var(--oc-blue-500)] focus:ring-2 focus:ring-[var(--oc-blue-100)] transition-colors bg-white";
