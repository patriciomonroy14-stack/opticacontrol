import { formatCLP, formatDate, whatsappLink } from "@/lib/types";

export type WhatsAppKind = "lentes_listos" | "recordatorio_saldo" | "renovacion" | "confirmar_hora";

export const WHATSAPP_KIND_LABELS: Record<WhatsAppKind, string> = {
  lentes_listos: "Lentes listos",
  recordatorio_saldo: "Recordatorio de saldo",
  renovacion: "Invitación a control / renovación",
  confirmar_hora: "Confirmación de hora",
};

/** Los mensajes de marketing respetan la preferencia del paciente; los de servicio (su pedido, su deuda) no. */
export const MARKETING_KINDS: WhatsAppKind[] = ["renovacion"];

const firstName = (name: string | null | undefined) => (name || "").trim().split(/\s+/)[0] || "";

export function buildMessage(
  kind: WhatsAppKind,
  data: { name?: string | null; order?: string | null; balance?: number | null; dueDate?: string | null; months?: number | null; date?: string | null; time?: string | null },
) {
  const hola = `Hola ${firstName(data.name)}`.trim();
  switch (kind) {
    case "lentes_listos":
      return `${hola}, le saludamos de Óptica Retiro. Sus lentes${data.order ? ` (orden ${data.order})` : ""} ya están listos para retirar.${
        data.balance && data.balance > 0 ? ` El saldo pendiente es de ${formatCLP(data.balance)}.` : ""
      } Le esperamos. ¡Gracias por preferirnos!`;
    case "recordatorio_saldo":
      return `${hola}, le saludamos de Óptica Retiro. Le recordamos que su pedido${data.order ? ` (orden ${data.order})` : ""} tiene un saldo pendiente de ${formatCLP(
        data.balance ?? 0,
      )}${data.dueDate ? `, con fecha de compromiso ${formatDate(data.dueDate)}` : ""}. Puede pagarlo en la óptica o por transferencia. Cualquier duda, estamos para ayudarle.`;
    case "renovacion":
      return `${hola}, le saludamos de Óptica Retiro. ${
        data.months ? `Han pasado ${data.months >= 24 ? "más de 2 años" : "más de un año"} desde su última compra. ` : ""
      }Le recomendamos un control visual para revisar su graduación. ¿Le agendamos una hora? Si no desea recibir estos mensajes, respóndanos "NO" y no le volveremos a escribir.`;
    case "confirmar_hora":
      return `${hola}, le saludamos de Óptica Retiro para confirmar su hora${data.date ? ` del ${formatDate(data.date)}` : ""}${data.time ? ` a las ${data.time}` : ""}. ¿Nos confirma su asistencia?`;
  }
}

/** Enlace que abre WhatsApp con el mensaje escrito (null si el teléfono no sirve). */
export function whatsappMessageLink(phone: string | null | undefined, message: string) {
  const base = whatsappLink(phone);
  return base ? `${base}?text=${encodeURIComponent(message)}` : null;
}
