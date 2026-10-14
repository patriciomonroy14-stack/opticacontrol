"use client";

import { useActionState, useState } from "react";
import { createFrame } from "./actions";
import { Field, inputCls } from "@/components/ui";
import { Plus, X } from "lucide-react";

/** Achica una foto a un máximo de 1600 px y la convierte a JPEG liviano. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 600_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function NewFrameForm({ showPurchasePrice }: { showPurchasePrice: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string; ok?: boolean }, formData: FormData) => {
      const result = await createFrame(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { error: "" },
  );

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--oc-blue-800)]">
        <Plus className="h-4 w-4" /> Nuevo armazón
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--oc-slate-200)] shadow-sm p-6 mb-6 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-[var(--oc-blue-950)]">Nuevo armazón</h2>
        <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg hover:bg-[var(--oc-slate-100)] flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Código *"><input name="code" required className={inputCls} placeholder="ARM-007" /></Field>
          <Field label="Marca"><input name="brand" className={inputCls} /></Field>
          <Field label="Material"><input name="material" className={inputCls} placeholder="Acetato, metal…" /></Field>
        </div>
        <div className={`grid gap-4 ${showPurchasePrice ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <Field label="Precio de venta"><input name="sale_price" type="number" min={0} className={inputCls} /></Field>
          <Field label="Stock"><input name="stock" type="number" min={0} defaultValue={1} className={inputCls} /></Field>
          {showPurchasePrice && (
            <Field label="Precio de compra (solo administrador)">
              <input name="purchase_price" type="number" min={0} className={inputCls} />
            </Field>
          )}
        </div>
        <Field label="Fotografía">
          <input
            name="photo"
            type="file"
            accept="image/*"
            className={`${inputCls} py-1.5`}
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              const small = await shrinkImage(file);
              if (small !== file) {
                const dt = new DataTransfer();
                dt.items.add(small);
                input.files = dt.files;
              }
            }}
          />
        </Field>
        <Field label="Observaciones (opcional)"><textarea name="notes" rows={2} className={inputCls} /></Field>

        {state.error && <p className="text-sm text-[var(--oc-red)] bg-[var(--oc-red-bg)] rounded-lg px-3 py-2">{state.error}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="rounded-full bg-[var(--oc-blue-700)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[var(--oc-blue-800)] disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar armazón"}
          </button>
        </div>
      </form>
    </div>
  );
}
