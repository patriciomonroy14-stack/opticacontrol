"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCLP } from "@/lib/types";

// Paleta validada (categórica, fondo claro): ventas = azul, recaudación = naranjo
const SERIES = [
  { key: "ventas", label: "Ventas", color: "#2a78d6" },
  { key: "recaudado", label: "Recaudado", color: "#eb6834" },
];

const compact = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} M` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)} mil` : String(v));

export function MonthChart({ data }: { data: { label: string; ventas: number; recaudado: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={56} />
          <Tooltip
            cursor={{ fill: "rgba(100,116,139,0.08)" }}
            formatter={(value, name) => [formatCLP(Number(value)), String(name)]}
            contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 13, color: "#0b1f3a" }}
            labelStyle={{ color: "#0b1f3a", fontWeight: 600 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#33455c" }} />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
