# API del panel — Cazadores Malaquía

Todo lo que el backend expone para el panel de administración. Cuelga entero de
`/api/admin/**`, más `GET /api/auth/yo`, y no toca nada de lo de
[`api-frontend.md`](api-frontend.md), que sigue siendo la referencia del front
de venta.

Lo de allá vale acá y no se repite: plata en **centavos**, fechas **ISO-8601 con
offset**, y el mismo cuerpo de error en cualquier 4xx/5xx (`status`, `mensaje`,
y `campos` / `asientosOcupados` cuando corresponde). `mensaje` está escrito para
mostrarse tal cual. **CORS: sólo GET, POST y OPTIONS** — no hay PUT ni DELETE en
ningún lado, las acciones son POST con el verbo en la ruta (`/cerrar-ventas`,
`/cambiar-butaca`).

---

## Sesión

**Una sola cuenta compartida**, la misma para el panel y para la puerta. No hay
roles ni alta de usuarios: quien tiene el token puede todo lo de este documento.
`POST /api/auth/login` está en `api-frontend.md`; el token dura 12 horas y **no
hay refresh**, va en `Authorization: Bearer <jwt>`, y sin él —o vencido—
cualquier ruta de acá responde **401** con `"Necesitas iniciar sesion"`.

### `GET /api/auth/yo` → `{ "email": "...", "nombre": "Administracion" }`

Para el nombre de arriba a la derecha y para chequear al montar el panel que la
sesión sigue viva. Si da 401, mandar al login.

---

## Tablero

### `GET /api/admin/resumen`

Cómo va la venta, en un solo pedido: es la pantalla de entrada.

```json
{
  "butacas": { "total": 730, "vendidas": 412, "reservadas": 18, "libres": 300, "entradasUsadas": 0, "entradasAnuladas": 3 },
  "recaudacion": {
    "totalCentavos": 144200000,
    "porMedio": [ { "medio": "MERCADOPAGO", "totalCentavos": 129500000, "cantidad": 37 } ],
    "ordenesPorEstado": [ { "estado": "PAGADA", "cantidad": 41 } ]
  },
  "incidenciasPendientes": 2
}
```

`vendidas` y `reservadas` no se pisan: una son entradas emitidas, la otra
butacas agarradas sin pagar. `porMedio` trae **siempre los tres medios**
(`MERCADOPAGO`, `EFECTIVO`, `TRANSFERENCIA`) y `ordenesPorEstado` **siempre los
cinco estados**, aunque estén en cero — al panel no le tienen que aparecer
renglones nuevos a medida que avanza la venta. `incidenciasPendientes` es el
badge de la cola de casos.

`entradasAnuladas` va **aparte y no se resta de nada**: la butaca de una anulada
ya salió de `vendidas` y volvió a `libres` sola. Se muestra igual porque cada una
es plata que hay que devolver a mano, y escondida no la reclama nadie.

---

## Puerta

### `GET /api/admin/invitados?q=`

Un solo campo de búsqueda que acepta **DNI, apellido o número de butaca**; el
front no tiene que saber cuál de los tres se tipeó. Con `q` vacío devuelve `[]`.
Máximo **20 resultados**: con más, el que atiende escribe dos letras más.

**Por butaca** se resuelve solo: si `q` son entre uno y cuatro dígitos, además de
buscar por DNI se busca quién tiene esa silla agarrada, y los dos resultados se
**unen** (sin repetir a nadie, la butaca primero). Las sillas están numeradas
**1..730 de corrido en todo el salón** —la mesa 6 va de la 263 a la 314—, así que
el número solo ya identifica una butaca y no hace falta mandar la mesa. Un DNI
son 7 u 8 dígitos, así que nunca dispara la búsqueda por butaca.

Encuentra al que tiene la butaca **incluso si todavía no pagó** —ahí llega con
`entradas: []` y `tieneOrdenSinPagar: true`—, y no encuentra a nadie si la silla
está libre o si su reserva venció.

```json
[ { "dni": "40123456", "nombre": "Roque", "apellido": "Otha", "email": "...",
    "celular": "...", "tieneOrdenSinPagar": false,
    "entradas": [ { "codigo": "a1b2...-uuid", "mesaNumero": 3, "asientoNumero": 145,
                    "titular": "Roque Otha", "usadoEl": null, "anuladaEl": null } ] } ]
```

**`anuladaEl` hay que mirarlo.** La lista trae también las entradas dadas de
baja, así que sin ese campo una butaca anulada se lee como vigente y la puerta
deja pasar a alguien que ya no tiene lugar. Mostrarlas tachadas.

**`tieneOrdenSinPagar` es el caso difícil**: alguien que llega diciendo que
compró y no tiene ninguna entrada. Sin este dato aparece igual que quien nunca
compró; con él, se ve que hubo una compra que no llegó a pagarse.

Las dos acciones de puerta —`POST /api/entradas/{codigo}/validar` y `/anular`— están
en `api-frontend.md` y también piden token.

---

## Órdenes

### `GET /api/admin/ordenes?estado=&q=`

Los dos filtros son opcionales y se combinan. `estado` es `ACTIVA` | `PAGADA` |
`EXPIRADA` | `CANCELADA` | `ANULADA`; `q` acepta DNI o apellido. Máximo
**100 resultados**.

**`EXPIRADA` no está guardado en ningún lado**, se deriva del reloj al responder:
nada en el backend recorre las órdenes vencidas para marcarlas. Las butacas sí se
liberan bien —lo hace la compra siguiente que las pida—, pero la fila se queda en
`ACTIVA`. Consecuencia para el panel: **filtrar por `ACTIVA` trae también las
vencidas** (y llegan con `"estado": "EXPIRADA"`), y **filtrar por `EXPIRADA` no
trae ninguna**, porque el filtro consulta la columna y el campo de la respuesta
no. Si hace falta ver sólo las vivas, filtrar por `ACTIVA` y descartar en el
front las que vengan como `EXPIRADA`.

```json
[ { "token": "6f9d...-uuid", "estado": "PAGADA", "origen": "WEB",
    "comprador": "Roque Otha", "dni": "40123456", "creadoEl": "...",
    "pagadoEl": "...", "butacas": 2, "totalCentavos": 7000000 } ]
```

`origen`: `WEB` | `ADMIN` — distingue la compra del cliente de la que cargó el
equipo. `butacas` son las que la orden **todavía conserva**: una `CANCELADA`
muestra 0, que es literal, ya las devolvió a la venta. Para el detalle —las
butacas una por una, con mesa y número— se usa el `GET /api/ordenes/{token}`
público, que ya las mapea; no hay una versión admin. Ese detalle lista **sólo
las butacas que la orden conserva** y cobra el total sobre ésas, así que
coincide con el `butacas` de esta lista: una `CANCELADA` llega con `butacas: []`
y `totalCentavos: 0`.

### `POST /api/admin/ordenes/{token}/reenviar-entradas` → `204`

Reenvía el PDF a la dirección que tiene el comprador. El del cliente
(`POST /api/ordenes/reenviar`) pide DNI y email y calla lo que encontró; **éste
avisa cuando algo no cierra**, porque del otro lado hay alguien atendiendo un
teléfono y necesita poder decir por qué no salió.

**404** si el token no existe o si la orden no está pagada (`"La orden no esta
pagada: no tiene entradas"`).

---

## Ventas cobradas a mano

Entradas vendidas por fuera de la web. **La app no cobra nada acá**: registra una
venta que se cobró afuera, en efectivo o por transferencia.

### `POST /api/admin/ventas` → `201`

```json
{ "comprador": { "dni": "40123456", "nombre": "Roque", "apellido": "Otha",
                 "email": "roque@mail.com", "celular": "2236680996" },
  "asientoIds": [12, 13], "medio": "EFECTIVO" }
```

No lleva precio: sale del evento, igual que en la compra online. Un campo menos
que tipear mal a las once de la noche. Devuelve el `OrdenResponse` completo —el
mismo cuerpo del front de venta— ya `PAGADA` y con sus butacas, para mostrar en
el acto qué quedó asignado. El mail con el PDF sale solo.

**Este endpoint hace todo de una**: crea o actualiza al comprador, crea la orden
ya paga, reserva las butacas, registra el cobro, emite las entradas y manda el
mail. **No hay un paso previo ni uno posterior** — no se llama a `POST
/api/ordenes` antes, ni a `/pagar`, ni a nada de Mercado Pago. Es un solo POST.
O sale todo o no sale nada: si falla en cualquier punto se deshace entero y no
queda ni la orden ni el usuario nuevo.

#### El cuerpo, campo por campo

Los tres de arriba son **obligatorios** y los cinco de `comprador` también. No
hay opcionales, no hay nulos.

| Campo | Tipo | Regla |
|---|---|---|
| `comprador.dni` | string | **7 u 8 dígitos, sin puntos**. `"40.123.456"` da 400 |
| `comprador.nombre` | string | no vacío |
| `comprador.apellido` | string | no vacío |
| `comprador.email` | string | tiene que parecer un email; **acá llega el PDF** |
| `comprador.celular` | string | no vacío, formato libre |
| `asientoIds` | array de números | al menos uno; los duplicados se ignoran |
| `medio` | string | **`"EFECTIVO"` o `"TRANSFERENCIA"`, en mayúsculas** |

**`asientoIds` son los `id` del mapa, no los `numero`.** `GET /api/mapa` devuelve
cada butaca con los dos campos (`{ "id": 293, "numero": 293, ... }`) y **hoy
coinciden**, así que mandar el equivocado funciona igual y nadie se entera. Si
alguna vez se recarga el salón dejan de coincidir y las ventas se cargarían en
butacas ajenas sin ningún error. Mandar `asiento.id`.

**`medio` es sensible a mayúsculas.** `"efectivo"` no se parsea y da 400 con
`"El cuerpo de la peticion no es valido"` y sin `campos`, que es un error mucho
más mudo que el de validación normal — si aparece ese mensaje, mirar ahí primero.
`"MERCADOPAGO"` sí se parsea pero se rechaza con **422**: una venta a mano no se
cobra por la pasarela, o el desglose del resumen informaría plata que Mercado
Pago no tiene.

**No mandar precio, ni `token`, ni `estado`, ni `origen`.** Los pone el backend.

#### Al recibir el 201

`OrdenResponse` llega con `estado: "PAGADA"`, `origen: "ADMIN"`, `expiraEn: null`
y `butacas` con mesa y número de cada silla. Con ese `token` se piden el detalle
(`GET /api/ordenes/{token}`) y el PDF (`/entradas.pdf`) si hay que reimprimir.

#### Lo que puede salir mal

- **400** con `campos`: falta o está mal algún dato del comprador, o
  `asientoIds` vino vacío. El objeto `campos` dice cuál y por qué, listo para
  pintar debajo del input.
- **400** sin `campos` (`"El cuerpo de la peticion no es valido"`): el JSON no se
  pudo leer. Casi siempre es `medio` en minúsculas o un tipo equivocado.
- **401**: token vencido o ausente. Mandar al login.
- **409** con `asientosOcupados`: alguna butaca ya estaba tomada. Trae la lista
  de ids — refrescar el mapa y marcarlas.
- **422**: `medio: "MERCADOPAGO"`.
- **404**: algún `asientoId` no existe en el salón.

**Es lento**: espera al servidor de correo antes de responder. Timeout de cliente
de 30 s y el botón deshabilitado mientras tanto, porque un doble clic son dos
órdenes cobradas. Se pueden dar de baja (ver abajo), pero eso deja rastro y no
devuelve la plata: conviene una confirmación antes de enviar.

**La carga a mano es libre a propósito**: no valida `maxAsientosPorCompra` ni
`ventasAbiertas`. Se puede cargar con la venta cerrada y por encima del máximo.

### `GET /api/admin/ventas`

El historial de lo cobrado a mano, más nuevo primero. Sin filtros: son las
ventas de un solo evento y entran todas en una pantalla. Tope **100**.

```json
[ { "token": "6f9d...-uuid", "comprador": "Roque Otha", "dni": "40123456",
    "creadoEl": "2026-08-01T23:10:00-03:00", "butacas": 2,
    "medio": "EFECTIVO", "montoCentavos": 7000000 } ]
```

`creadoEl` es **cuándo se cargó la venta**. El monto sale del cobro y no de
precio × butacas, así que cuadra con el desglose por medio del resumen. Los
números de butaca no viajan acá: con el `token` se piden a
`GET /api/ordenes/{token}`. `medio` y `montoCentavos` pueden venir en **null**
si la venta no tiene cobro aprobado: no debería pasar, y si aparece es un dato
roto que hay que mostrar como tal, no como cero.

### `POST /api/admin/ventas/{token}/anular` → `204`

```json
{ "motivo": "Se cargo con el DNI equivocado" }
```

Da de baja la venta a mano **entera**: anula todas sus entradas, devuelve las
butacas al mapa, deja la orden en `ANULADA` y la saca de la recaudación. **No
devuelve la plata**: el reintegro lo hace el equipo a mano. El `motivo` sigue las
mismas reglas que el de anular una entrada — obligatorio, hasta 500 caracteres.

| Código | Cuándo |
|---|---|
| `204` | Salió bien. Volver a llamarla no es error |
| `400` | Falta el motivo |
| `404` | El token no existe |
| `409` | Alguien de esa venta ya pasó por la puerta. No se da de baja: esa persona está adentro |
| `422` | Es una compra de la web, no una venta cargada a mano |

El `409` y el `422` se muestran con el `mensaje` de la respuesta: son
explicativos. El panel ofrece la baja sólo cuando la orden viene con
`origen: "ADMIN"` y estado `PAGADA`, para no poner un botón destructivo delante
de una compra que el backend va a rechazar con 422.

---

## Corregir una entrada emitida

Dos operaciones distintas, y ninguna de las dos cambia de titular una entrada.

### `POST /api/admin/entradas/{codigo}/cambiar-butaca` → `204`

```json
{ "asientoId": 145 }
```

Mueve la entrada a otra silla. **El `codigo` no cambia**: el UUID que ya viajó
por WhatsApp sigue sirviendo. Se reenvía el PDF de la orden completa
automáticamente, porque el papel impreso dice la butaca vieja. Sólo el destino
en el body — cuál es la entrada lo dice el `codigo` de la ruta, y de qué butaca
sale lo lee el backend.

- **404** si el código no existe.
- **409** si la entrada ya se usó (`"esa persona ya entro"`), si está anulada, o
  si el asiento pedido es el que ya tiene.
- **409** con `asientosOcupados` si la butaca de destino está tomada.

**Intercambiar dos butacas ocupadas entre sí falla**, y es correcto que falle:
hay que mover una a una silla libre primero y después completar el cambio. El
panel debería explicarlo cuando llega ese 409. Después del 204, refrescar
`GET /api/admin/invitados?q=` para ver la ubicación nueva.

### `POST /api/admin/usuarios/{dni}/corregir` → `200`

```json
{ "nombre": "Roque", "apellido": "Otha", "email": "...", "celular": "..." }
```

Arregla los datos de contacto del comprador. Los cuatro campos son obligatorios
y viajan siempre: **es un reemplazo, no un parche** — precargar el formulario
con lo que ya está. Devuelve el `UsuarioResponse` corregido para pintarlo en el
acto. **404** si no hay ningún comprador con ese DNI.

**El DNI no se corrige.** Va en la ruta y no en el cuerpo: identifica a la
persona, y las compras, las entradas y la búsqueda de la puerta cuelgan de él.
Esto sirve sobre todo para el apellido mal tipeado, que es con lo que se busca a
alguien en la puerta. No cambia los PDF ya emitidos y no reenvía nada.

---

## Cola de casos

Compras pagadas que quedaron sin butaca: el pago entró tarde y la reserva ya
había vencido, o la orden figura paga sin sillas vivas. Las abre el backend solo,
al confirmar pagos.

### `GET /api/admin/incidencias`

Los casos sin resolver. Traen el comprador y no sólo el número de orden porque lo
primero que se hace con un caso es llamar a esa persona.

```json
[ { "id": 3, "tipo": "PAGO_TARDIO", "estado": "ABIERTA", "comprador": "Roque Otha",
    "dni": "40123456", "celular": "...", "creadoEl": "..." } ]
```

`tipo`: `PAGO_TARDIO` | `SIN_BUTACA` | `BUTACAS_INCOMPLETAS` | `MONTO_DISTINTO`.
`estado`: `ABIERTA` | `EN_CURSO`.

Los dos últimos son nuevos y necesitan etiqueta propia en la cola.
**`BUTACAS_INCOMPLETAS`** es que se cobraron 3 butacas y salieron 2 entradas: es
lo más urgente, porque alguien llega a la puerta con una entrada de menos.
**`MONTO_DISTINTO`** es que Mercado Pago informó un importe que no es el que se
pidió cobrar: es una diferencia de plata y no bloquea a nadie esa noche.

### `GET /api/admin/incidencias/{id}`

El caso completo, para tener a la vista antes de levantar el teléfono. Suma
`detalle` (lo escribió la confirmación del pago), `resueltaEl`, `resueltaPor`,
la `orden` entera —**con sus butacas, incluidas las liberadas**: son las que esa
persona había elegido y perdió— y el `pago`:

```json
{ "montoCentavos": 7000000, "medio": "MERCADOPAGO", "estado": "APROBADO",
  "aprobadoEl": "...", "referenciaExterna": "123456789" }
```

`pago` viene en null si todavía no hay cobro aprobado; `referenciaExterna` en
null en las ventas cargadas a mano. **404** si el id no existe.

Es la **única** respuesta que lista butacas liberadas, y por eso su
`orden.totalCentavos` no se puede usar para nada: se calcula sobre las que la
orden todavía conserva, así que en un caso `SIN_BUTACA` da **0** aunque se hayan
cobrado dos entradas. La plata de verdad está en `pago.montoCentavos`.

### `POST /api/admin/incidencias/{id}/tomar` → `204`

Pasa el caso a `EN_CURSO`. Es sólo una marca de "lo estoy atendiendo". **422**
si ya estaba resuelto.

### `POST /api/admin/incidencias/{id}/reubicar` → `204`

```json
{ "asientoIds": [201, 202] }
```

La única acción que hace algo de verdad: reserva las butacas nuevas, emite las
entradas, manda el mail y recién después cierra el caso. **La cantidad tiene que
ser exactamente la que la orden pagó** y no viaja en el body: el backend la
deriva del cobro. Si no coincide, **422** diciendo cuántas pagó y cuántas se
mandaron. **409** con `asientosOcupados` si alguna butaca estaba tomada. **422**
también si el caso ya está resuelto.

### `POST /api/admin/incidencias/{id}/resolver` → `204`

```json
{ "nota": "Se lo reubico en la mesa 9 por telefono" }
```

Cierra el caso sin reubicar. La nota es **obligatoria**, máximo 500 caracteres:
se agrega al detalle en vez de pisarlo. Un caso resuelto sin decir qué pasó no
se puede reconstruir después, que es justo para lo que está la tabla. **422** si
ya estaba resuelto.

---

## Configuración del evento

### `POST /api/admin/evento`

Mismos campos que devuelve `GET /api/evento`, menos `ventasAbiertas`:

```json
{ "nombre": "Cena de Cazadores", "fecha": "2026-08-03T21:00:00-03:00",
  "lugar": "...", "precioCentavos": 3500000,
  "maxAsientosPorCompra": 10, "minutosReserva": 15 }
```

**Es un reemplazo completo, no un parche**: cargar el formulario con lo que
devuelve `GET /api/evento`. Todos obligatorios; `minutosReserva` va de 5 a 180 y
`maxAsientosPorCompra` de 1 a 50. La fecha **no** se valida como futura, a
propósito: el día del evento es justo cuando puede hacer falta corregir el lugar
o la hora. Cambiar el precio no toca las órdenes ya creadas: cada una tiene
congelado su `precioUnitarioCentavos`.

### `POST /api/admin/evento/abrir-ventas` / `cerrar-ventas`

Los dos devuelven el `EventoResponse` actualizado. Son endpoints propios y no un
campo del formulario porque cerrar es lo que se hace con apuro cuando algo va
mal, y en ese momento nadie tiene que estar completando el nombre y el lugar
para poder frenar la venta: botón aparte y bien a mano. Con las ventas cerradas
el mapa se sigue viendo, pero `POST /api/ordenes` da 409; la carga manual sigue
funcionando igual.

---

## Notas para implementar

**Nada de esto refresca solo.** No hay websockets ni SSE: el resumen, el mapa y
la cola de casos envejecen apenas se pintan. Conviene un refresco cada tanto en
el tablero, y siempre después de un 409 por butacas ocupadas.

**Los endpoints que mandan mail son lentos** —`reenviar-entradas`,
`cambiar-butaca`, `POST /ventas`, `reubicar`—: el backend espera al servidor de
correo. Timeout de cliente de 30 s para esos cuatro; para el resto, 8 s sobra.

**El historial no dice quién.** Con una sola cuenta compartida queda registrado
qué se hizo, cuándo y por cuánto; `resueltaPor` guarda el mail de la cuenta, que
es el mismo siempre.
