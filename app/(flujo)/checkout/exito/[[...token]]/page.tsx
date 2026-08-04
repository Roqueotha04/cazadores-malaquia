import { VueltaDelCheckout } from "@/components/compra/vuelta-del-checkout";

/**
 * Vuelta del checkout cuando Mercado Pago dice que aprobo.
 *
 * La ruta la arma el backend por cada pago (`mp.front-url` + este path) y lleva
 * el token de la orden adentro. **El path es un acuerdo entre los dos
 * proyectos**: si cambia aca, hay que avisar del otro lado, porque el backend no
 * tiene forma de enterarse solo.
 *
 * El token es opcional en la ruta a proposito: las preferencias armadas antes de
 * este cambio vuelven a `/checkout/exito` pelado, y esas siguen cayendo en el
 * respaldo del localStorage.
 *
 * Que diga "exito" no significa nada todavia: eso lo escribe el navegador y solo
 * elige el copy. Quien decide es el backend, en `reconciliar`.
 */
export default async function CheckoutExito(
  props: PageProps<"/checkout/exito/[[...token]]">,
) {
  const { token } = await props.params;

  return <VueltaDelCheckout desenlace="exito" tokenDeLaRuta={token?.[0]} />;
}
