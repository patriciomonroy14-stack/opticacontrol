export type UserRole = "administrador" | "encargada" | "recepcionista" | "vendedor" | "solo_consulta";
export type PatientStatus = "activo" | "inactivo";
export type AppointmentStatus = "reservada" | "confirmada" | "atendida" | "cancelada" | "no_asistio";
export type PurchaseType = "armazon_cristales" | "solo_cristales" | "solo_armazon" | "accesorios" | "otro";
export type PaymentMethod = "efectivo" | "debito" | "credito" | "transferencia" | "otro";
export type PaymentStatus = "pagado" | "abono" | "pendiente";
export type OrderStatus =
  | "venta_ingresada"
  | "receta_revisada"
  | "enviado_laboratorio"
  | "en_fabricacion"
  | "recibido_en_optica"
  | "control_calidad"
  | "listo_para_entregar"
  | "entregado"
  | "cancelado";
export type FrameStatus = "disponible" | "reservado" | "vendido" | "baja";
export type FocalType = "monofocal" | "bifocal" | "progresivo";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  venta_ingresada: "Venta ingresada",
  receta_revisada: "Receta revisada",
  enviado_laboratorio: "Enviado al laboratorio",
  en_fabricacion: "En fabricación",
  recibido_en_optica: "Recibido en óptica",
  control_calidad: "Control de calidad",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "venta_ingresada",
  "receta_revisada",
  "enviado_laboratorio",
  "en_fabricacion",
  "recibido_en_optica",
  "control_calidad",
  "listo_para_entregar",
  "entregado",
];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  reservada: "Reservada",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

export const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  armazon_cristales: "Armazón + cristales",
  solo_cristales: "Solo cristales",
  solo_armazon: "Solo armazón",
  accesorios: "Accesorios",
  otro: "Otro",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pagado: "Pagado",
  abono: "Abono",
  pendiente: "Pendiente",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: "Administrador",
  encargada: "Encargada",
  recepcionista: "Recepcionista",
  vendedor: "Vendedor",
  solo_consulta: "Solo consulta",
};

/** Puede ver montos agregados: reportes, ventas del día/mes, cierres de caja. */
export function canSeeFinance(role: string | null | undefined) {
  return role !== "encargada";
}

/** Puede administrar configuración y catálogo de cristales. */
export function isManager(role: string | null | undefined) {
  return role === "administrador" || role === "encargada";
}

export interface Patient {
  id: string;
  full_name: string;
  rut: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  comuna: string | null;
  contact_preference: string | null;
  status: PatientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  date: string;
  professional_name: string | null;
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_addition: number | null;
  oi_sphere: number | null;
  oi_cylinder: number | null;
  oi_axis: number | null;
  oi_addition: number | null;
  dp: number | null;
  height: number | null;
  notes: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  professional: string | null;
  reason: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface Frame {
  id: string;
  code: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  material: string | null;
  shape: string | null;
  gender: string | null;
  size: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  stock: number;
  supplier: string | null;
  photo_url: string | null;
  status: FrameStatus;
  location: string | null;
  notes: string | null;
}

export interface Lens {
  id: string;
  code: string | null;
  lens_type: string | null;
  material: string | null;
  lens_index: number | null;
  focal_type: FocalType | null;
  photochromic: boolean;
  antireflective: boolean;
  treatments: string[] | null;
  price: number | null;
  supplier: string | null;
  stock: number | null;
}

export interface Sale {
  id: string;
  patient_id: string;
  sale_date: string;
  seller_id: string | null;
  prescription_id: string | null;
  frame_id: string | null;
  lens_id: string | null;
  purchase_type: PurchaseType;
  client_owns_frame: boolean;
  accessories: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  amount_paid: number;
  notes: string | null;
}

export interface OrderRow {
  id: string;
  sale_id: string;
  status: OrderStatus;
  arrived_at: string | null;
  delivered_at: string | null;
  contacted: boolean;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fecha de hoy (YYYY-MM-DD) en hora de Chile. */
export function todayCL(offsetDays = 0) {
  const base = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const d = new Date(base + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Link de WhatsApp para un teléfono chileno, o null si no se puede armar. */
export function whatsappLink(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = "56" + digits;
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

export function formatCLP(value: number | null | undefined) {
  if (value == null) return "$0";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
