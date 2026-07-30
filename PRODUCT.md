# Product

## Register

brand

## Users

Cazadores y allegados del círculo de la Armería Bonifacio Malaquía, en Argentina. Unos 700
compradores a lo largo de un mes, para una cena de 730 lugares que se hace una vez al año.

Contexto de uso:

- **Mayormente desde el celular.** El plano del salón y el formulario se diseñan mobile-first,
  no como reducción del desktop.
- **Edad mixta, con mucha gente de 50 a 70+.** Tipografía base más grande de lo habitual,
  targets de 44px mínimo, contraste por encima del mínimo de AA.
- **Poca costumbre de comprar online.** Necesitan saber en qué paso están, cuánto falta y qué
  pasa si se equivocan. La duda mata la compra más que el precio.

El trabajo a hacer: elegir una silla concreta —no "una entrada"— junto a la gente con la que
quieren sentarse, y pagar sin miedo a perder el lugar.

## Product Purpose

Vender las 730 entradas de la cena anual y reemplazar la venta a mano (mensajes, planillas,
plata en efectivo) por un flujo donde cada quien elige su silla exacta y se lleva su
comprobante. Éxito es el salón lleno y cero conflictos de "esa silla era mía".

Un ticket de $150.000 ARS no se compra por impulso: la web tiene que dar confianza antes de
pedir el DNI.

## Brand Personality

**Tradición · oficio · pertenencia.**

El rito anual de un grupo que se conoce, respaldado por el oficio de una armería con nombre
propio. La web habla como quien organiza esto desde hace años: sin apuro, sin vender humo, con
los datos a la vista. Primera persona del plural — "nos juntamos", "te avisamos" — porque el
que compra ya es parte.

Lo que tiene que evocar: pertenencia y solidez. No urgencia artificial, no exclusividad de
club cerrado.

## Anti-references

- **Estética militar o táctica.** Camuflado, stencil, negro agresivo, tipografía de esténcil.
  Es el riesgo más cercano por venir de una armería, y para una cena de comunidad es el tono
  equivocado. La caza acá es la excusa para juntarse, no una demostración de fuerza.
- **SaaS moderno.** Degradados, glassmorphism, métricas gigantes con etiquetita chica,
  grillas de tarjetas idénticas con ícono + título + texto.
- **Web de evento genérica.** Aunque no se descartó explícitamente, choca con la
  personalidad: tipografía script, adornos, contadores gigantes, tarjetas todas iguales.

## Design Principles

1. **La silla es el producto.** Al comprador se le habla siempre de "Mesa 13 · Silla 6", nunca
   de "Asiento 654" ni de "1 entrada". Toda la interfaz refuerza que eligió un lugar físico en
   una mesa real.
2. **Decir el estado, no esconderlo.** Cuántas sillas quedan, cuánto tiempo tiene la reserva,
   qué pasó cuando algo falla. Este público no perdona la ambigüedad, y la reserva de 30
   minutos obliga a ser explícito.
3. **Confianza antes del DNI.** Los datos duros (fecha, precio, lugares, quiénes somos) van
   antes de pedir información personal. Nada de pedir el documento en la primera pantalla.
4. **Un solo camino por pantalla.** En el flujo de compra hay una acción principal y está
   obvia. Las salidas existen pero no compiten.
5. **El registro cambia según la superficie.** La landing (`/`) es **brand**: el diseño es el
   producto y puede tener peso y personalidad. El flujo de compra (`/comprar`,
   `/comprar/datos`, `/reserva`, `/entradas`) es **product**: el diseño sirve a la tarea y se
   corre del camino. Un mismo sistema de tokens, dos registros de aplicación.

## Accessibility & Inclusion

- **WCAG 2.1 AA como piso, no como techo.** Por el rango de edad, el texto de cuerpo apunta a
  7:1 donde se pueda, y nunca menos de 4.5:1.
- **Targets de 44×44px mínimo.** Crítico en el plano del salón: 730 sillas en una pantalla de
  teléfono es el punto más difícil de todo el proyecto.
- **El color nunca solo.** Ya resuelto para las sillas con la utility `rayada` (el
  libre/ocupado es el mismo color con daltonismo rojo-verde). El mismo criterio aplica a
  cualquier estado nuevo.
- **`prefers-reduced-motion` obligatorio** en toda animación que se agregue.
- **Se puede comprar sin JavaScript.** El formulario es una server action con `useActionState`;
  esa propiedad no se pierde en el rediseño.
