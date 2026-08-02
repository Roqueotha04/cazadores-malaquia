# Cazadores Malaquía

Landing y venta online de entradas con selección de asiento para la **Cena de Cazadores
2026** (2 de octubre de 2026, 20:00). El salón son 730 asientos repartidos en 14 mesas
largas, y el comprador elige su silla en un plano, no un número suelto.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Zod · Supabase/Postgres.
Mercado Pago y Resend entran en etapas posteriores. Deploy en Vercel.

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
components/         landing/, compra/ y ui/ segun donde se usan
lib/api.ts          UNICO punto de contacto con el backend
lib/consultas.ts    lecturas, encima de api.ts
lib/acciones/       server actions (compra, pago, orden, contacto)
lib/constantes.ts   el colchon de un minuto del checkout, escrito una sola vez
sql/                esquema y seed de Postgres
```

Todo el frontend habla con `lib/consultas.ts` y `lib/acciones/`, nunca con `fetch` directo.
Cuando cambie el contrato de la API, el archivo que se toca es `lib/api.ts` y ninguno más.

**El navegador nunca habla con Supabase.** Todo pasa por server actions y route handlers, así
no hay claves de la base en el bundle del cliente.

## Base de datos

El esquema completo está en [sql/01_schema.sql](sql/01_schema.sql) y la carga inicial del
salón en [sql/02_seed.sql](sql/02_seed.sql). Nueve tablas, todo en `snake_case`, y los montos
como enteros en centavos — nunca float.

Dos decisiones que conviene conocer antes de tocar nada:

- **La identidad del comprador es el DNI, no el email.** Un matrimonio compra con el mismo
  mail y dos documentos distintos.
- **Las reservas se acceden por `token` (uuid), nunca por id**, para que nadie lea la compra
  de otro cambiando un número en la URL.

## Documentación

- [PRODUCT.md](PRODUCT.md) — qué es el producto y para quién
- [LOGICA-BACKEND.md](LOGICA-BACKEND.md) — reservas, concurrencia, pagos
- [.claude/PROYECTO.md](.claude/PROYECTO.md) — esquema, flujo de compra y etapas
- [AGENTS.md](AGENTS.md) — nota para agentes: esta versión de Next tiene breaking changes
  respecto de lo conocido, la referencia es `node_modules/next/dist/docs/`
