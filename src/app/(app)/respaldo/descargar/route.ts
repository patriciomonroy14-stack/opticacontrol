import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/types";

/** Tablas incluidas en el respaldo (las que usa la app). */
const BACKUP_TABLES = [
  "patients",
  "prescriptions",
  "appointments",
  "quotes",
  "sales",
  "sale_filters",
  "sale_payments",
  "orders",
  "order_status_history",
  "frames",
  "inventory_movements",
  "cash_expenses",
  "cash_closings",
  "lens_types",
  "lens_materials",
  "lens_colors",
  "lens_catalog_prices",
  "lens_filters",
  "lens_filter_colors",
  "lens_filter_prices",
  "communications",
  "settings",
  "profiles",
  "activity_log",
] as const;

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}

export async function GET(request: Request) {
  const { supabase, user, role } = await getSession();
  if (!user || !isAdmin(role)) return new NextResponse("No autorizado", { status: 403 });

  const url = new URL(request.url);
  const table = url.searchParams.get("tabla");
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

  const fetchAll = async (name: string) => {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(name).select("*").range(from, from + 999);
      if (error) throw new Error(`${name}: ${error.message}`);
      rows.push(...((data as Record<string, unknown>[]) || []));
      if (!data || data.length < 1000) break;
    }
    return rows;
  };

  try {
    if (table) {
      if (!(BACKUP_TABLES as readonly string[]).includes(table)) return new NextResponse("Tabla no válida", { status: 400 });
      const csv = toCsv(await fetchAll(table));
      await supabase.from("activity_log").insert({ user_id: user.id, action: "descargar_respaldo", entity_type: "backup", details: { tabla: table } });
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="opticacontrol-${table}-${stamp}.csv"` },
      });
    }

    const all: Record<string, unknown> = { generado: new Date().toISOString(), tablas: {} };
    for (const t of BACKUP_TABLES) (all.tablas as Record<string, unknown>)[t] = await fetchAll(t);
    await supabase.from("activity_log").insert({ user_id: user.id, action: "descargar_respaldo", entity_type: "backup", details: { tabla: "todas" } });
    return new NextResponse(JSON.stringify(all), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="opticacontrol-respaldo-${stamp}.json"` },
    });
  } catch (e) {
    return new NextResponse(`No se pudo generar el respaldo: ${(e as Error).message}`, { status: 500 });
  }
}
