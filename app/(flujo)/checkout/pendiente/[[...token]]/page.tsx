import { VueltaDelCheckout } from "@/components/compra/vuelta-del-checkout";

/** Vuelta del checkout con un medio que tarda en acreditarse. Ver `exito/`. */
export default async function CheckoutPendiente(
  props: PageProps<"/checkout/pendiente/[[...token]]">,
) {
  const { token } = await props.params;

  return <VueltaDelCheckout desenlace="pendiente" tokenDeLaRuta={token?.[0]} />;
}
