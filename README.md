# Cazadores Malaquía

Landing y venta online de entradas con selección de asiento para la **Cena de Cazadores
2026** (2 de octubre de 2026, 20:00). El salón son 730 asientos repartidos en 14 mesas
largas, y el comprador elige su silla en un plano, no un número suelto.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Zod, contra un backend
**Spring Boot / Kotlin** que vive en otro repo y es el único que toca
Supabase/Postgres. Mercado Pago y Resend ya están integrados de ese lado.
Deploy en Vercel, todavía sin hacer.

## Arrancar

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>.

**Hace falta el backend arriba.** Ya no hay datos de ejemplo: todo sale de la API, que es
la única fuente de la verdad. La única variable de entorno es su URL:

```bash
# .env.local
API_URL=http://localhost:8080
```

Sin `API_URL` el build corre igual —ninguna pantalla de datos se prerenderiza— pero al
abrirlas fallan. El contrato de la API está en
[.claude/api-frontend.md](.claude/api-frontend.md).

## Cómo está organizado

```
app/(landing)/      la vitrina: hero, sobre nosotros, entradas, contacto
app/(flujo)/        el embudo de compra: plano -> datos -> pago -> entradas
app/admin/          el panel: ordenes, ventas a mano, puerta, casos, evento
components/         landing/, compra/, salon/, admin/ y ui/ segun donde se usan
lib/api.ts          UNICO punto de contacto con el backend
lib/consultas.ts    lecturas, encima de api.ts
lib/acciones/       server actions (compra, pago, orden, contacto)
lib/admin/          lo mismo para el panel, con Authorization: Bearer
lib/constantes.ts   el colchon de un minuto del checkout
proxy.ts            middleware de Next 16: chequeo de cookie en /admin/**
sql/                esquema y seed de Postgres
```

Todo el frontend habla con `lib/consultas.ts` y `lib/acciones/`, nunca con `fetch` directo.
Cuando cambie el contrato de la API, el archivo que se toca es `lib/api.ts` y ninguno más.

**El navegador nunca habla con el backend ni con Supabase.** Todo sale del servidor de
Next: `lib/api.ts` importa `server-only`, así que no hay forma de que se filtre al bundle
del cliente. Tampoco hay claves de la base acá — el backend es el único que la toca.

## Base de datos

El esquema completo está en [sql/01_schema.sql](sql/01_schema.sql) y la carga inicial del
salón en [sql/02_seed.sql](sql/02_seed.sql). Nueve tablas, todo en `snake_case`, y los montos
como enteros en centavos — nunca float.

Es la fuente canónica del esquema, pero **este repo no lo aplica ni se conecta a la base**:
lo hace el backend. Acá está para poder leerlo sin cambiar de repositorio.

Dos decisiones que conviene conocer antes de tocar nada:

- **La identidad del comprador es el DNI, no el email.** Un matrimonio compra con el mismo
  mail y dos documentos distintos.
- **Las reservas se acceden por `token` (uuid), nunca por id**, para que nadie lea la compra
  de otro cambiando un número en la URL.

## Documentación

- [CLAUDE.md](CLAUDE.md) — **la referencia de arquitectura**: mapa del repo, convenciones,
  sistema visual, invariantes y los acoples con el backend. Si algo de acá y de ahí no
  coinciden, manda CLAUDE.md
- [PRODUCT.md](PRODUCT.md) — qué es el producto y para quién
- [LOGICA-BACKEND.md](LOGICA-BACKEND.md) — reservas, concurrencia, pagos
- [.claude/api-frontend.md](.claude/api-frontend.md) y
  [.claude/api-admin-frontend.md](.claude/api-admin-frontend.md) — los dos contratos de la API
- [.claude/PROYECTO.md](.claude/PROYECTO.md) — spec original: datos del evento, salón y
  etapas. **Ojo**: su arquitectura está desactualizada (describe postgres.js directo, sin
  el backend Spring)
- [AGENTS.md](AGENTS.md) — nota para agentes: esta versión de Next tiene breaking changes
  respecto de lo conocido, la referencia es `node_modules/next/dist/docs/`
