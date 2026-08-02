import { VueltaDelCheckout } from "@/components/compra/vuelta-del-checkout";

/**
 * Vuelta del checkout de pago.
 *
 * La página no puede resolver nada del lado del servidor: Mercado Pago devuelve
 * al comprador a una back-url fija que no lleva el token de la orden, así que el
 * token sale del localStorage del navegador. Todo el trabajo pasa en el
 * componente de cliente.
 */
export default async function Resultado(
  props: PageProps<"/compra/resultado">,
) {
  const params = await props.searchParams;

  return (
    <VueltaDelCheckout
      tokenDeLaUrl={primero(params.token) ?? null}
      estadoProveedor={(
        primero(params.status) ??
        primero(params.collection_status) ??
        ""
      ).toLowerCase()}
    />
  );
}

function primero(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}
