# ÓpticaControl — Contexto del proyecto

> Archivo para retomar el trabajo en una conversación nueva con Claude.
> Súbelo al inicio y di qué quieres hacer. Última actualización: 14 de octubre de 2026.

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

| Rol | Puede |
|---|---|
| `administrador` | Todo. Único que ve el **precio de compra** de armazones, administra **Usuarios**, reabre cajas cerradas y borra gastos. |
| `encargada` (Constanza) | Todo el día a día: agenda, pacientes, cotizaciones, ventas, abonos, entregas, órdenes, armazones, cristales, marketing, configuración y catálogo de cristales. **No ve:** Reportes, Caja diaria, cierres de caja, gastos, tarjetas de dinero del inicio, precio de compra ni Usuarios. |
| `recepcionista`, `vendedor`, `solo_consulta` | Roles originales; no se usan hoy. |

- Ayudantes en código: `canSeeFinance(role)` (falso solo para encargada) e `isManager(role)` (administrador o encargada), en `src/lib/types.ts`.
- En la base de datos: `current_role_name()`, `is_staff()`, `can_write()` (incluye encargada) e `is_manager()`. Las políticas RLS de `cash_closings` y `cash_expenses` excluyen a la encargada.

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
   - Formulario con código, marca, material, precio de venta, stock, foto (se comprime en el navegador; límite de subida de 4 MB en `next.config.ts`) y observaciones.
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

- **Cambios grandes de base de datos se cancelan:** las migraciones grandes, las que borran algo (`DROP`) o las que crean triggers o funciones aparecieron como "cancelled" y no le llegó ningún aviso a la usuaria. Los cambios pequeños y aditivos sí pasan. Conviene aplicarlos por partes.
- **No quedaron aplicados por ese motivo:**
  - La regla en la base de datos que impide que un pago supere el saldo. Hoy ese control está **en la app** (`getBalance` en `src/app/(app)/ventas/actions.ts`).
  - Mover el precio de compra de armazones a una tabla aparte solo para el administrador. Hoy se oculta desde la app, pero sigue en `frames.purchase_price`.
- **Opción pendiente:** que solo la administradora pueda autorizar una entrega con deuda (por ejemplo, con clave). Hoy basta con marcar la confirmación y escribir el nombre de quien autoriza.
- **Mensaje cortado:** el pedido original de "Caja diaria" se cortó en el punto 3; se implementó lo estándar (ingresos por medio, gastos, cierre con cuadre). Si había más requisitos (punto 4 en adelante), pedirlos.
- **Supabase gratis se pausa** tras unos 7 días sin uso. Se ofreció crear una tarea que lo mantenga activo; no se hizo.
- **Conexiones de Claude:**
  - El conector de Vercel lista el proyecto, pero no tiene permiso para leerlo ni desplegar; se publica haciendo push a GitHub.
  - La app de Claude en GitHub está instalada solo para el repo `opticacontrol`.
- **Avisos de lint antiguos** en `configuracion/cristales/page.tsx` y `marketing/page.tsx` (no afectan la compilación).

## Cómo trabajar en una conversación nueva

1. Pedirle a Claude que agregue el repositorio `patriciomonroy14-stack/opticacontrol` y lo clone.
2. Hacer los cambios y compilar con:
   `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build`
3. Hacer commit y push a `main`. Vercel publica en uno o dos minutos.
4. Cambios de base de datos: con el conector de Supabase (proyecto `bkwpqxhrjoxxklflvafy`), en migraciones pequeñas y sin borrar datos.
