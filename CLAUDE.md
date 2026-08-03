# Cazadores Malaquía

Venta online de entradas con selección de asiento para la **Cena de Cazadores
2026** (2 de octubre de 2026, 20:00). 730 asientos en 14 mesas largas. El
comprador elige su silla exacta en un plano del salón.

**Stack**: Next.js 16 (App Router) · React 19 · Tailwind v4 · Zod · Spring Boot
/ Kotlin (backend, repo separado) · Supabase/Postgres · Mercado Pago · Resend.

**Estado actual**: el frontend está completo (landing, flujo de compra, panel
admin, escáner de puerta). El backend Spring está en construcción. Mercado Pago
y envío de mail pendientes.

> **Ojo con `.claude/PROYECTO.md`**: describe la arquitectura original
> (postgres.js directo, server actions que tocaban la DB). El repo ya migró a un
> backend Spring por HTTP. La fuente de verdad de la arquitectura actual es este
> archivo y `README.md`.

---

## Mapa del repositorio

```
app/
├── layout.tsx                    raíz: fonts, metadata, viewport, skip-link
├── fonts.ts                      Young Serif (display) + Archivo (sans)
├── globals.css                   TODO el sistema visual: @theme, utilities, print, a11y
├── error.tsx                     error boundary global
├── not-found.tsx                 404 global
│
├── (landing)/                    ─── LANDING (brand) ───
│   ├── layout.tsx                navbar + footer
│   └── page.tsx                  hero, entradas, sobre nosotros, contacto
│
├── (flujo)/                      ─── FLUJO DE COMPRA (product) ───
│   ├── layout.tsx                barra de progreso (pasos)
│   ├── compra/
│   │   └── resultado/page.tsx    vuelta del checkout de MP
│   ├── comprar/
│   │   ├── page.tsx              plano del salón + selección de sillas
│   │   ├── datos/page.tsx        formulario: nombre, DNI, email, celular
│   │   └── error.tsx             error boundary del flujo
│   ├── reserva/[token]/page.tsx  estado de la reserva + contador + botón pagar
│   └── entradas/[token]/page.tsx entradas emitidas (post-pago)
│
└── admin/                        ─── PANEL DE ADMIN ───
    ├── login/page.tsx            login (una sola cuenta compartida)
    ├── salir/route.ts            borra cookie, redirect a login
    └── (panel)/
        ├── layout.tsx            shell del panel (sidebar + header)
        ├── page.tsx              tablero / resumen
        ├── ordenes/
        │   ├── page.tsx          listado de órdenes (búsqueda por DNI/email)
        │   └── [token]/page.tsx  detalle de una orden
        ├── ventas/
        │   ├── page.tsx          historial de ventas manuales
        │   └── nueva/page.tsx    cargar venta a mano (efectivo/transferencia)
        ├── puerta/
        │   ├── page.tsx          buscador para el escáner de puerta
        │   └── [codigo]/butaca/page.tsx  cambiar butaca de una entrada
        ├── evento/page.tsx       configurar evento (precio, fecha, abrir/cerrar)
        ├── casos/
        │   ├── page.tsx          cola de incidencias (pago tardío, sin butaca)
        │   └── [id]/page.tsx     detalle y resolución de un caso
        └── error.tsx             error boundary del panel

components/
├── landing/                      hero, navbar, footer, sobre-nosotros, contacto, entradas
├── compra/                       mapa-salon, mesa, silla, formulario-datos, contador,
│                                 boton-pagar, resumen-seleccion, tarjeta-entrada, etc.
├── salon/                        plano-salon (compartido landing/compra), use-seleccion
├── admin/
│   ├── shell/                    sidebar, header, badges, estado-venta
│   ├── ui/                       tabla, buscador, campos, piezas, refresco
│   ├── ordenes/                  formulario-correccion
│   ├── ventas/                   formulario-venta
│   ├── puerta/                   ficha-invitado, cambiar-butaca
│   ├── casos/                    acciones-caso
│   ├── evento/                   formulario-evento
│   └── formulario-login.tsx
└── ui/                           boton, pasos, clases (primitivos compartidos)

lib/
├── api.ts              *** ÚNICO punto de contacto con el backend ***
├── consultas.ts        lecturas (encima de api.ts): obtenerMapa, obtenerOrden, etc.
├── acciones/           server actions: compra.ts, pago.ts, orden.ts, contacto.ts
├── tipos.ts            tipos compartidos (Evento, Orden, Mesa, Asiento, Entrada…)
├── validacion.ts       schemas Zod (DNI, celular, email, compra)
├── constantes.ts       COLCHON_PAGO_MS (60s del checkout)
├── formato.ts          precio, fecha, "Mesa 13 · Silla 107"
├── orden-guardada.ts   token en localStorage para volver del checkout
└── admin/
    ├── api.ts          cliente HTTP del panel (con Authorization: Bearer)
    ├── consultas.ts    lecturas del panel
    ├── acciones/       server actions del admin (casos, evento, ordenes, puerta, ventas, sesion)
    ├── sesion.ts       cookie httpOnly del admin
    ├── tipos.ts        tipos del admin
    ├── validacion.ts   schemas del admin
    └── fecha.ts        formateo de fechas para el panel

proxy.ts                middleware de Next.js 16: chequeo de cookie en /admin/**
sql/01_schema.sql       las 9 tablas (fuente canónica del schema)
sql/02_seed.sql         evento + 14 mesas + 730 asientos
design/logo-original.png  logo de la armería (6 MB)
public/                 hero.webp, sobre-nosotros.webp, equipo.webp, logo.png

.claude/
├── PROYECTO.md              spec del proyecto (⚠️ arquitectura desactualizada, ver nota arriba)
├── api-frontend.md          contrato API pública (10 KB) — lo que el front de venta espera
├── api-admin-frontend.md    contrato API admin (17 KB) — lo que el panel espera
├── settings.local.json      permisos de Claude (Supabase MCP, web fetch)
├── agents/
│   └── impeccable-manual-edit-applier.md   agente para aplicar edits manuales con precisión
└── skills/                  ver sección "Skills" más abajo
```

---

## Arquitectura

```
Navegador ──→ Next.js (server components + server actions)
                 │
                 ├─ lecturas:  lib/consultas.ts → lib/api.ts → GET  backend
                 └─ escrituras: lib/acciones/*  → lib/api.ts → POST backend
                                                      │
                                               Spring Boot (API_URL)
                                                      │
                                               Supabase / Postgres
```

- **El navegador nunca habla con el backend ni con Supabase.** Todo pasa por el
  servidor de Next.js. No hay claves en el bundle del cliente.
- **`lib/api.ts` es el único `fetch`** al backend. Exporta `pedir` (lectura,
  lanza en error), `pedirOpcional` (devuelve null en 404), y `enviar`
  (escritura, nunca lanza — devuelve el error como valor para `useActionState`).
- **`connection()`** se llama en cada request para evitar prerenderizado (los
  datos cambian con cada compra).
- **Sin `API_URL`** en el entorno, el build corre pero las pantallas fallan al
  abrirlas. No hay datos de ejemplo.

### Flujo de compra

```
Landing → /comprar (plano, elegir sillas) → /comprar/datos (formulario)
→ POST /api/ordenes (reserva 30 min) → /reserva/{token} (contador + pagar)
→ Mercado Pago checkout → webhook confirma → /entradas/{token}
```

### Autenticación del admin

`proxy.ts` (middleware de Next.js 16) chequea la cookie optimistamente. La
seguridad real está en el backend: `lib/admin/api.ts` manda `Authorization:
Bearer` en cada llamada.

---

## Qué leer según la tarea

| Si vas a… | Leé primero |
|---|---|
| Entender el producto y sus restricciones de diseño | `PRODUCT.md` |
| Tocar el contrato de la API pública | `.claude/api-frontend.md` |
| Tocar el contrato de la API del admin | `.claude/api-admin-frontend.md` |
| Entender las operaciones críticas (concurrencia, pagos) | `LOGICA-BACKEND.md` |
| Ver el schema de la DB | `sql/01_schema.sql` |
| Cambiar cómo el frontend habla con el backend | `lib/api.ts` (único archivo) |
| Agregar una lectura nueva | `lib/consultas.ts` (público) o `lib/admin/consultas.ts` |
| Agregar una escritura nueva | `lib/acciones/` (público) o `lib/admin/acciones/` |
| Tocar el plano del salón | `components/salon/`, `components/compra/mapa-salon.tsx` |
| Cambiar colores, tipografía o utilities | `app/globals.css` |
| Usar Next.js 16 (tiene breaking changes) | `node_modules/next/dist/docs/` |
| Ver qué espera y devuelve cada tipo | `lib/tipos.ts` (público) o `lib/admin/tipos.ts` |

---

## Convenciones

### Idioma

**Todo en español**: nombres de variables, funciones, componentes, comentarios,
mensajes de error, texto de UI. Sin excepciones.

### Naming

| Qué | Convención | Ejemplo |
|---|---|---|
| Archivos | `kebab-case.tsx` | `mapa-salon.tsx` |
| Componentes | `PascalCase` | `MapaSalon` |
| Server actions | `camelCase` verbo | `crearReserva`, `cancelarOrden` |
| Tipos | `PascalCase` | `Evento`, `Orden`, `AsientoElegido` |
| CSS utilities | `kebab-case` español | `titulo-hero`, `dato`, `rayada` |
| Tablas SQL | `snake_case` | `reserva_asientos`, `perfil_cazador` |

### Patrones

- **Montos en centavos** (`integer`). Formateados con `lib/formato.ts`.
- **Fechas como string ISO-8601** en el JSON. Convertidas a `Date` con
  `aFecha()` de `lib/api.ts` en el borde. Los componentes reciben `Date | null`.
- **UUID antes de red**: `esUuid()` en `consultas.ts` corta tokens inválidos sin
  salir al backend.
- **`server-only`** importado en `lib/api.ts` — garantiza que no se filtre al
  bundle del cliente.
- **El comprador se identifica por DNI, no por email.** Un matrimonio compra con
  el mismo mail y dos DNI.
- **Las órdenes se acceden por `token` uuid**, nunca por id. Nadie puede leer la
  compra de otro cambiando un número en la URL.
- **"Mesa 13 · Silla 107"**, nunca "Asiento 107" ni "1 entrada".

### Server actions (patrón)

```typescript
"use server";
import { enviar } from "@/lib/api";
import { esquemaCompra } from "@/lib/validacion";

export async function crearReserva(_prev: unknown, formData: FormData) {
  const parsed = esquemaCompra.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "..." };
  return enviar("/api/ordenes", parsed.data);
}
```

Validar con Zod → llamar a `enviar` → devolver `Resultado<T>` (nunca lanzar).

### Contrato con el backend

- JSON en **camelCase** (`precioCentavos`, no `precio_centavos`).
- Errores: `{ status, error, mensaje, campos?, asientosOcupados? }`.
  `mensaje` se muestra tal cual al usuario. `error` nunca se muestra.
- Solo **GET y POST** (no hay PUT ni DELETE). Las acciones van por POST con el
  verbo en la ruta (`/cancelar`, `/pagar`).

---

## Sistema visual

**Referencia**: `app/globals.css` (catálogo de remates de campo: verde oscuro +
latón grabado + marfil). Colores en **OKLCH** para mover luminosidad sin
correrse de tono.

### Paleta resumida

| Token | Uso |
|---|---|
| `surface-sunken` / `surface` / `surface-raised` / `surface-high` | Rampa de superficies (verde hue 148, de más oscuro a más claro) |
| `brass` / `brass-light` | Acento único: acción principal, selección, foco |
| `ink` / `ink-soft` / `ink-faint` | Texto (13.4:1 / 8.7:1 / 5.2:1 de contraste) |
| `carbon` / `forest` / `ivory` | Identidad: los colores del logo de la armería |
| `silla-libre` / `silla-elegida` / `silla-tomada` | Estados de las butacas en el plano |
| `exito` / `alerta` / `error` | Semánticos |

### Tipografía

- **Young Serif** (`--font-display`): títulos. Un solo peso (400) — la jerarquía
  es por tamaño, nunca por `font-weight`.
- **Archivo** (`--font-sans`): interfaz, datos, cifras. Variable. Tiene cifras
  tabulares (`tabular-nums`).

### Utilities propias (`@utility`)

| Utility | Qué hace |
|---|---|
| `titulo-hero` | Display fluido para landing: `clamp(2.75rem, 7vw, 4.5rem)` |
| `titulo-seccion` | Títulos de sección fluidos |
| `dato` | Rótulo uppercase para datos duros ("Total", "Precio") |
| `tabular` | `font-variant-numeric: tabular-nums` |
| `rayada` | Rayas diagonales para sillas tomadas (accesibilidad daltónicos) |
| `entra` / `entra-2` / `entra-3` | Animación de entrada escalonada (hero) |
| `subrayado-vivo` | Link con subrayado de latón que crece al hover |
| `veteada` | Textura sutil de papel para paneles grandes |

### Reglas de diseño (no opcionales)

- **NO glassmorphism, NO gradients, NO estética SaaS.** Ver anti-referencias en
  `PRODUCT.md`.
- **Dos registros**: la landing es **brand** (personalidad), el flujo de compra
  es **product** (se corre del camino). Mismos tokens, distinta aplicación.
- **WCAG AA como piso**, 7:1 en texto de cuerpo donde se pueda. Targets de
  44×44px mínimo (crítico en el plano del celular).
- **El color nunca solo.** `rayada` para sillas tomadas, opacidad + anillo para
  elegidas. Con daltonismo rojo-verde siguen siendo tres estados distintos.
- **`prefers-reduced-motion` obligatorio** en toda animación.
- **Print styles**: el sitio se invierte a negro sobre blanco para imprimir
  entradas. `.no-imprimir` oculta lo que no tiene sentido en papel.

---

## Skills

Los skills están en `.claude/skills/`. Son pesados — leerlos solo cuando la
tarea lo requiere.

| Skill | Tamaño | Cuándo activarlo |
|---|---|---|
| `frontend-design` | 10 KB | Construir componentes nuevos o entender los patrones del proyecto (architecture, naming, server actions pattern) |
| `design-taste-frontend` | 88 KB | Crear o rediseñar una landing o página completa. Es el skill genérico de Estudio Ve, no específico de este proyecto |
| `impeccable` | 19 KB + 27 refs + 26 scripts | Auditar, pulir o criticar UI existente. Tiene sub-comandos: `audit`, `polish`, `critique`, `shape`, etc. |
| `supabase` | skill | Operar con la DB vía MCP (queries, schema) |
| `supabase-postgres-best-practices` | skill | Patrones de Postgres: transacciones atómicas, `FOR UPDATE`, idempotencia |

**Agent disponible**: `impeccable-manual-edit-applier` — aplica edits puntuales
con precisión, sin improvisar.

---

## Invariantes

Estas son las reglas del sistema. **Si un cambio rompe alguna, es un bug de
severidad máxima aunque los tests pasen.**

1. **Un asiento no puede estar en dos reservas vigentes.** Un asiento `RESERVADO`
   pertenece a exactamente una reserva `ACTIVA`.
2. **Un asiento no puede tener dos entradas emitidas.** Garantizado por índice
   único.
3. **El monto lo calcula el servidor**, siempre, desde `evento.precio_centavos`.
   Nunca llega del cliente.
4. **Confirmar un pago es idempotente.** Llamarlo N veces produce el mismo
   resultado que llamarlo una vez.
5. **Una reserva vencida no se puede pagar**, y sus asientos vuelven a estar
   disponibles.
6. **Nada se accede por id desde afuera**, solo por token o código uuid.
7. **Todo cambio de estado con plata de por medio deja una fila en `historial`.**
8. **Toda operación multi-paso es atómica.** O queda completa, o no pasó nada.

### Reglas de Next.js 16

Esta versión tiene breaking changes respecto de lo conocido. **Antes de escribir
código, leer la guía relevante en `node_modules/next/dist/docs/`.** Prestar
atención a los deprecation notices.

- El middleware se llama **Proxy** (`proxy.ts` en la raíz, no `middleware.ts`).
- `connection()` de `next/server` reemplaza el viejo opt-out de prerenderizado.
- `unstable_rethrow` para no atrapar errores internos de Next en los catch.

---

## Prioridades

El evento es el **2 de octubre de 2026**. La fecha manda sobre todo lo demás.

1. Schema con Flyway (backend)
2. Operaciones 5.1 (tomar asientos) y 5.2 (confirmar pago) + tests de
   concurrencia
3. Endpoints de lectura → el frontend actual ya funciona con pago simulado
4. Mercado Pago: preference, webhook, reconciliador
5. QR + mail de las entradas (Resend)
6. Panel de admin y escáner (frontend ya hecho, falta backend)

**Del 1 al 4 tiene que estar antes de octubre. Nada de arquitectura en cuatro
capas ni dashboards antes de que el cobro funcione.**
