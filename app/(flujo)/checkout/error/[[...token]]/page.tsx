import type { Metadata } from "next";
import { VueltaDelCheckout } from "@/components/compra/vuelta-del-checkout";

// Lleva el token de la orden en la URL: no tiene sentido que la indexe un
// buscador.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Vuelta del checkout cuando el pago se rechazo o se cancelo. Ver `exito/`. */
export default async function CheckoutError(
  props: PageProps<"/checkout/error/[[...token]]">,
) {
  const { token } = await props.params;

  return <VueltaDelCheckout desenlace="error" tokenDeLaRuta={token?.[0]} />;
}
