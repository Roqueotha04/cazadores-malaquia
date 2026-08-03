# Cazadores Malaquía

Venta online de entradas con selección de asiento para la **Cena de Cazadores
2026** (2 de octubre de 2026, 20:00). 730 asientos en 14 mesas largas. El
comprador elige su silla exacta en un plano del salón.

**Stack**: Next.js 16 (App Router) · React 19 · Tailwind v4 · Zod · Spring Boot
/ Kotlin (backend, repo separado) · Supabase/Postgres · Mercado Pago · Resend.

**Estado actual**: el frontend está completo (landing, flujo de compra, panel
admin, escáner de puerta). Mercado Pago y el envío de mail ya están integrados
contra el backend: `/pagar` devuelve el link de Checkout Pro y los mails con los
PDF salen solos del backend. **Nada está deployado todavía** — todo corre contra
el backend local. El backend Spring sigue en construcción.

> **Ojo con `.claude/PROYECTO.md`**: describe la arquitectura original
> (postgres.js directo, server actions que tocaban la DB). El repo ya migró a un
> backend Spring por HTTP. La fuente de verdad de la arquitectura actual es este
> archivo. `README.md` es el punto de arranque para levantar el proyecto, no la
> referencia de arquitectura.

---

## Mapa del repositorio

Directorio y qué hay adentro. Los archivos sueltos figuran solo cuando el nombre
no alcanza para saberlo.

```
app/
├── layout.tsx · fonts.ts       raíz: metadata, viewport, skip-link, las dos fuentes
├── globals.css                 TODO el sistema visual: @theme, utilities, print, a11y
├── error.tsx · not-found.tsx   boundaries globales
│
├── (landing)/    ── BRAND ──   hero, entradas, sobre nosotros, contacto
│
├── (flujo)/      ── PRODUCT ── el embudo, con barra de progreso en el layout
│   ├── comprar/                plano del salón → datos/ (nombre, DNI, email, celular)
│   ├── reserva/[token]/        estado de la reserva + contador + botón de pagar
│   ├── compra/resultado/       la vuelta del checkout de Mercado Pago
│   └── entradas/[token]/       entradas emitidas (post-pago)
│
└── admin/        ── PANEL ──   una sola cuenta compartida
    ├── login/ · salir/         `salir` es un route handler: borra la cookie
    └── (panel)/                tablero + ordenes/ ventas/ puerta/ evento/ casos/

components/
├── landing/    hero, navbar, footer, sobre-nosotros, contacto, formulario-contacto
├── compra/     mapa-salon, mesa, silla, formulario-datos, contador, boton-pagar,
│               resumen-seleccion, tarjeta-entrada, vuelta-del-checkout…
├── salon/      plano-salon (compartido landing/compra) + use-seleccion
├── admin/      shell/ (sidebar y header viven adentro de shell.tsx), ui/ (tabla,
│               buscador, campos), y una carpeta por pantalla del panel
└── ui/         boton, pasos, clases (primitivos compartidos)

lib/
├── api.ts            *** ÚNICO punto de contacto con el backend ***
├── consultas.ts      lecturas (encima de api.ts)
├── acciones/         server actions: compra, pago, orden, contacto
├── constantes.ts     COLCHON_PAGO_MS — ojo, ver "Acoples con el backend"
├── tipos.ts · validacion.ts · formato.ts · orden-guardada.ts
└── admin/            el mismo esqueleto para el panel —consultas, acciones,
    │                 tipos, validacion, fecha— más dos piezas propias:
    ├── api.ts        cliente con Authorization: Bearer y TIMEOUT_MAIL_MS
    └── sesion.ts     la cookie httpOnly del admin

proxy.ts     middleware de Next 16: chequeo de cookie en /admin/**
sql/         01_schema.sql (9 tablas, fuente canónica) + 02_seed.sql (730 asientos)
public/      hero.webp, sobre-nosotros.webp, equipo.webp, extra.webp, logo.png
.mcp.json    servidor MCP de Supabase (compartido; los permisos no)

Docs en la raíz: README.md · PRODUCT.md · LOGICA-BACKEND.md · AGENTS.md

.claude/
├── PROYECTO.md            spec original (⚠️ arquitectura vieja, ver nota arriba)
├── api-frontend.md        contrato API pública — lo que el front de venta espera
└── api-admin-frontend.md  contrato API admin — lo que el panel espera
```

**Lo que no viene al clonar** (está en `.gitignore`): `.claude/skills/`,
`.claude/agents/`, `.claude/settings.local.json` y `design/`. Los skills se
instalan aparte; no des por sentado que están.

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
| Tocar timeouts, `COLCHON_PAGO_MS` o cualquier cosa atada al backend | "Acoples con el backend", más abajo |
| Saber si un cambio quedó bien | "Cómo verificar un cambio", acá abajo |

---

## Cómo verificar un cambio

**No hay tests en este repo**: ni archivos `.test.*` ni runner en
`package.json`. No inventes que los corriste. Lo que hay:

```bash
npx tsc --noEmit    # typecheck — no hay script, va con npx
npm run lint
npm run build       # corre sin API_URL: ninguna pantalla de datos se prerenderiza
```

`npm run lint` tira ~132 warnings que **no son del proyecto**: salen de los
scripts de `.claude/skills/`, que son de terceros y ni siquiera están
versionados. El código propio da cero. Si aparece un warning fuera de `.claude/`,
ese sí es tuyo.

`npm run build` pasando **no significa que la pantalla funcione**: sin el backend
arriba compila igual y falla recién al abrirla. Para probar de verdad hace falta
`API_URL` apuntando a un backend vivo.

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
| Tablas y columnas SQL | `snake_case` | `reserva_asientos`, `precio_centavos` |

### Patrones

- **Montos en centavos** (`integer`). Formateados con `lib/formato.ts`.
- **Fechas como string ISO-8601** en el JSON. Convertidas a `Date` con
  `aFecha()` de `lib/api.ts` en el borde. Los componentes reciben `Date | null`.
- **UUID antes de red**: `esUuid()` en `lib/consultas.ts` corta tokens inválidos
  sin salir al backend. Es solo del front de venta, donde el token llega de una
  URL que escribió cualquiera. El panel no valida: entra por el buscador, con
  sesión, y un 404 del backend alcanza.
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

- **Nada de estética SaaS.** Ver anti-referencias en `PRODUCT.md`. Dos matices,
  porque el código los usa a propósito y no son violaciones:
  - **Blur**: solo en barras fijas que quedan sobre contenido que scrollea
    (navbar, barra del flujo, header del panel, barra de acción del mapa en
    celular). Nunca como decoración ni como "tarjeta de vidrio".
  - **Gradiente**: nunca como superficie de marca. Sí como textura (`veteada`,
    `rayada`) y como fade de una imagen contra el fondo (el pie del hero).
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

Los skills viven en `.claude/skills/` y **no están versionados** (igual que
`.claude/agents/`): se instalan aparte, así que en un clon limpio no están.
Son pesados — leerlos solo cuando la tarea lo requiere.

| Skill | Tamaño | Cuándo activarlo |
|---|---|---|
| `frontend-design` | 12 KB | Construir componentes nuevos o entender los patrones del proyecto (architecture, naming, server actions pattern) |
| `design-taste-frontend` | 88 KB | Crear o rediseñar una landing o página completa. Es el skill genérico de Estudio Ve, no específico de este proyecto |
| `impeccable` | 2.1 MB (SKILL.md son 19 KB) | Auditar, pulir o criticar UI existente. Tiene sub-comandos: `audit`, `polish`, `critique`, `shape`, etc. |
| `supabase` | 25 KB | Operar con la DB vía MCP (queries, schema) |
| `supabase-postgres-best-practices` | 164 KB | Patrones de Postgres: transacciones atómicas, `FOR UPDATE`, idempotencia |

**Agent disponible**: `impeccable-manual-edit-applier` — aplica edits puntuales
con precisión, sin improvisar.

---

## Acoples con el backend

Dos cosas de este repo están atadas a decisiones del backend **sin que nada las
verifique**. Las dos se rompen desde afuera del archivo que las documenta, así
que van acá y no en un comentario.

### El colchón de pago está escrito de los dos lados

`COLCHON_PAGO_MS` (`lib/constantes.ts`) existe porque el backend arma el link de
Mercado Pago con un minuto menos de vida que la orden. El front le descuenta ese
minuto a todo lo que muestra: el contador y el botón de pagar se apagan antes.

**Ese número no viaja en ninguna respuesta.** Vive dos veces: acá como
`COLCHON_PAGO_MS`, y en el backend como `mp.minutos-antes-del-vencimiento`. Si
cambia uno y no el otro, el comprador ve tiempo restante y un botón encendido, lo
aprieta, y le vuelve un **409 `OrdenExpirada`** justo cuando iba a pagar.
Contrato: `.claude/api-frontend.md`, en `POST /api/ordenes/{token}/pagar`.

### Los endpoints lentos piden 30 segundos

El default son 8 s (`TIMEOUT_MS` en `lib/api.ts`), que alcanza para lo que solo
toca la base. **Toda llamada que dispare un mail o hable con Mercado Pago tiene
que pasar `{ timeoutMs: 30_000 }`** — en el panel, `TIMEOUT_MAIL_MS` de
`lib/admin/api.ts`. Hoy son seis: `/pagar` y `/reconciliar` del front de venta, y
`reenviar-entradas`, `cambiar-butaca`, `POST /ventas` y `reubicar` del panel.

Si se olvida, el backend hace el trabajo bien pero el front corta a los 8 s y
muestra "no pudimos conectar": el admin reintenta y **el invitado recibe el mail
dos veces**. En local no se ve nunca, porque el mail sale en milisegundos.

---

## Invariantes

**Las garantiza el backend** (Postgres + Spring), no este repo: ninguna se puede
romper ni arreglar desde el frontend. Están acá porque explican por qué la API es
como es — no para implementarlas en TypeScript.

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

**Este es el roadmap del backend**, que vive en otro repo. Acá el frontend ya
está entero: sirve para saber contra qué se puede probar hoy y qué todavía no
existe del otro lado.

1. Schema con Flyway (backend)
2. Operaciones 5.1 (tomar asientos) y 5.2 (confirmar pago) + tests de
   concurrencia
3. Endpoints de lectura
4. Mercado Pago: preference, webhook, reconciliador
5. QR + mail de las entradas (Resend)
6. Endpoints del panel de admin y del escáner

**Del 1 al 4 tiene que estar antes de octubre. Nada de arquitectura en cuatro
capas ni dashboards antes de que el cobro funcione.**
