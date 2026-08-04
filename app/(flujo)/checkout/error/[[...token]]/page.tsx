import { VueltaDelCheckout } from "@/components/compra/vuelta-del-checkout";

/** Vuelta del checkout cuando el pago se rechazo o se cancelo. Ver `exito/`. */
export default async function CheckoutError(
  props: PageProps<"/checkout/error/[[...token]]">,
) {
  const { token } = await props.params;

  return <VueltaDelCheckout desenlace="error" tokenDeLaRuta={token?.[0]} />;
}
