

### Columnas que hay que AGREGAR (no están en el schema actual)

Para Mercado Pago, en `pagos`:

```sql
mp_preference_id  text
mp_payment_id     text unique   -- único: el webhook no puede procesar el mismo pago dos veces
```

`mp_payment_id` **tiene que ser único**. Es lo que hace que un reintento de MP sea
inofensivo a nivel base, independientemente de la lógica de la app.

---

## 3. Los invariantes

Esto es el contrato. Todo lo demás es detalle de implementación.

1. **Un asiento no puede estar en dos reservas vigentes.** Un asiento `RESERVADO`
   pertenece a exactamente una reserva `ACTIVA`.
2. **Un asiento no puede tener dos entradas emitidas.** Garantizado por índice único.
3. **El monto lo calcula el servidor**, siempre, desde `evento.precio_centavos`. Nunca
   llega del cliente.
4. **Confirmar un pago es idempotente.** Llamarlo N veces produce el mismo resultado que
   llamarlo una vez: no duplica entradas ni cambia montos.
5. **Una reserva vencida no se puede pagar**, y sus asientos vuelven a estar disponibles.
6. **Nada se accede por id desde afuera**, solo por token o código uuid.
7. **Todo cambio de estado con plata de por medio deja una fila en `historial`.**
8. **Toda operación multi-paso es atómica.** O queda completa, o no pasó nada.

Si un refactor rompe uno de estos, es un bug de severidad máxima aunque los tests pasen.

---

## 4. Flujo de compra

```
1. El comprador entra a la landing y ve cuántas sillas quedan
2. Elige hasta 10 asientos en el plano
3. Carga nombre, apellido, DNI, email y celular
4. Confirma → se crea/actualiza el usuario, se crea la reserva y el pago PENDIENTE,
              los asientos pasan a RESERVADO por 30 minutos
              → redirect a /reserva/{token}
5. Paga    → redirección al checkout de Mercado Pago
6. MP confirma (webhook o reconciliador)
           → pago APROBADO, reserva PAGADA, asientos VENDIDO, se emite una entrada
             por asiento
7. El comprador ve sus entradas en /entradas/{token} y le llegan por mail
```

En cualquier punto entre 4 y 6 el comprador puede **cancelar**, y en cualquier punto se
puede **vencer** el tiempo. Los dos casos liberan los asientos.

---

## 5. Operaciones críticas

Estas tres son el corazón. **Implementarlas con SQL nativo (`JdbcTemplate` o jOOQ), no con
JPA.** El motivo está en la sección 8.

### 5.1 Tomar asientos (dentro de crear la reserva)

Todo en **una transacción**:

1. Upsert del usuario por DNI (`on conflict (dni) do update`), devolviendo el id.
2. **La toma de asientos, que es donde se resuelve la concurrencia:**

```sql
update asientos set estado = 'RESERVADO'
 where id = any(?::bigint[])
   and estado = 'DISPONIBLE'
returning id
```

3. Si `filas_devueltas != asientos_pedidos`, **alguien se adelantó**: abortar la
   transacción y devolver al comprador exactamente **cuáles** sillas perdió (las pedidas
   menos las devueltas).
4. Insertar la reserva con `expira_en = now() + make_interval(mins => ?)`.
5. Insertar las filas de `reserva_asientos`.
6. Insertar el pago `PENDIENTE` con `monto_centavos = cantidad × evento.precio_centavos`.
7. Insertar en `historial` (`RESERVA_CREADA`, con los asientos y el DNI en `datos`).

**Obligatorio:**

- El `and estado = 'DISPONIBLE'` en el UPDATE. No se lee-y-después-se-escribe: se escribe
  condicionalmente y se mira cuántas filas volvieron. Un `SELECT` para chequear
  disponibilidad seguido de un `UPDATE` **vende la misma silla dos veces** bajo
  concurrencia, y es el bug más caro posible acá.
- **Ordenar los ids ascendentemente y sin duplicados antes de la transacción.** Así dos
  compras simultáneas piden las filas en el mismo orden y no hay deadlock.
- Verificar `evento.ventas_abiertas` antes de todo.

### 5.2 Confirmar el pago

Es la función que llama el webhook de MP (y, en desarrollo, un botón de pago simulado).
Todo en **una transacción**:

```sql
select id, estado, (expira_en <= now()) as vencida
  from reservas where token = ?
  for update
```

Luego:

- Si no existe → error "no encontramos esa compra".
- Si `estado = 'PAGADA'` → **devolver OK sin hacer nada** (esta es la idempotencia).
- Si `estado != 'ACTIVA'` → error "reserva no vigente".
- Si `vencida` → error "se venció el tiempo".
- Si está bien:
  1. `pagos` → `APROBADO`, `aprobado_el = now()`
  2. `reservas` → `PAGADA`, `pagado_el = now()`
  3. `asientos` de la reserva → `VENDIDO`
  4. Insertar una `entrada` por asiento, con `on conflict (reserva_id, asiento_id) do nothing`
  5. `historial` → `COMPRA_CONFIRMADA`

**Obligatorio:**

- El `for update`. Serializa dos confirmaciones simultáneas de la misma compra: la segunda
  espera, entra, y encuentra la reserva ya `PAGADA`. Sin eso, dos webhooks de MP que llegan
  juntos emiten entradas duplicadas.
- El `on conflict do nothing` de las entradas, como segunda red.
- La comparación de vencimiento **se hace en SQL** (`expira_en <= now()`), no en Java. Si se
  sube a la app se compara el reloj del servidor contra el de la base.

### 5.3 Liberar reservas vencidas

Devuelve a la nada las reservas que pasaron su tiempo. En la implementación de referencia
corre en el camino de lectura porque en serverless no hay proceso persistente. **En Spring
esto va en un `@Scheduled` cada 30 segundos y sale del request.**

Chequeo barato primero, para no abrir una transacción al vacío:

```sql
select exists (select 1 from reservas where estado = 'ACTIVA' and expira_en <= now())
```

Si hay algo, todo en **una transacción**:

1. `update reservas set estado = 'EXPIRADA' where estado = 'ACTIVA' and expira_en <= now() returning id`
2. Los asientos `RESERVADO` de esas reservas → `DISPONIBLE`
3. Los pagos `PENDIENTE` de esas reservas → `RECHAZADO`
4. Una fila en `historial` por reserva (`RESERVA_EXPIRADA`)

**Obligatorio:** los cuatro pasos en la misma transacción. Si se corta en la mitad, los
asientos quedan tomados por una reserva ya vencida y no los libera nadie nunca más.

### 5.4 Cancelar una reserva

Misma forma que 5.3 pero para una sola reserva, disparada por el comprador:

```sql
update reservas set estado = 'CANCELADA'
 where token = ? and estado = 'ACTIVA'
returning id
```

El `and estado = 'ACTIVA'` hace la operación idempotente. Si no devolvió nada, no hacer
nada más. Si devolvió, liberar asientos, rechazar el pago pendiente y registrar en
`historial` (`RESERVA_CANCELADA`).

---

## 6. Validación de entrada

Reglas exactas de la implementación de referencia
([`lib/validacion.ts`](lib/validacion.ts)). Con Bean Validation en el DTO, más
normalización antes de persistir.

| Campo | Regla |
|---|---|
| `nombre`, `apellido` | trim, mínimo 2, máximo 60 |
| `dni` | **quitar todo lo que no sea dígito**, después validar `^\d{7,8}$`. `20.123.456` y `20123456` son la misma persona. La base tiene el mismo check |
| `email` | trim, **lowercase**, formato válido, máximo 120 |
| `celular` | quitar no-dígitos, después quitar prefijo `54`, después `0`, después `15`. Deben quedar exactamente 10 dígitos |
| `asientosIds` | enteros positivos, mínimo 1, máximo `evento.max_asientos_por_compra` (leído de la base, no hardcodeado) |

La normalización de DNI y celular importa: sin ella el mismo comprador entra dos veces con
documentos "distintos" y el upsert por DNI deja de funcionar.

---

## 7. Endpoints

El frontend Next.js se queda y consume esta API. Todo público excepto el panel de admin —
la seguridad del flujo de compra es que el token uuid no se puede adivinar.

**Lectura**

```
GET  /api/evento                     → datos del evento + asientos disponibles
GET  /api/mapa                       → evento + 14 mesas con sus sillas y estados
GET  /api/asientos?ids=1,2,3         → los elegidos, con mesa/silla/estado (para el resumen)
GET  /api/reservas/{token}           → la compra: titular, asientos, monto, estados, expira_en
GET  /api/reservas/{token}/entradas  → las entradas emitidas (vacío si no se pagó)
```

**Escritura**

```
POST /api/reservas                   → crea la compra (5.1). Devuelve el token
POST /api/reservas/{token}/cancelar  → cancela (5.4)
POST /api/pagos/preference           → crea la preference de MP, devuelve la URL del checkout
POST /api/webhooks/mercadopago       → confirma el pago (5.2)
```

**Admin** (autenticado) y **escáner**:

```
GET  /api/admin/reservas             → listado con búsqueda por DNI/email
POST /api/admin/evento               → abrir/cerrar venta, cambiar precio
POST /api/entradas/{codigo}/usar     → control de acceso en la puerta
```

El escáner es **un** endpoint, y se resuelve con el mismo patrón que la toma de asientos:

```sql
update entradas set usado_el = now()
 where codigo = ? and usado_el is null
returning codigo
```

Si devolvió una fila, pasá. Si no devolvió nada, o no existe o ya entró (hay que distinguir
los dos casos con un select posterior, para el mensaje). Esto resuelve de una la misma
entrada escaneada en dos puertas al mismo tiempo.

**Representación al comprador:** siempre **"Mesa 13 · Silla 6"**, nunca "Asiento 654". El
`numero` global existe para el personal del salón, no para el público.

---


---

## 8-bis. Lo que el frontend ya está llamando

El frontend Next.js **ya fue migrado**: no habla más con Postgres. Todo su acceso a datos
pasa por [`lib/api.ts`](lib/api.ts), [`lib/consultas.ts`](lib/consultas.ts) y
[`lib/acciones/`](lib/acciones/). Mientras no exista `API_URL` en el entorno corre con
datos de ejemplo ([`lib/fixtures.ts`](lib/fixtures.ts)).

Estas son las rutas y formas que asume hoy. **No son una imposición**: si el backend define
otras, se ajusta `lib/consultas.ts` y listo. Están acá para que el .md del backend se pueda
comparar contra algo concreto.

```
GET  /api/evento               → Evento
GET  /api/evento/disponibles   → { disponibles: number }
GET  /api/mapa                 → { evento: Evento, mesas: Mesa[] }
GET  /api/asientos?ids=1,2,3   → { id, mesa, silla, estado }[]
GET  /api/reservas/{token}          → Reserva            (404 si no existe)
GET  /api/reservas/{token}/entradas → Entrada[]          (vacío si no se pagó)
POST /api/reservas                  → { token }
POST /api/reservas/{token}/cancelar → 200
POST /api/pagos/preference          → { url }   ← a dónde mandar al comprador
```

Los tipos exactos están en [`lib/tipos.ts`](lib/tipos.ts). Supuestos del contrato:

1. JSON en **camelCase** (`precioCentavos`, `maxAsientosPorCompra`, `expiraEn`).
2. Fechas como **string ISO-8601 con offset** (`"2026-10-02T20:00:00-03:00"`). El frontend
   las convierte a `Date` en el borde.
3. Montos enteros en centavos.
4. El plano viene **anidado**: `mesas`, y dentro de cada mesa sus `asientos`.
5. Un token inexistente responde **404**, no 200 con cuerpo vacío.
6. Al rechazar una escritura, el cuerpo trae `{ error: string }`. En el 409 de crear reserva,
   además **`asientosOcupados: number[]`** — el frontend le muestra al comprador exactamente
   qué sillas perdió, así que ese campo hace falta.

Dos cosas que el frontend **ya no hace** y ahora son responsabilidad del backend:

- **Liberar reservas vencidas.** Antes barría en el camino de lectura. Ahora tiene que ser
  el `@Scheduled` de 5.3.
- **Confirmar pagos.** Se eliminó `confirmarPago` del frontend: era un agujero (cualquiera
  con un token se emitía las entradas gratis). Ahora el frontend sólo pide una URL a
  `/api/pagos/preference` y manda al comprador ahí. La aprobación la dispara únicamente el
  webhook. **Mientras Mercado Pago no esté conectado, ese endpoint puede devolver la URL de
  un pago simulado del backend: el frontend no necesita enterarse.**

---

## 9. Mercado Pago

Lo que hace la diferencia entre "funciona" y "confiable":

- **El webhook tiene que ser idempotente.** MP reintenta, duplica y a veces manda los
  eventos desordenados. `mp_payment_id` único en la base + la lógica de 5.2 lo cubren.
- **Validar la firma** del webhook antes de tocar nada.
- **Responder 200 rápido.** Si el procesamiento tarda, MP reintenta y multiplica el trabajo.
- **Hace falta un reconciliador.** Un `@Scheduled` que cada pocos minutos consulte la API
  de MP por los pagos que quedaron `PENDIENTE` con reserva ya vencida o cerca de vencer, y
  los cierre. **Sin esto, un webhook perdido es alguien que pagó $150.000 y no tiene
  entrada** — el peor modo de falla del sistema, y el único que no se puede detectar desde
  un request.

---

## 10. Lo que falta y hay que construir

No está en la implementación de referencia. No es opcional.

1. **Tests de concurrencia** (Testcontainers + JUnit + `CountDownLatch`), y son el
   entregable más importante de todos:
   - N hilos comprando el mismo asiento a la vez → exactamente uno gana, los demás reciben
     el error con las sillas correctas
   - Confirmar el mismo pago dos veces en paralelo → una sola tanda de entradas
   - Confirmar una reserva vencida → rechazado, asientos liberados
   - Cancelar dos veces → idempotente
   - La misma entrada escaneada en dos puertas → una sola pasa
2. **Rate limiting en la creación de reservas.** Hoy no hay nada: un script reserva las 730
   sillas con DNIs inventados y bloquea la venta 30 minutos, en loop. Límite por IP y por
   DNI.
3. **Observabilidad.** Hoy los errores son `console.error`. Logging estructurado y algo que
   avise cuando una confirmación de pago falla.
4. **Bug conocido a no portar:** en la implementación de referencia, un token que no es un
   UUID válido tira error de Postgres (`22P02 invalid input syntax for type uuid`) y sale
   un 500 en vez de un 404. Validar el formato del UUID antes de consultar. En Spring, con
   el parámetro tipado como `UUID`, sale un 400 solo — pero conviene que sea 404 explícito.
5. **Alinear [`.claude/PROYECTO.md`](.claude/PROYECTO.md)**, que ya documenta las columnas
   `mp_*` como si existieran. Ese documento es el activo real del proyecto; si deja de ser
   cierto, se pierde el contexto.

---

## 11. Prioridad

El evento es el **2 de octubre de 2026** y la fecha manda sobre todo lo demás. Orden:

1. Schema con Flyway
2. Operaciones 5.1 y 5.2 + sus tests de concurrencia
3. Endpoints de lectura (con esto el frontend actual ya funciona, con pago simulado)
4. Mercado Pago: preference, webhook, reconciliador
5. QR + mail de las entradas
6. Panel de admin y escáner

Del 1 al 4 tiene que estar antes de octubre. El 5 y el 6 son necesarios para el evento pero
no tienen riesgo técnico.

**Nada de arquitectura en cuatro capas ni dashboards antes de que el cobro funcione.**
