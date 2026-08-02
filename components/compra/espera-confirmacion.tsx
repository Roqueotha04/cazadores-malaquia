/**
 * La pantalla mientras el backend confirma el pago.
 *
 * Este es el estado mas delicado de todo el sistema. Mercado Pago devuelve al
 * comprador al instante, pero la aprobacion real llega por webhook, despues. O
 * sea que existe una ventana en la que el pago esta hecho y el sistema todavia
 * no lo sabe.
 *
 * Si eso se le muestra como error, el comprador cree que perdio $150.000. Asi
 * que se muestra como lo que es: una espera, con el reloj a la vista y una
 * salida a WhatsApp si tarda de mas. Nunca se queda girando para siempre.
 *
 * Este componente no consulta nada: solo dibuja. Quien pregunta —y quien decide
 * cuando dejar de preguntar— es `vuelta-del-checkout.tsx`.
 */
export function EsperaConfirmacion({
  token,
  segundos,
  demorado,
}: {
  token: string;
  segundos: number;
  /** Se agotaron los reintentos y seguimos sin respuesta. */
  demorado: boolean;
}) {
  if (demorado) {
    return (
      <div className="rounded-sm border border-alerta/50 bg-alerta/10 px-5 py-5">
        <h2 className="text-ink">Está tardando más de lo normal</h2>
        <p className="mt-2 text-ink-soft">
          Tu pago puede estar acreditado igual. No vuelvas a pagar: escribinos y
          lo verificamos en el momento.
        </p>

        <a
          href={`https://api.whatsapp.com/send?phone=542923504014&text=${encodeURIComponent(
            `Hola, pagué mi entrada y no me aparece confirmada. Mi código de compra es ${token}`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-[52px] items-center gap-2 rounded-sm bg-brass px-7 py-4 font-semibold text-carbon transition-colors duration-200 hover:bg-brass-light"
        >
          Escribinos por WhatsApp
          <span aria-hidden>→</span>
        </a>

        <p className="mt-5 border-t border-alerta/30 pt-4 text-sm text-ink-faint">
          Tu código de compra, por si te lo piden:
          <br />
          <span className="mt-1 inline-block font-medium text-ink tabular select-all break-all">
            {token}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-sm border border-line bg-surface-raised px-5 py-6"
      aria-live="polite"
      aria-busy
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-5 shrink-0 animate-spin rounded-full border-2 border-brass border-t-transparent motion-reduce:animate-none"
        />
        <h2 className="text-ink">Estamos confirmando tu pago</h2>
      </div>

      <p className="mt-3 text-ink-soft">
        Ya recibimos la orden. Falta que nos llegue la confirmación, que suele
        tardar unos segundos.
      </p>

      <p className="mt-4 font-semibold text-ink">No cierres esta página.</p>

      <p className="mt-4 text-sm text-ink-faint tabular">
        Esperando… {segundos}s
      </p>
    </div>
  );
}
