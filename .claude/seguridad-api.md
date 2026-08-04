# Cambios de API para el front — fases 1 a 5

Lo que el front tiene que actualizar. Casi todo es aditivo —códigos nuevos donde antes venía 500 y
campos agregados—, con **dos secciones que sí pueden romper algo que hoy anda**: los límites nuevos
del formulario de compra (sección 5) y los cambios de comportamiento de la fase 5 (sección 6).

Ningún endpoint cambió de ruta, de método ni de forma. Lo de la sección 6 es **qué contestan ahora**
en situaciones donde antes contestaban otra cosa.

Las secciones **7 y 8** son posteriores y no son de esas fases: la vuelta del checkout ahora trae el
token en la ruta, y el PDF de las entradas se puede ofrecer en la pantalla de éxito. Las dos ya están
aplicadas en este repo — cada una cierra con una nota de cómo quedó.

---

## 1. Todo error trae el mismo cuerpo

```json
{ "timestamp": "...", "status": 409, "error": "Conflict", "mensaje": "...",
  "campos": { "nombre": "El nombre es obligatorio" }, "asientosOcupados": [412, 413] }
```

`campos` y `asientosOcupados` sólo aparecen cuando corresponde (los nulos no se serializan).
**Mostrar siempre `mensaje`**: está escrito para que lo lea un comprador.

**Una excepción, y hay que contemplarla: el 406 viene sin cuerpo.** Si el cliente pide `Accept` que no
es JSON, la respuesta es sólo el status. No intentar parsear.

---

## 2. Códigos que antes eran 500 y ahora no (fase 1)

| Status | Cuándo | Qué hacer en el front |
|---|---|---|
| **400** | Falta un `@RequestParam` o header obligatorio | Es un bug del front, no del usuario |
| **405** | Método que la ruta no acepta | Idem |
| **415** | Cuerpo sin `Content-Type: application/json` | Idem |
| **406** | `Accept` que no es JSON. **Sin cuerpo** | Idem |
| **404** | Ruta que no existe (`"La ruta solicitada no existe"`) | — |
| **409** | Violación de integridad o **deadlock entre dos compradores** | El de deadlock **es reintentable**: el `mensaje` ya dice "probá de nuevo" |
| **503** | La base no responde, timeout, o no se pudo abrir transacción | **Nuevo y el más importante**: no es culpa del pedido. Mostrar "reintentá en un rato", no "error" |
| **500** | Falló el commit, o error no controlado | Error genuino |

**Ojo con el 404:** una ruta **pública inexistente devuelve 401, no 404**, porque la autorización
corre antes que el router. Es a propósito. El 404 real sólo aparece dentro de rutas ya autorizadas.

---

## 3. Endpoints nuevos: pantalla de errores (fase 2)

Los dos piden sesión (cuelgan de `/api/admin/**`).

### `GET /api/admin/errores?pendientes=true`

`pendientes` es opcional y por defecto `true`. Con `false` trae también los ya atendidos.

Devuelve un array **ya ordenado**: `URGENTE` arriba y, dentro de cada gravedad, lo más nuevo primero.
No hay que reordenar en el front.

```json
[{
  "id": 1,
  "tipo": "COBRO_DUPLICADO",
  "gravedad": "URGENTE",
  "mensaje": "Se cobro dos veces la orden 11. Hay plata que devolver a mano",
  "detalle": "El intento de pago 5 se aprobo cuando la orden ya estaba pagada",
  "ordenId": 11,
  "ruta": null,
  "ocurrioEl": "2026-08-03T21:15:00-03:00",
  "atendidoEl": null
}]
```

- `tipo`: `COBRO_DUPLICADO` · `COBRO_DE_ORDEN_CAIDA` · `COBRO_DEVUELTO` · `MAIL_NO_ENVIADO` (los
  cuatro `URGENTE`) · `ERROR_INESPERADO` · `COMMIT_FALLIDO` (los dos `REVISAR`). **Los tres
  `COBRO_*` son plata**: uno cobrado dos veces, uno cobrado sobre una compra dada de baja y uno
  devuelto o desconocido.
- **`tipo` es una lista abierta y va a crecer.** La columna no tiene `CHECK` en la base, así que un
  tipo nuevo puede aparecer sin aviso y sin migración. **No hacer un `switch` exhaustivo que explote
  con un valor desconocido**: si el tipo no está mapeado, mostrar el `mensaje` tal cual y pintar la
  fila por `gravedad`, que sí es un conjunto cerrado.
- `gravedad`: `URGENTE` o `REVISAR`. Es lo que decide el color de la fila.
- `ordenId` y `ruta` son **nullables y excluyentes en la práctica**: los urgentes traen orden, los de
  revisar traen ruta.
- `ruta` es el **patrón** del endpoint, no la URL que se pidió: viene
  `"GET /api/ordenes/{token}/entradas.pdf"` con la llave literal. No sirve para abrir nada ni para
  saber a qué compra le pasó — es a propósito, porque ahí adentro iría una credencial.
- `atendidoEl` nulo = pendiente. No hay estado intermedio.
- **No viene el token de la orden por ningún campo.** Es la credencial con la que se bajan esas
  entradas y una pantalla se comparte por captura. Para abrir la compra hay que buscarla por
  `ordenId`.

### `POST /api/admin/errores/{id}/atender`

Sin cuerpo. Devuelve **204**. Es idempotente: apretarlo dos veces no cambia nada, y no pide motivo
(a diferencia de anular una entrada o dar de baja una venta).

Un `id` que no existe devuelve **404**.

---

## 4. Campo nuevo en el resumen

`GET /api/admin/resumen` ahora trae `erroresPendientes` junto a `incidenciasPendientes`:

```json
{ "butacas": {...}, "recaudacion": {...}, "incidenciasPendientes": 2, "erroresPendientes": 3 }
```

Es aditivo. Conviene mostrarlo con badge: si hay errores urgentes, ahí hay plata sin devolver o gente
sin sus entradas.

---

## 5. Límites nuevos en el formulario de compra (fase 4)

**Esto es lo único que puede romper algo que hoy anda.** Antes estos campos sólo tenían que estar;
ahora también tienen que entrar en un largo y, el celular, tener forma de teléfono.

Aplica a `POST /api/ordenes` (checkout), `POST /api/admin/ventas` (venta manual) y
`POST /api/admin/usuarios/{dni}/corregir` (corrección del panel) — **los tres usan las mismas reglas**.

| Campo | Regla |
|---|---|
| `nombre`, `apellido` | obligatorios, **máx. 60** |
| `email` | obligatorio, formato mail, **máx. 254** |
| `celular` | obligatorio, **8 a 20** caracteres, sólo dígitos y `+ ( ) - espacio` |
| `dni` | obligatorio, 7 u 8 dígitos **sin puntos** (ya era así) |
| `asientoIds` | al menos uno, **máx. 100** |

El celular acepta las formas en que la gente lo escribe: `2236680996`, `+54 9 223 668-0996`,
`(223) 668 0996`, `011 15 4444 5555`. Lo que rechaza son las letras. **Conviene replicar estas
reglas en el formulario** para que el error aparezca al tipear y no recién al enviar.

Todo esto falla como **400** con el detalle por campo en `campos`, que es lo que hay que pintar al
lado de cada input:

```json
{ "status": 400, "mensaje": "Revisa los datos ingresados",
  "campos": { "celular": "El celular tiene que ser un numero de telefono" } }
```

Un cambio más, en `POST /api/ordenes/reenviar`: mandar `dni` en `null` ahora es **400**. Antes pasaba
la validación y devolvía 204 sin hacer nada, así que si el front dependía de ese 204, ahora recibe un
400 legítimo.

---

## 6. Cambios de comportamiento (fase 5)

Seis bugs de lógica. **Ningún endpoint cambió de forma**: lo que cambia es qué contestan en casos que
antes contestaban distinto. Lo importante para el front está en 6.1, 6.2 y 6.3.

### 6.1. `POST /api/ordenes/{token}/reconciliar` — dos cambios, opuestos entre sí

**Ahora rescata más.** Antes, si el último intento de pago había quedado rechazado, reconciliar no le
preguntaba nada a Mercado Pago. Pero Checkout Pro deja reintentar con otra tarjeta sobre la misma
preferencia, así que un intento rechazado **todavía puede terminar cobrando**.

> **Seguir llamando a reconciliar aunque el último intento figure rechazado.** Es justo el caso que
> antes se perdía: el comprador pagó con la segunda tarjeta, el webhook no llegó, y esta llamada es la
> única red que queda. Si el front dejaba de consultar al ver un rechazo, hay que sacar esa condición.

**Ahora pregunta menos.** Si la orden está `CANCELADA` (o `ANULADA`), reconciliar **ya no consulta a
MP**: devuelve la orden tal como está, sin tocarla.

> Consecuencia directa: **una orden cancelada nunca se vuelve `PAGADA`.** Antes sí podía, si el
> comprador cancelaba desde la web y después terminaba de pagar en la pestaña de MP que había dejado
> abierta. Ahora esa plata queda registrada como `COBRO_DE_ORDEN_CAIDA` en la pantalla de errores y
> la devuelve el equipo a mano.
>
> **No hacer polling sobre una orden cancelada esperando que cambie.** No va a cambiar. Si el
> comprador dice que pagó igual, la respuesta correcta de la UI es "figura cancelada, contactanos por
> el reintegro", no reintentar.

La respuesta sigue siendo el `OrdenResponse` de siempre, en los dos casos.

### 6.2. `POST /api/admin/incidencias/{id}/reubicar` — sirve para los cuatro tipos, y reemite todo

Antes sólo terminaba bien con `SIN_BUTACA` y `PAGO_TARDIO`. Con `BUTACAS_INCOMPLETAS` y
`MONTO_DISTINTO` **no existía ningún camino de éxito** —la orden llega con butacas y entradas ya
emitidas—, así que el panel podía ofrecer el botón y no había forma de que funcionara.

Ahora reubicar **mueve la orden entera**: suelta todo lo que tiene y vuelve a tomar el total que pagó.
Tres cosas que el front tiene que reflejar:

1. **El botón vale para los cuatro tipos.** Si estaba deshabilitado para dos de ellos, se habilita.
2. **Se piden siempre *todas* las butacas de la orden, no las que faltan.** La cantidad sigue
   validándose contra el total pagado. Mandar sólo las nuevas da **422**.
3. **Se reemiten códigos nuevos para todas las entradas, incluso las que no se movieron.** Los
   códigos viejos dejan de servir. Cualquier PDF ya descargado queda obsoleto y **hay que volver a
   bajarlo**; el comprador recibe un mail con el juego completo. Si la pantalla tenía cacheada la
   lista de entradas, hay que refrescarla después de reubicar.

**Modo de falla nuevo — 409:** si alguna entrada de esa orden **ya pasó por la puerta**, la
reubicación entera se cae y no se toca nada.

```json
{ "status": 409, "mensaje": "La entrada ya se uso: no se puede anular" }
```

Es a propósito: esa persona está adentro y no se la puede mover. Mostrar el `mensaje` tal cual.

Los 422 de siempre siguen igual (caso ya resuelto, orden no pagada, cantidad que no coincide).

### 6.3. El contacto que se muestra ahora es el de la compra, no el de la ficha

El backend guarda dos cosas distintas: la **ficha** de la persona (`usuarios`, cambia con el tiempo) y
una **copia congelada** del comprador dentro de cada orden (a quién se le vendió *esa* compra). Tres
respuestas que leían la ficha ahora leen la copia:

| Endpoint | Campos |
|---|---|
| `GET /api/admin/incidencias` | `comprador`, `celular` |
| `GET /api/ordenes/{token}/entradas` y el PDF | `titular` |
| `GET /api/admin/ventas` | el comprador del listado |

El `dni` sigue saliendo de la ficha en los tres: identifica a la persona, no a la compra.

> **Esto crea una diferencia visible y buscada:** el nombre que muestra
> `GET /api/admin/invitados?q=` (que busca por DNI contra la ficha viva) puede **no coincidir** con el
> `titular` de la entrada. No es un bug y no hay que "arreglarlo" en la UI eligiendo uno de los dos.
> En la puerta se valida por código, no por nombre.

El caso que motivó el cambio: en un `SIN_BUTACA` el mail le promete al comprador que lo van a llamar,
y la pantalla desde donde se llama mostraba el teléfono viejo.

### 6.4. `POST /api/admin/usuarios/{dni}/corregir` ya no reescribe todas las compras

Corregir la ficha ahora toca la copia de una orden **sólo en los campos donde esa copia coincidía con
el valor viejo de la ficha**. Antes pisaba los cuatro campos de todas las órdenes del DNI.

Importa porque el backend soporta a propósito que la misma persona compre dos veces con mails
distintos. Antes, corregir una le reescribía el mail a la otra: esa compra desaparecía del reenvío por
DNI + email, y quien tuviera el mail sobreviviente podía pedir entradas ajenas.

> Para el front: **después de corregir, no asumir que todas las órdenes de ese DNI quedaron con el
> dato nuevo.** Si la pantalla muestra el contacto por orden, hay que releerlo del backend en vez de
> pintarlo con lo que se acaba de enviar. La respuesta de este endpoint es la **ficha** corregida, no
> el estado de las órdenes.

### 6.5. Lo que no cambió, para no salir a buscarlo

- **Ningún DTO perdió ni ganó campos.** Los `record` de respuesta son los mismos.
- `POST /api/ordenes/reenviar` sigue devolviendo **204 siempre** y sin distinguir casos, por lo mismo
  de siempre: contestar distinto lo convertiría en una forma de averiguar quién compró. Se le mejoró
  el manejo de conexiones por dentro, nada más.
- La pantalla de errores y `GET /api/admin/resumen` siguen igual salvo los dos tipos nuevos de 3.

---

## 7. La vuelta del checkout ahora trae el token en la ruta

Mercado Pago devuelve al comprador a una dirección que **arma el backend por cada pago**, y que lleva
el token de la orden en la ruta:

```
https://{front}/checkout/exito/{token}
https://{front}/checkout/error/{token}
https://{front}/checkout/pendiente/{token}
```

La base sale de `mp.front-url`; las tres rutas están fijas en `MercadoPagoClientImpl`. **Si el front
cambia esos paths, hay que avisar**: son un acuerdo entre los dos proyectos y no hay forma de que el
backend se entere solo.

**Lo que cambia para el front:** la página de vuelta ya no depende de nada guardado en el navegador
—`localStorage`, `sessionStorage`— para saber qué compra mostrar. El token está en la URL, así que
funciona igual si el comprador vuelve en otra pestaña.

MP le pega igual su propio querystring (`?collection_id=...&status=approved&external_reference=...`),
y eso **no cambió y no se puede desactivar**. Sigue valiendo lo de siempre:

- **De ahí no se lee nada.** Son parámetros del cliente, los escribe cualquiera en la barra de
  direcciones. Dar la compra por exitosa porque dice `status=approved` es el error clásico.
- La verdad la contesta `POST /api/ordenes/{token}/reconciliar`, que es lo que hay que llamar al
  aterrizar. Si el webhook ya había llegado, no le pregunta nada a nadie y responde lo mismo que el
  GET.
- El `external_reference` es el id del intento de cobro, **no** el de la orden. No sirve para pedirle
  nada a esta API.

Para dejar la barra limpia, después de leer alcanza con `history.replaceState({}, "", location.pathname)`.

> **Ya aplicado en este repo.** Las tres rutas viven en `app/(flujo)/checkout/{exito,error,pendiente}/[[...token]]/`
> y las tres renderizan `components/compra/vuelta-del-checkout.tsx`, que limpia el querystring al
> montar. El token de la ruta es opcional (`[[...token]]`) y `lib/orden-guardada.ts` quedó como
> respaldo para las preferencias armadas antes de este cambio. La vieja `/compra/resultado` se borró.

## 8. El PDF de las entradas se puede ofrecer en la página de éxito

El endpoint no es nuevo, sólo aprendió a mostrarse además de bajarse:

```
GET /api/ordenes/{token}/entradas.pdf               → se descarga  (Content-Disposition: attachment)
GET /api/ordenes/{token}/entradas.pdf?inline=true   → se abre      (Content-Disposition: inline)
```

Mismo archivo en los dos casos, y el mismo que llega adjunto al mail: el comprador recibe las dos
cosas y no hay una versión "de la web" distinta.

**No hace falta `fetch`.** Alcanza con apuntarle un `<a href>` (o un `target="_blank"` con `inline`).
Bajándolo por JavaScript en cambio entra CORS en juego y el dominio del front tiene que estar
declarado en el backend, así que el link directo es el camino corto.

**Antes de mostrar el link, confirmar que la compra está paga.** El PDF existe recién cuando hay
entradas emitidas: al aterrizar en la página de éxito va primero
`POST /api/ordenes/{token}/reconciliar`, y el link se muestra sólo si contesta `estado: "PAGADA"`.
Pedirlo antes devuelve **404** con el `ErrorResponse` de siempre y el mensaje
`"La orden no tiene entradas emitidas"`.

Ese 404 también aparece —y es correcto que aparezca— si el equipo anuló todas las entradas de la
compra: el PDF sólo arma las vigentes, porque imprimir una butaca anulada sería mandar a alguien a un
lugar que ya se revendió.

> **Ya aplicado en este repo, con una diferencia buscada.** El link no apunta al backend sino a
> `/entradas/{token}/entradas.pdf`, un route handler de Next que pide el archivo por `lib/api.ts` y
> lo reenvía tal cual. Es una navegación del navegador igual —no hay `fetch`, no hay CORS— pero el
> navegador nunca ve dónde vive el backend, que es la regla de arquitectura del front. Los botones
> están en la pantalla de entradas, que es adonde `/checkout/exito` manda apenas `reconciliar`
> contesta `PAGADA`: ahí la compra ya está confirmada. Si el backend contesta 404 o falla, el handler
> vuelve a `/entradas/{token}?pdf=no` y la pantalla lo dice.
