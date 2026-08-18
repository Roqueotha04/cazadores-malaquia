import type { Metadata } from "next";
import { VueltaDelCheckout } from "@/components/compra/vuelta-del-checkout";

// Lleva el token de la orden en la URL: no tiene sentido que la indexe un
// buscador.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Vuelta del checkout con un medio que tarda en acreditarse. Ver `exito/`. */
export default async function CheckoutPendiente(
  props: PageProps<"/checkout/pendiente/[[...token]]">,
) {
  const { token } = await props.params;

  return <VueltaDelCheckout desenlace="pendiente" tokenDeLaRuta={token?.[0]} />;
}
