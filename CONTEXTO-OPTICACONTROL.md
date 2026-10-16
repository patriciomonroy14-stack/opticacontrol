# ÓpticaControl — Contexto del proyecto

> Archivo para retomar el trabajo en una conversación nueva con Claude.
> Súbelo al inicio y di qué quieres hacer. Última actualización: 15 de octubre de 2026 (etapa 2).

## Qué es

App web de gestión de **Óptica Retiro** (Chile): agenda, pacientes, cotizaciones, ventas y pedidos de lentes, armazones, cristales, marketing, reportes y caja diaria.

- **Dueña / administradora:** Yaritza (cuenta de administrador `admin@opticaretiro.cl`).
- **Encargada de la óptica:** Constanza (`constanzalarena18@gmail.com`), rol **Encargada**.
- Idioma de la app y de la conversación: **español de Chile**. Montos en pesos chilenos (CLP), fechas y horas en hora de Chile (`America/Santiago`).

## Dónde vive todo

| Pieza | Dónde |
|---|---|
| App publicada | https://opticacontrol.vercel.app |
| Código | GitHub `patriciomonroy14-stack/opticacontrol`, rama `main` |
| Publicación | Vercel, proyecto `opticacontrol` (equipo POWERFITNESSRETIRO, plan Hobby). **Cada push a `main` publica solo.** |
| Base de datos y login | Supabase, proyecto `opticacontrol`, id `bkwpqxhrjoxxklflvafy`, región sa-east-1 |

Tecnología: Next.js 16 (App Router, Turbopack, server actions), React 19, Tailwind 4, Supabase (`@supabase/ssr`), lucide-react. El repo trae `AGENTS.md`: esta versión de Next tiene cambios; revisar `node_modules/next/dist/docs/` antes de usar APIs nuevas.

## Roles y permisos

Reglas en un solo lugar: `src/lib/types.ts` → `canSeeFinance` (solo administrador), `isAdmin`, `canSell`, `canSeeSection(role, href)` (menú). Sesión y rol en el servidor: `getSession()` en `src/lib/session.ts`.

| Rol | Puede |
|---|---|
| `administrador` | Todo. Único que ve Panel, Caja, Reportes, Auditoría, Respaldo, Usuarios, costos y rentabilidad. Único que anula ventas, reversa pagos, anula gastos, reabre cajas, ajusta inventario, cambia precios/costos y aprueba descuentos sobre el tope. |
| `encargada` (Constanza) | Todo el trabajo diario: agenda, pacientes, cotizaciones, ventas, abonos, entregas, laboratorio (fechas), cuentas por cobrar, armazones, cristales, marketing, configuración. Sin información financiera. |
| `vendedor` | Agenda, pacientes, cotizaciones, ventas, abonos, entregas, cobranza, armazones, cristales. |
| `recepcionista` | Agenda, pacientes, cotizaciones, ventas, abonos, entregas, cobranza, marketing. |
| `solo_consulta` | Ver agenda, pacientes y órdenes. |

En la base: `cash_closings`, `cash_expenses` y `activity_log` solo los lee la administradora (RLS). `can_write()` incluye encargada, vendedor y recepcionista. Crear cuentas nuevas requiere hacerlo con SQL o desde Supabase (la app no tiene clave de servicio); el rol se cambia en Usuarios.

## Lo que se hizo el 14-oct-2026

1. **App caída:** el proyecto de Supabase estaba **pausado** (el plan gratis pausa tras unos 7 días sin uso). Se reactivó. *Si vuelve a pasar, reactivarlo en Supabase.*
2. **Usuario de Constanza** creado con el rol nuevo `encargada`.
3. **Publicación conectada a GitHub:** antes se subía a mano desde un computador; ahora el repo está conectado a Vercel.
4. **Agenda:**
   - Se escribe el nombre del paciente directamente; si no existe, se crea solo (`src/lib/patients.ts` → `findOrCreatePatient`).
   - Teléfono opcional.
5. **Pantalla de inicio:**
   - **Calendario mensual a pantalla completa**, con los días con pacientes en rojo.
   - Al tocar un día se abre el desglose de todos los horarios: ocupados con nombre, teléfono y WhatsApp; libres con "Dar hora" para agendar ahí mismo.
   - Archivo: `src/app/(app)/dashboard/AgendaCalendar.tsx`.
6. **Horario de atención:**
   - Lunes a viernes de 17:30 a 22:00; sábado y domingo de 10:00 a 16:00; **bloques de 15 minutos**.
   - Se guarda en `settings` (key `business_hours`: `lunes_viernes`, `sabado`, `domingo`, `slot_minutes`) y se edita en Configuración.
7. **Fechas en hora de Chile:** antes la app cambiaba de día a las 21:00 por usar UTC. Ayudantes: `todayCL()`, `chileDay()`, `formatTimeCL()`.
8. **Armazones:**
   - Formulario de nuevo armazón (16-oct): código, tipo (`frames.frame_type`: óptico, sol, niño…), marca, color, precio de venta y stock; costo opcional solo para administradora. Modelo, material, proveedor, foto y observaciones se editan en la ficha `/armazones/[id]`.
   - El precio de compra solo se consulta y muestra para el administrador.
9. **Ventas, abonos y caja diaria:**
   - **Nueva venta:** paciente por nombre, N° de orden de trabajo (automático `OT-####` con la secuencia `work_order_seq`), fecha del pedido, lente y cristales, total, abono inicial, saldo automático, medio de pago, entrega estimada y estado.
   - **Estados del pedido:** Pendiente (`venta_ingresada`), En fabricación, Listo para entregar, Entregado.
   - **Detalle de venta** (`/ventas/[id]`):
     - Historial de pagos y abonos parciales.
     - **Entrega con ✓**: registra fecha, hora y funcionario y permite cobrar el saldo.
     - Si se entrega con deuda, exige marcar una confirmación y escribir quién autorizó.
   - **Regla clave:** a la caja entra solo el dinero recibido ese día. Cada pago es una fila en `sale_payments` (`kind`: `inicial` / `abono` / `pago_final`). Un trigger recalcula `sales.amount_paid` y `payment_status`.
   - **Caja diaria** (`/caja`):
     - Ingresos del día por medio de pago y gastos (`cash_expenses`).
     - Efectivo esperado = apertura + efectivo recibido − gastos en efectivo.
     - Cierre con el efectivo contado y la diferencia. Hay un cierre por día (`cash_closings.closing_date` es único) y solo el administrador puede reabrirlo.
   - Probado: venta de $120.000 con abono de $50.000 → saldo $70.000, y a la caja entran $50.000.

## Lo que se hizo el 15-oct-2026 (etapa 2)

Decisiones de la usuaria: WhatsApp por botón que abre el chat con el mensaje escrito (no envío automático); armazón se **reserva al vender y se descuenta al entregar**; anulaciones/devoluciones/ajustes/descuentos sobre el tope **solo administradora**; formulario de armazones completo.

1. **Sin borrados financieros.** Anular venta (`voidSale`) = reversos negativos de sus pagos (`sale_payments.kind='reverso'`, `reversal_of`), libera o devuelve el armazón, pedido `cancelado`, `sales.voided_at/voided_by/void_reason`. Reversar un pago suelto: `reversePayment`. Gastos: `voided_at` + motivo. Caja: reabrir marca `reopened_at/reopen_reason` (no borra); re-cerrar actualiza y deja el cierre anterior en auditoría. Componente `ReasonAction` pide el motivo.
2. **Caja cerrada bloquea** pagos/abonos/reversos de ese día (`isCashClosed`).
3. **Descuento extraordinario:** tope en `settings.policies.max_discount_pct` (por defecto 10%, editable en Configuración); sobre el tope solo la administradora (`sales.discount_approved_by`).
4. **Inventario** (`src/lib/inventory.ts`): `frames.reserved`; disponible = stock − reservado; compare-and-swap para no vender dos veces la misma unidad; historial en `inventory_movements`. Ficha `/armazones/[id]` con ajustes/ingresos con motivo. Se desactivó el trigger `trg_decrement_frame_stock` (antes descontaba al vender). Al activar reservas se marcaron 4 armazones reservados de pedidos pendientes (stock no tocado: revisar conteo físico).
5. **Laboratorio** en `orders`: `lab_name, lab_order_ref, lab_sent_at, lab_promised_date, lab_received_at, lab_cost, lab_paid, lab_paid_at`. Fechas las registra cualquiera que venda (el estado avanza solo); costo y pago solo administradora; pagar crea un gasto `laboratorio` en caja ligado al pedido (`cash_expenses.order_id`). Alertas de atraso en `/ordenes`.
6. **Cuentas por cobrar** `/cobranza`: deuda, compromiso (`sales.payment_due_date`, o entrega estimada), días de atraso, abono rápido, recordatorio WhatsApp.
7. **WhatsApp** (`src/lib/whatsapp.ts`, `WhatsAppButton`): lentes listos (marca pedido como avisado), recordatorio de saldo, renovación, confirmar hora. Cada clic queda en `communications`. Campañas 12/24 meses en Marketing respetan `patients.marketing_opt_out`. Se eliminó el envío de correos "simulado" que no enviaba nada.
8. **Rentabilidad** (`src/lib/profit.ts`): venta − armazón (`sales.frame_cost`) − cristales (cobro real del laboratorio si existe; si no, costo de catálogo + filtros) − `sales.other_costs`. Solo administradora, separada de la caja.
9. **Panel administrativo** `/panel`: ventas día/semana/mes, recaudación, caja, deudas, gastos por tipo, rentabilidad y margen, pedidos, inventario, gráfico 12 meses (paleta validada #2a78d6 / #eb6834) + tabla.
10. **Auditoría** `/auditoria` y **Respaldo** `/respaldo` (JSON completo o CSV por tabla; ruta `/respaldo/descargar`). Solo administradora.
11. **Errores corregidos:** la base solo aceptaba `kind` inicial/abono/saldo (el código de ayer usaba `pago_final`, habría fallado al pagar el saldo completo) y no aceptaba montos negativos. Ahora: `kind` ∈ inicial, abono, saldo, pago_final, reverso; negativo solo si es reverso con `reversal_of`.

Probado en base (transacciones con rollback): ciclo abono → pago final → reverso; negativo sin reverso rechazado; permisos de Constanza (no ve caja/gastos/auditoría, sí vende). Fórmula de rentabilidad del código = cálculo SQL en todos los meses.

## Base de datos (lo principal)

Tablas en uso, en inglés: `profiles`, `patients`, `prescriptions`, `appointments`, `frames`, `lens_*`, `quotes`, `sales`, `sale_filters`, `sale_payments`, `orders`, `order_status_history`, `cash_closings`, `cash_expenses`, `settings`, `automation_rules`, `email_templates`, `campaigns`, `communications`, `activity_log`.

Columnas agregadas hoy:
- `sales`: `work_order_number` (único), `estimated_delivery`, `lens_description`.
- `orders`: `delivered_by`, `balance_at_delivery`, `delivery_authorized_by`, `delivery_note`.
- Tabla nueva `cash_expenses`.

Hay también tablas antiguas en español (`perfiles`, `pacientes`, `ventas`, `pagos`, `horarios_atencion`, etc.) que **la app no usa**. No confundirlas.

Triggers relevantes:
- Al crear una venta se crea su orden (`create_order_for_sale`) y se descuenta stock del armazón.
- `recalc_sale_paid` mantiene `amount_paid` y `payment_status` al día.

## Pendientes y cosas a tener en cuenta

- **Migraciones:** las pequeñas pasan (incluso `drop/add constraint`); las grandes, con varias cosas a la vez, o que crean funciones/triggers aparecen "cancelled" sin aviso a la usuaria. Aplicar de a poco.
- **No aplicado:** trigger en BD que impida pagar más que el saldo (control en la app: `getBalance`); mover `frames.purchase_price` a tabla solo-admin (hoy se oculta en la app, la encargada podría leerlo por API).
- **Costos antiguos incompletos:** ventas viejas sin costo de cristal → márgenes de 100%. Se completa con costos de catálogo y cobro de laboratorio.
- **Respaldo:** Supabase gratis no tiene copias diarias; descargar el respaldo semanalmente o pasar a Pro. Además se pausa tras ~7 días sin uso.
- **Gastos de caja solo los registra la administradora** (Constanza no ve caja). Si Constanza paga algo con efectivo de la caja, debe avisar para registrarlo.
- **Entrega con deuda:** basta confirmación + nombre de quien autoriza (no exige clave de la administradora).
- **Crear usuarios:** no hay pantalla (falta clave de servicio); se crean por SQL.
- **Lint antiguo** en `configuracion/cristales/page.tsx` y `marketing/page.tsx` (no afecta).
- Mensaje pendiente de la usuaria: escribió "++" y "+63" a medianoche (probablemente sin querer); se le preguntó.

## Cómo trabajar en una conversación nueva

1. Pedirle a Claude que agregue el repositorio `patriciomonroy14-stack/opticacontrol` y lo clone.
2. Hacer los cambios y compilar con:
   `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build`
3. Hacer commit y push a `main`. Vercel publica en uno o dos minutos.
4. Cambios de base de datos: con el conector de Supabase (proyecto `bkwpqxhrjoxxklflvafy`), en migraciones pequeñas y sin borrar datos.
