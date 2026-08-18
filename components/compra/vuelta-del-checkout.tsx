"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { EsperaConfirmacion } from "./espera-confirmacion";
import { BotonLink } from "@/components/ui/boton";
import { reconciliar } from "@/lib/acciones/orden";
import { precio, ubicacion } from "@/lib/formato";
import { tokenGuardado } from "@/lib/orden-guardada";
import type { Orden } from "@/lib/tipos";

/**
 * Vuelta del checkout de Mercado Pago.
 *
 * El token de la compra viene en la ruta —`/checkout/exito/{token}`—, así que
 * esta pantalla funciona aunque el comprador vuelva en otra pestaña o en otro
 * navegador. El localStorage quedó como respaldo para las compras que salieron
 * con una preferencia armada antes de ese cambio.
 *
 * Mercado Pago le pega igual su propio querystring
 * (`?collection_id=…&status=approved&…`) y eso no se puede desactivar. **De ahí
 * no se lee nada**: son parámetros del cliente, los escribe cualquiera en la
 * barra de direcciones, y dar la compra por buena porque dice `approved` es el
 * error clásico. Se limpian apenas carga la página y la verdad la contesta
 * `reconciliar`.
 *
 * El `desenlace` sale del path, que también escribe el navegador: se usa para
 * una sola cosa, elegir el copy mientras la orden sigue ACTIVA. Quien decide es
 * siempre el backend.
 */

export type Desenlace = "exito" | "error" | "pendiente";

/** Cada cuánto se vuelve a preguntar, contando desde que contestó la anterior. */
const CADA_MS = 5_000;
/** Cuánto se insiste antes de mandar a la persona a WhatsApp. */
const LIMITE_SEG = 90;

/* El localStorage se lee como lo que es —un almacén externo al render— y no con
   un efecto que después llama a setState. Nunca cambia mientras esta pantalla
   vive, así que no hay a qué suscribirse. */
const suscribir = () => () => {};
/** En el servidor no hay localStorage: `undefined` es "todavía no sabemos". */
const enElServidor = () => undefined;

export function VueltaDelCheckout({
  desenlace,
  tokenDeLaRuta,
}: {
  desenlace: Desenlace;
  /** El de la ruta manda; falta sólo en las back-urls viejas, sin token. */
  tokenDeLaRuta?: string;
}) {
  const router = useRouter();

  const [orden, setOrden] = useState<Orden | null>(null);
  const [fallo, setFallo] = useState("");
  const [segundos, setSegundos] = useState(0);

  // undefined mientras no hidratamos; null si no había nada guardado.
  const guardado = useSyncExternalStore(suscribir, tokenGuardado, enElServidor);
  const token = tokenDeLaRuta ?? guardado;

  /* El querystring de Mercado Pago no se usa para nada y llena la barra de
     direcciones de ruido. Se saca sin dejar entrada en el historial: el "atrás"
     tiene que volver al checkout, no a esta misma pantalla con la URL sucia. */
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  /* Sólo se insiste cuando el proveedor dijo que aprobó: ahí sí existe la
     ventana en la que el pago está hecho y el webhook todavía no llegó. Si dijo
     rechazado, o si el medio tarda días en acreditarse, una consulta alcanza:
     repetirla dieciocho veces es castigar a Mercado Pago por nada. */
  const insistir = desenlace === "exito";

  const decidido = !!fallo || (!!orden && orden.estado !== "ACTIVA");
  const agotado = segundos >= LIMITE_SEG;

  // El reloj de la espera. Se detiene cuando ya hay una respuesta.
  useEffect(() => {
    if (!token || !insistir || decidido || agotado) return;

    const id = setInterval(() => setSegundos((s) => s + 1), 1000);

    return () => clearInterval(id);
  }, [token, insistir, decidido, agotado]);

  /* Los reintentos van en serie: se espera la respuesta antes de agendar el
     siguiente. `reconciliar` puede tardar decenas de segundos porque sale a
     hablar con Mercado Pago, y encimar llamadas sólo empeora la espera. */
  useEffect(() => {
    if (!token) return;

    let vivo = true;
    let proxima: ReturnType<typeof setTimeout>;
    const hasta = Date.now() + LIMITE_SEG * 1000;

    async function preguntar(token: string) {
      const resultado = await reconciliar(token);

      if (!vivo) return;

      if (!resultado.ok) {
        setFallo(resultado.error);
        return;
      }

      setOrden(resultado.datos);

      // Cualquier estado que no sea ACTIVA ya es definitivo.
      if (resultado.datos.estado !== "ACTIVA") return;
      if (!insistir || Date.now() >= hasta) return;

      proxima = setTimeout(() => preguntar(token), CADA_MS);
    }

    preguntar(token);

    return () => {
      vivo = false;
      clearTimeout(proxima);
    };
  }, [token, insistir]);

  // El pago entró: las entradas existen y son la pantalla de éxito de verdad.
  useEffect(() => {
    if (orden?.estado === "PAGADA") router.replace(`/entradas/${orden.token}`);
  }, [orden, router]);

  if (token === undefined) {
    return (
      <Marco titulo="Buscando tu compra">
        <p className="text-lg text-ink-soft">Un segundo…</p>
      </Marco>
    );
  }

  if (token === null) {
    return (
      <Marco titulo="No encontramos tu compra">
        <p className="text-lg text-ink-soft">
          El link con el que volviste no trae el código de la compra y en este
          navegador no quedó guardado. Si ya pagaste, buscá el mail que te
          mandamos: ahí están tus entradas, con el PDF adjunto.
        </p>
        <BotonLink href="/" className="mt-8 w-full sm:w-auto">
          Volver al inicio
        </BotonLink>
      </Marco>
    );
  }

  if (fallo) {
    return (
      <Marco titulo="No pudimos verificar tu pago">
        <div className="rounded-sm border border-error/50 bg-error/10 px-5 py-5">
          <p className="text-ink-soft">{fallo}</p>
          <p className="mt-3 font-semibold text-ink">
            No vuelvas a pagar. Si te cobraron, escribinos con este código y lo
            resolvemos:
          </p>
          <p className="mt-2 text-sm text-ink tabular select-all break-all">
            {token}
          </p>
        </div>
        <BotonLink href="/" className="mt-8 w-full sm:w-auto">
          Volver al inicio
        </BotonLink>
      </Marco>
    );
  }

  /* Todavía no contestó el backend. Mientras no conteste no hay nada que
     afirmar: decirle "el pago no se completó" a alguien que acaba de pagar,
     aunque sea por un segundo, es el peor error que puede cometer esta
     pantalla. Se espera. */
  if (!orden) {
    return (
      <Marco
        titulo={
          desenlace === "exito"
            ? "Recibimos tu pago"
            : "Estamos verificando tu compra"
        }
      >
        <EsperaConfirmacion
          token={token}
          segundos={segundos}
          demorado={agotado}
        />
      </Marco>
    );
  }

  if (orden.estado === "PAGADA") {
    return (
      <Marco titulo="Pago confirmado">
        <p className="text-lg text-ink-soft">Te llevamos a tus entradas…</p>
      </Marco>
    );
  }

  const detalle = <Detalle orden={orden} />;

  if (orden.estado === "EXPIRADA") {
    return (
      <Marco titulo="Esta compra ya no está vigente">
        <div className="rounded-sm border border-alerta/50 bg-alerta/10 px-5 py-5">
          <p className="text-ink-soft">
            Se venció el tiempo y liberamos las sillas para que las tome otra
            persona.
          </p>
          <p className="mt-3 font-semibold text-ink">No se te cobró nada.</p>
        </div>
        <BotonLink href="/comprar" className="mt-8 w-full sm:w-auto">
          Volver a elegir mis sillas
        </BotonLink>
      </Marco>
    );
  }

  /* Una compra cancelada no se convierte en pagada nunca más, ni aunque el cobro
     entre después: el backend deja de preguntarle a Mercado Pago apenas la orden
     sale de ACTIVA. Y el cobro puede haber entrado igual —Checkout Pro deja
     seguir pagando en la pestaña que quedó abierta—, así que acá no se puede
     afirmar que no se cobró nada. Queda registrado del otro lado y el reintegro
     lo hace el equipo a mano; lo único honesto es decirlo y dar el código. */
  if (orden.estado === "CANCELADA" || orden.estado === "ANULADA") {
    return (
      <Marco titulo="Esta compra ya no está vigente">
        <div className="rounded-sm border border-alerta/50 bg-alerta/10 px-5 py-5">
          <p className="text-ink-soft">
            {orden.estado === "CANCELADA"
              ? "La compra se canceló y las sillas volvieron a estar disponibles."
              : "Dimos de baja esta compra y las sillas volvieron a estar disponibles."}
          </p>
          <p className="mt-3 font-semibold text-ink">
            Si te llegaron a cobrar, escribinos con este código y te devolvemos
            la plata:
          </p>
          <p className="mt-2 text-sm text-ink tabular select-all break-all">
            {token}
          </p>
        </div>
        <BotonLink href="/comprar" className="mt-8 w-full sm:w-auto">
          Volver a elegir mis sillas
        </BotonLink>
      </Marco>
    );
  }

  // De acá para abajo la orden sigue ACTIVA: el backend todavía no vio un cobro
  // aprobado. Qué mostrar depende de con qué venía la persona.

  if (desenlace === "pendiente") {
    return (
      <Marco titulo="Tu pago está en camino">
        <div className="rounded-sm border border-alerta/50 bg-alerta/10 px-5 py-5">
          <p className="text-ink-soft">
            Elegiste un medio que tarda en acreditarse. Cuando el pago se
            confirme te emitimos las entradas y te avisamos por mail a{" "}
            <span className="font-medium text-ink">{orden.usuario.email}</span>.
          </p>
          <p className="mt-3 font-semibold text-ink">
            Guardá este link: acá van a aparecer tus entradas.
          </p>
        </div>
        {detalle}
        <p className="mt-6 text-sm text-ink-faint">
          Mientras el pago no se acredite, tus sillas no quedan aseguradas.
        </p>
      </Marco>
    );
  }

  if (desenlace === "exito" && !agotado) {
    return (
      <Marco titulo="Recibimos tu pago">
        <EsperaConfirmacion token={token} segundos={segundos} demorado={false} />
        {detalle}
      </Marco>
    );
  }

  if (desenlace === "exito") {
    return (
      <Marco titulo="Estamos verificando tu pago">
        <EsperaConfirmacion token={token} segundos={segundos} demorado />
        {detalle}
      </Marco>
    );
  }

  // `desenlace === "error"`: rechazado o cancelado antes de terminar.
  return (
    <Marco titulo="El pago no se completó">
      <div className="rounded-sm border border-error/50 bg-error/10 px-5 py-5">
        <p className="text-ink-soft">
          No se te cobró nada. Puede haber sido un problema con la tarjeta o el
          pago se canceló antes de terminar.
        </p>
      </div>

      {detalle}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <BotonLink href={`/reserva/${token}`} className="w-full sm:w-auto">
          Probar de nuevo
        </BotonLink>
        <BotonLink href="/comprar" tono="secundario">
          Elegir otras sillas
        </BotonLink>
      </div>

      <p className="mt-4 text-sm text-ink-faint">
        Si tu reserva todavía está vigente, seguís teniendo esas sillas
        guardadas.
      </p>
    </Marco>
  );
}

function Detalle({ orden }: { orden: Orden }) {
  const cantidad = orden.butacas.length;
  const conTarifa = orden.tarifaServicioUnitarioCentavos > 0;
  const entradasCentavos =
    (orden.precioUnitarioCentavos - orden.tarifaServicioUnitarioCentavos) *
    cantidad;
  const tarifaCentavos = orden.tarifaServicioUnitarioCentavos * cantidad;

  return (
    <div className="mt-8 rounded-sm border border-line bg-surface-raised px-5 py-4">
      <p className="dato">Tu compra</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {orden.butacas.map((butaca) => (
          <li
            key={butaca.asientoId}
            className="rounded-sm bg-surface-sunken px-3 py-2 text-sm font-medium tabular"
          >
            {ubicacion(butaca.mesaNumero, butaca.numero)}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-line pt-3.5">
        {conTarifa && (
          <>
            <div className="flex items-baseline justify-between gap-4 text-sm text-ink-soft">
              <span>{cantidad === 1 ? "Entrada" : "Entradas"}</span>
              <span className="tabular">{precio(entradasCentavos)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4 text-sm text-ink-soft">
              <span>Tarifa de servicio</span>
              <span className="tabular">{precio(tarifaCentavos)}</span>
            </div>
          </>
        )}
        <div
          className={`flex items-baseline justify-between gap-4 ${conTarifa ? "mt-2 border-t border-line pt-2" : ""}`}
        >
          <span className="dato">Total</span>
          <span className="font-display text-xl text-ink tabular">
            {precio(orden.totalCentavos)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Marco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="mb-8">{titulo}</h1>
      {children}
    </div>
  );
}
