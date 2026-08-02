
# API — Cazadores Malaquía

Todos los endpoints que hoy expone el backend para el front de venta y para la
puerta. El panel de admin todavía no está: cuando exista va a colgar de
`/api/admin/**` y no toca nada de lo de acá.

Base URL: la del deploy. CORS habilitado sólo para los orígenes configurados y
sólo con **GET, POST y OPTIONS** — no hay PUT ni DELETE en toda la API, las
acciones van por POST con el verbo en la ruta (`/cancelar`, `/pagar`).

---

## Convenciones

**Plata en centavos.** `precioCentavos: 3500000` son $35.000. Nunca hay decimales
en la API; el formateo es del front.

**Fechas ISO-8601 con offset** (`2026-08-03T21:00:00-03:00`). Vienen del backend
ya con la zona, no hay que asumir UTC.

**Errores: siempre el mismo cuerpo.** Cualquier respuesta 4xx/5xx trae esto —
también las de seguridad. Los campos en `null` no se serializan.

```json
{
  "timestamp": "2026-08-01T18:30:00-03:00",
  "status": 409,
  "error": "Conflict",
  "mensaje": "Las ventas estan cerradas",
  "campos": { "usuario.dni": "El DNI son 7 u 8 numeros, sin puntos" },
  "asientosOcupados": [12, 13]
}
```

`mensaje` es texto mostrable al usuario final — está escrito para eso.
`campos` aparece sólo en errores de validación (400), con la ruta del campo del
request como clave. `asientosOcupados` aparece sólo cuando el conflicto es por
butacas tomadas, con los ids que fallaron.

**Autenticación.** Público: `GET /api/evento`, `GET /api/mapa`, todo
`/api/ordenes/**` y `POST /api/auth/login`. Con token: `/api/entradas/**`.
El token va en `Authorization: Bearer <jwt>`; sin él o vencido se responde 401
con `"Necesitas iniciar sesion"`.

En `/api/ordenes/**` la credencial **es el token de la orden**: sin ese UUID no
se puede nombrar una orden ajena. Por eso el front tiene que guardarlo
(localStorage) apenas crea la orden — es lo único que necesita conservar de toda
la compra.

---

## Catálogo

### `GET /api/evento`

Los datos del evento y las reglas de la compra. Conviene pedirlo al entrar,
porque de acá salen el precio a mostrar, el máximo de butacas por compra y los
minutos del contador.

```json
{
  "nombre": "Cena de Cazadores",
  "fecha": "2026-08-03T21:00:00-03:00",
  "lugar": "...",
  "precioCentavos": 3500000,
  "maxAsientosPorCompra": 10,
  "minutosReserva": 15,
  "ventasAbiertas": true
}
```

Si `ventasAbiertas` es `false`, el mapa se puede seguir mostrando pero crear
orden devuelve 409. Mejor deshabilitar el botón antes de llegar ahí.

### `GET /api/mapa`

El salón completo con el estado de cada butaca. Es la única fuente de
disponibilidad.

```json
{
  "mesas": [
    {
      "id": 1,
      "numero": 1,
      "fila": "ARRIBA",
      "orden": 1,
      "capacidad": 10,
      "asientos": [
        { "id": 12, "numero": 1, "posicion": 1, "lado": "IZQUIERDA", "estado": "DISPONIBLE" }
      ]
    }
  ]
}
```

`fila`: `ARRIBA` | `ABAJO` — las dos hileras del salón.
`orden`: posición de la mesa dentro de su fila, para dibujarlas de izquierda a derecha.
`lado`: `IZQUIERDA` | `DERECHA` — de qué lado de la mesa está la silla.
`posicion`: el lugar del asiento dentro de su lado.
`estado`: `DISPONIBLE` | `RESERVADO` | `VENDIDO`.

El estado **no está guardado en ninguna columna**: se calcula en cada consulta a
partir de las reservas vivas y las entradas vigentes. Consecuencia práctica: el
mapa envejece solo. Una butaca `RESERVADO` puede quedar libre en cualquier
momento sin que nadie avise, así que conviene refrescar el mapa cada tanto
mientras el usuario elige, y siempre después de un error de butacas ocupadas.

El `id` del asiento es lo que se manda al crear la orden.

---

## Compra

El orden es: crear orden → pagar → volver del checkout → reconciliar → mostrar
entradas.

### `POST /api/ordenes` → `201`

Crea la orden y **reserva las butacas** por `minutosReserva`.

```json
{
  "usuario": {
    "dni": "40123456",
    "nombre": "Roque",
    "apellido": "Otha",
    "email": "roque@mail.com",
    "celular": "2236680996"
  },
  "asientoIds": [12, 13]
}
```

Todos los campos del usuario son obligatorios. El DNI son **7 u 8 dígitos sin
puntos** (con puntos no se encuentra a la persona en la puerta) y el email tiene
que ser válido — los dos vuelven en `campos` si fallan. El usuario se busca por
DNI y se crea si no existe; comprar dos veces con el mismo DNI no duplica nada.

`asientoIds` no puede venir vacío. Los ids repetidos se cuentan una sola vez
contra el límite: mandar diez veces la misma butaca es una butaca.

Respuesta — `OrdenResponse`, el mismo cuerpo que devuelven el GET y
`/reconciliar`:

```json
{
  "token": "6f9d...-uuid",
  "estado": "ACTIVA",
  "precioUnitarioCentavos": 3500000,
  "totalCentavos": 7000000,
  "creadoEl": "2026-08-01T18:30:00-03:00",
  "expiraEn": "2026-08-01T18:45:00-03:00",
  "pagadoEl": null,
  "usuario": { "dni": "40123456", "nombre": "Roque", "apellido": "Otha", "email": "...", "celular": "..." },
  "butacas": [ { "asientoId": 12, "numero": 1, "mesaNumero": 1 } ]
}
```

`estado`: `ACTIVA` | `PAGADA` | `EXPIRADA` | `CANCELADA`.
`expiraEn` es contra qué corre el contador de la pantalla de pago. Cuando la
orden queda pagada pasa a `null` — la reserva ya no vence nunca.
`precioUnitarioCentavos` queda congelado al crear la orden: si el precio del
evento cambia después, esta orden sigue valiendo lo que se le mostró al
comprador. `totalCentavos` es unitario × butacas, no se guarda.

Errores: **400** si faltan datos o el límite de butacas se pasa; **409** si las
ventas están cerradas o si alguna butaca ya fue tomada — en ese caso viene
`asientosOcupados` con los ids, y lo correcto es refrescar el mapa y marcarlos.

### `GET /api/ordenes/{token}`

El estado actual de la orden. **No consulta a Mercado Pago**: devuelve lo que hay
en la base. Sirve para pintar la pantalla; para saber si un pago entró, usar
`/reconciliar`.

**404** si el token no existe.

### `POST /api/ordenes/{token}/pagar`

Abre un intento de cobro y devuelve el link de Checkout Pro. A ese link hay que
mandar al comprador (redirect, no iframe).

```json
{ "token": "6f9d...", "montoCentavos": 7000000, "initPoint": "https://www.mercadopago.com.ar/checkout/..." }
```

El link vence **un minuto antes que la orden**, a propósito: ese colchón evita
que un pago se apruebe justo cuando la butaca vuelve a la venta.

Se puede llamar más de una vez sobre la misma orden — si un intento fue
rechazado, la orden conserva sus butacas y el comprador puede reintentar
mientras no venza.

Errores: **409** si la orden ya no está `ACTIVA` (`"La orden ya no admite
pagos"`), **409** si venció o queda muy poco tiempo (`OrdenExpirada`), **409** si
ya no le quedan butacas reservadas, **502** si Mercado Pago no responde — este
último se puede reintentar tal cual.

### `POST /api/ordenes/{token}/reconciliar`

**Esto es lo que hay que llamar al volver del checkout.** Le vuelve a preguntar a
Mercado Pago por los cobros de la orden, y si encuentra uno aprobado marca la
orden como pagada y emite las entradas. Devuelve el `OrdenResponse` ya
actualizado.

Mercado Pago redirige al comprador a las back-urls configuradas
(`/checkout/exito`, `/checkout/error`, `/checkout/pendiente`) con un querystring
propio. **Ese querystring es falsificable y no hay que creerle**: la página de
retorno toma el token de donde lo guardó el front, llama a este endpoint, y la
verdad la contesta el backend.

Las back-urls **no llevan el token**, por eso hace falta el localStorage.

Es idempotente y barato de repetir: si el aviso de MP ya había llegado por
webhook, no le pregunta nada a nadie y responde lo mismo que el GET. Si vuelve
`ACTIVA` (el pago quedó en proceso), se puede reintentar cada unos segundos por
un rato antes de mostrar "pendiente".

Cuando termina en `PAGADA`, el mail con las entradas en PDF sale solo desde el
backend — el front no dispara nada.

### `POST /api/ordenes/{token}/cancelar` → `204`

Suelta las butacas y deja la orden en `CANCELADA`. Para el botón de "volver
atrás" antes de pagar; sin esto las sillas quedan tomadas hasta que corra el
reloj.

**409** si la orden ya no está `ACTIVA` — ya está pagada, cancelada o vencida.

### `GET /api/ordenes/{token}/entradas`

Las entradas emitidas. Devuelve `[]` mientras la orden no esté pagada.

```json
[ { "codigo": "a1b2...-uuid", "mesaNumero": 3, "asientoNumero": 5, "titular": "Roque Otha", "usadoEl": null } ]
```

`codigo` es el UUID que va en el QR. `usadoEl` es `null` hasta que la escanean en
la puerta. **404** si el token no existe.

---

## Puerta (requiere token)

### `POST /api/entradas/{codigo}/validar`

El escaneo del día del evento. Es POST y no GET porque **quema el código**: la
segunda llamada con el mismo UUID falla a propósito. Devuelve el
`EntradaResponse` — mostrar el `titular` y la ubicación, que saber que el código
es válido no alcanza.

**409** si ya se usó (`"La entrada ya se uso el 03/08/2026 21:14"`) o si fue
anulada — son dos casos distintos para quien está en la puerta y el mensaje lo
dice. **404** si el código no existe.

### `POST /api/entradas/{codigo}/anular` → `204`

Da de baja la entrada y devuelve la butaca a la venta. Es idempotente: anular dos
veces no es error. **409** si la entrada ya se usó — esa persona está adentro y
liberar su silla la pondría a la venta con alguien sentado.

---

## Login (para la puerta y el panel)

### `POST /api/auth/login`

```json
{ "email": "...", "password": "..." }
```
→ `{ "token": "eyJ...", "expiraEn": "2026-08-04T06:00:00-03:00" }`

El token dura 12 horas y **no hay refresh**: si vence, se vuelve a entrar.
`expiraEn` viaja para poder avisar antes de que la sesión se corte en medio de la
fila, en vez de enterarse con un 401.

**401** con `"Email o contrasena incorrectos"` — el mismo mensaje si el email no
existe y si la contraseña está mal, a propósito.

---

## Lo que el front no toca

`POST /webhooks/mercadopago` existe pero lo llama Mercado Pago, no el navegador:
está fuera de `/api` y fuera del CORS. Es el camino por el que la mayoría de los
pagos se confirman solos; `/reconciliar` es la red por si el aviso tarda o no
llega.

El mail con los PDF de las entradas también sale del backend, al confirmarse el
pago.
