# Cazadores Malaquía — Venta de entradas

Web del evento anual de cazadores. Landing del negocio + venta online de entradas con
selección de asiento.

**Datos del evento**

```
Cena de Cazadores 2026 · 2 de octubre de 2026, 20:00
730 asientos · 14 mesas largas (mesas 1-2: 53 sillas · mesas 3-14: 52)
Mesas 1-7 fila de arriba · mesas 8-14 fila de abajo
Escenario arriba · entrada entre las dos filas · baños a los costados del escenario
Precio: $150.000 ARS por asiento
Máximo por compra: 10 asientos
Volumen esperado: ~700 compradores a lo largo de un mes
```

**Stack**: Next.js 16 (App Router) · Supabase/Postgres · postgres.js · Tailwind v4 · Zod
· Mercado Pago (etapa 2) · Resend (etapa 3). Deploy en Vercel.

**Regla de acceso a datos**: el navegador nunca habla con Supabase. Todo pasa por server
actions y route handlers. No hay claves de Supabase en el bundle.

---

## Etapas

Se construye frontend y backend a la vez, en tres tandas. Cada una queda funcionando antes
de empezar la siguiente.

| Etapa | Qué incluye | Cómo se prueba |
|---|---|---|
| **1 · Flujo completo** | Landing, plano de asientos, selección, formulario, reserva, **pago simulado**, confirmación, listado de entradas sin QR | Se compra de punta a punta en local con un botón "simular pago aprobado" |
| **2 · Mercado Pago** | Preference, redirección al checkout, webhook que confirma el pago, páginas de retorno | Compra real con credenciales `TEST-` y tarjetas de prueba |
| **3 · Entrega** | QR por entrada, mail con las entradas, página pública de entradas | Llega el mail y el QR se escanea |

El pago simulado de la etapa 1 no es descartable: es la misma función que va a llamar el
webhook de Mercado Pago en la etapa 2. Sólo cambia quién la dispara.

---

## Base de datos

Nueve tablas. Todo en `snake_case`, montos en centavos como enteros.

### `evento` — una sola fila

`id` (siempre 1) · `nombre` · `fecha` · `lugar` · `precio_centavos` ·
`max_asientos_por_compra` · `minutos_reserva` · `ventas_abiertas`

El precio y el tope viven acá y no en el código, para que el frontend y el backend lean el
mismo número. `ventas_abiertas` es el interruptor para abrir y cerrar la venta sin deploy.

### `mesas`

`id` · `numero` (1-14) · `fila` (`ARRIBA` / `ABAJO`) · `orden` (1-7) · `capacidad`

La distribución del salón es un dato, no está escrita en el código del plano.

### `asientos`

`id` · `mesa_id` · `numero` (1-730, global) · `posicion` (1-53, la silla dentro de la mesa)
· `lado` (`IZQUIERDA` / `DERECHA`) · `estado` (`DISPONIBLE` / `RESERVADO` / `VENDIDO`)

Al comprador se le muestra **"Mesa 13 · Silla 6"**, nunca "Asiento 654".

### `usuarios`

`id` · `dni` (único) · `nombre` · `apellido` · `email` · `celular` · `creado_el`

La identidad es el DNI, no el email: un matrimonio compra con el mismo mail y dos DNI. Si
un cliente vuelve a comprar se actualizan sus datos, no se crea otro.

### `reservas`

`id` · `usuario_id` · `estado` (`ACTIVA` / `PAGADA` / `EXPIRADA` / `CANCELADA`) ·
`token` (uuid) · `creado_el` · `expira_en` · `pagado_el`

El `token` es el uuid con el que el comprador vuelve a ver su compra. Nunca se accede por
id, para que nadie lea los datos de otro cambiando un número en la URL.

### `reserva_asientos`

`reserva_id` · `asiento_id` — clave primaria compuesta.

### `pagos`

`id` · `reserva_id` (único) · `monto_centavos` · `estado` (`PENDIENTE` / `APROBADO` /
`RECHAZADO`) · `mp_preference_id` · `mp_payment_id` (único) · `creado_el` · `aprobado_el`

Las columnas `mp_*` quedan vacías en la etapa 1. `mp_payment_id` es único para que el
webhook no pueda procesar el mismo pago dos veces cuando Mercado Pago reintente.

### `entradas`

`id` · `reserva_id` · `asiento_id` · `codigo` (uuid) · `creado_el` · `usado_el`

Se emiten cuando el pago queda aprobado, una por asiento. El `codigo` es lo que va en el QR.

### `historial`

`id` · `entidad` · `entidad_id` · `tipo` · `datos` (jsonb) · `creado_el`

Sólo se inserta, nunca se modifica. Una línea por evento importante: reserva creada, pago
aprobado, reserva expirada. Con plata de por medio y sin cuentas de usuario, es lo único
que responde un "yo pagué" tres semanas después.

---

## Flujo de compra

```
1. El comprador entra a la landing y hace clic en "Comprar entradas"
2. Elige hasta 10 asientos en el plano
3. Carga nombre, apellido, DNI, email y celular
4. Confirma  →  se crea el usuario, la reserva y el pago pendiente
                los asientos pasan a RESERVADO por 30 minutos
5. Paga      →  etapa 1: botón "simular pago aprobado"
                etapa 2: redirección a Mercado Pago
6. Se confirma el pago  →  asientos a VENDIDO, entradas emitidas
7. Ve sus entradas en /entradas/<token>
```

**Los asientos se toman con una sola consulta condicional**, dentro de una transacción:

```sql
update asientos set estado = 'RESERVADO'
 where id = any($1) and estado = 'DISPONIBLE'
```

Si la cantidad de filas actualizadas no coincide con las pedidas, se cancela toda la
transacción y se le avisa al comprador qué asientos se le adelantaron. Con esto alcanza:
no hacen falta bloqueos explícitos para el volumen de este evento.

**Las reservas vencidas se liberan sin cron**: cada vez que alguien abre el plano o crea una
reserva, se ejecuta antes un `update` que libera lo vencido. Es una consulta y no depende de
ningún proceso externo.

---

## Backend

### Escrituras · `lib/acciones/`

Tres server actions. Ninguna deja escapar un error de Postgres al navegador.

| Archivo | Función | Qué hace |
|---|---|---|
| `compra.ts` | `enviarCompra(previo, formData)` | Acción del formulario. Valida con Zod, crea usuario + reserva + pago pendiente, toma las sillas y manda a `/reserva/[token]`. Si algo falla devuelve el error por campo |
| `compra.ts` | `cancelarReserva(token)` | El comprador abandona: se liberan las sillas |
| `pago.ts` | `confirmarPago(token)` | Sillas a VENDIDO, reserva a PAGADA, pago a APROBADO, emite una entrada por silla. Es idempotente |

`confirmarPago` es el punto donde después entra el cobro: hoy la llama el botón, mañana
la va a llamar el proveedor de pagos. La función no cambia.

### Lecturas · `lib/consultas.ts`

`obtenerEvento` · `obtenerMapa` · `obtenerReservaPorToken` · `obtenerEntradasPorToken` ·
`obtenerAsientosElegidos` · `contarDisponibles` · `liberarReservasVencidas`.

### Archivos

```
sql/
├── 01_schema.sql         las 9 tablas
└── 02_seed.sql           evento + 14 mesas + 730 asientos

lib/
├── db.ts                 conexión a Postgres, marcada server-only
├── consultas.ts          las lecturas
├── validacion.ts         schemas Zod, los usa el formulario y el servidor
├── formato.ts            precio, fecha, contador, "Mesa 13 · Silla 6"
├── tipos.ts              tipos compartidos con los componentes de cliente
└── acciones/
    ├── compra.ts
    └── pago.ts
```

Dependencias: `postgres`, `zod`, `server-only`. Nada más.

---

## Frontend

### Rutas

| Ruta | Qué |
|---|---|
| `/` | Landing: hero, sobre nosotros, equipo, CTA de compra |
| `/comprar` | Plano del salón, selección, resumen con el total |
| `/comprar/datos` | Formulario. Recibe la selección por query string (`?asientos=1,2,3`) |
| `/reserva/[token]` | Estado de la reserva, contador de expiración y el botón de pago |
| `/entradas/[token]` | Las entradas del comprador |

La selección viaja por la URL, no por `sessionStorage`: así sobrevive un refresh y el
servidor puede renderizar el resumen.

### Componentes · `components/`

**Landing** (todos server components, sin JavaScript en el cliente)

Cinco bloques, en este orden. Simple y minimalista.

| Componente | Contenido |
|---|---|
| `Navbar` | El logo arriba, y el botón de comprar |
| `Hero` | `hero.webp` (la foto de la cena del año pasado) con degradado oscuro y el título **Cena de Cazadores 2026** |
| `SeccionEntradas` | "Comprá tus entradas" · fecha · precio · sillas libres · botón que lleva a `/comprar` |
| `SobreNosotros` | `sobre-nosotros.webp` con un texto al lado |
| `Contacto` | WhatsApp e Instagram |
| `Footer` | Logo y una línea |

`equipo.webp` y `extra.webp` quedan sin usar por ahora.

**Compra**

| Componente | Tipo | Qué hace |
|---|---|---|
| `MapaSalon` | client | Contiene la selección y decide qué vista mostrar según el ancho |
| `Mesa` | client | Una mesa: dos columnas de sillas con el número arriba. Memoizado |
| `Silla` | client | Un `<button>` por asiento |
| `GrillaMesas` / `DetalleMesa` | client | Los dos pasos de la vista de celular |
| `ResumenSeleccion` | client | Sillas elegidas, total, botón continuar |
| `FormularioDatos` | client | Los cinco campos. Es un `<form>` con `useActionState`: valida en el servidor con el mismo Zod y devuelve el error debajo de cada campo |
| `Contador` | client | `mm:ss` hasta que vence la reserva |
| `BotonPagar` | client | Cierra la compra |
| `TarjetaEntrada` | server | Una entrada: mesa, silla y titular |

**El plano tiene dos vistas.** En escritorio, el salón completo con el escenario arriba y
la entrada en el medio. En celular, primero se elige la mesa de una grilla de tarjetas y
después las sillas de esa mesa, en botones de 44px. 730 chips diminutos en un teléfono no
se pueden tocar.

**Sólo la primera silla de cada mesa entra en el recorrido del tabulador**; dentro de la
mesa se navega con las flechas. 730 paradas de Tab no las usa nadie.

---

## Diseño

### Colores

El logo de la armería es negro y latón. El acento sale de ahí, no de un dorado inventado:
si el logo vive en el navbar, un oro que no es el suyo se nota.

| Token | Hex | Uso |
|---|---|---|
| `carbon` | `#16181a` | el negro del logo: navbar, footer, fondo del hero |
| `forest` | `#1c241d` | verde bosque: secciones oscuras, texto sobre claro |
| `olive` | `#30382b` | superficies oscuras secundarias, las mesas del plano |
| `moss` | `#414936` | bordes sobre oscuro |
| `ivory` | `#e8e2d3` | texto sobre oscuro |
| `beige` | `#b9b29f` | texto secundario sobre oscuro |
| `brass` | `#b8934a` | **acento**: el latón del logo |
| `brass-light` | `#c9a55c` | hover del acento |
| `bone` | `#f7f5ef` | tarjetas |
| `sand` | `#eeece4` | fondo de página |
| `muted` | `#50584d` | texto secundario sobre claro |

Sillas: `#2e8b57` libre · `#c9a24a` elegida · `#7a3a34` ocupada.

Tres detalles que no son opcionales:

- La silla elegida lleva texto oscuro, nunca blanco: sobre el amarillo el blanco no se lee.
- **El estado nunca se indica sólo con color.** La elegida lleva además un anillo oscuro (y
  un tilde en la vista grande); la ocupada, rayas diagonales y opacidad. Con daltonismo
  rojo-verde el libre y el ocupado son el mismo color, y este evento tiene público
  mayoritariamente masculino.
- La silla ocupada va apagada, no chillona: no es accionable, no tiene que competir.

Sin modo oscuro.

### Tipografía

- **Fraunces** para títulos, números de mesa y precios. Serif con carácter, le da el tono
  del evento.
- **Inter** para texto e interfaz. Con `tabular-nums` en el contador y los precios, para
  que los números no bailen.

Las dos por `next/font/google`, con subsets `latin` y `latin-ext`.

| Rol | Tamaño |
|---|---|
| h1 | `clamp(2.375rem, 6vw, 4rem)`, `line-height: 1.05`, `letter-spacing: -0.02em` |
| h2 | `clamp(1.75rem, 4vw, 2.125rem)` |
| h3 | `1.25rem` |
| Cuerpo | `1.125rem` |
| Interfaz | `0.9375rem` |
| Etiquetas | `0.75rem`, mayúsculas, `letter-spacing: 0.08em` |

Bordes redondeados: 6px en botones e inputs, 12px en tarjetas, 20px en el plano.

---

## Qué no se hace

- Varios eventos o varias fechas
- Cuentas de usuario para compradores
- "Elegime 4 asientos juntos" — el comprador elige a mano
- Reventa o cambio de titular
- Descuentos, cupones o precios por zona
- Pago en efectivo o transferencia
- App nativa para escanear en la puerta
- Panel de administración *(se define cuando el flujo esté andando)*

---

## Pendientes de definir

- Fecha y lugar del evento
- Dominio propio (hace falta para que los mails no caigan en spam, etapa 3)
- Credenciales `TEST-` de Mercado Pago (etapa 2)
- Cómo se valida la entrada en la puerta el día del evento
