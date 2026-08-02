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
 * Mercado Pago manda al comprador acá con un querystring propio. Ese
 * querystring es falsificable y no hay que creerle: la única forma honesta de
 * saber si el pago entró es preguntarle al backend, que es lo que hace
 * `reconciliar`.
 *
 * Y las back-urls no llevan el token, así que ni siquiera sabemos de qué compra
 * hablamos hasta leer el localStorage que escribió la pantalla de la reserva.
 *
 * El `status` del proveedor se usa para una sola cosa: elegir el copy mientras
 * la orden sigue ACTIVA. Quien decide es siempre el backend.
 */

const APROBADOS = ["approved", "success"];
const PENDIENTES = ["pending", "in_process", "in_mediation"];

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
  tokenDeLaUrl,
  estadoProveedor,
}: {
  /** Respaldo por si algún día las back-urls sí lo llevan. */
  tokenDeLaUrl: string | null;
  estadoProveedor: string;
}) {
  const router = useRouter();

  const [orden, setOrden] = useState<Orden | null>(null);
  const [fallo, setFallo] = useState("");
  const [segundos, setSegundos] = useState(0);

  // undefined mientras no hidratamos; null si no había nada guardado.
  const guardado = useSyncExternalStore(suscribir, tokenGuardado, enElServidor);
  const token = tokenDeLaUrl ?? guardado;

  /* Sólo se insiste cuando el proveedor dijo que aprobó: ahí sí existe la
     ventana en la que el pago está hecho y el webhook todavía no llegó. Si dijo
     rechazado, o si el medio tarda días en acreditarse, una consulta alcanza:
     repetirla dieciocho veces es castigar a Mercado Pago por nada. */
  const insistir = APROBADOS.includes(estadoProveedor);

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
          Volviste desde el pago en otro navegador o se borraron los datos de
          este. Si ya pagaste, buscá el mail que te mandamos: ahí están tus
          entradas.
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
          APROBADOS.includes(estadoProveedor)
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

  if (orden.estado === "EXPIRADA" || orden.estado === "CANCELADA") {
    return (
      <Marco titulo="Esta compra ya no está vigente">
        <div className="rounded-sm border border-alerta/50 bg-alerta/10 px-5 py-5">
          <p className="text-ink-soft">
            {orden.estado === "EXPIRADA"
              ? "Se venció el tiempo y liberamos las sillas para que las tome otra persona."
              : "La compra se canceló y las sillas volvieron a estar disponibles."}
          </p>
          <p className="mt-3 font-semibold text-ink">No se te cobró nada.</p>
        </div>
        <BotonLink href="/comprar" className="mt-8 w-full sm:w-auto">
          Volver a elegir mis sillas
        </BotonLink>
      </Marco>
    );
  }

  // De acá para abajo la orden sigue ACTIVA: el backend todavía no vio un cobro
  // aprobado. Qué mostrar depende de con qué venía la persona.

  if (PENDIENTES.includes(estadoProveedor)) {
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

  if (APROBADOS.includes(estadoProveedor) && !agotado) {
    return (
      <Marco titulo="Recibimos tu pago">
        <EsperaConfirmacion token={token} segundos={segundos} demorado={false} />
        {detalle}
      </Marco>
    );
  }

  if (APROBADOS.includes(estadoProveedor)) {
    return (
      <Marco titulo="Estamos verificando tu pago">
        <EsperaConfirmacion token={token} segundos={segundos} demorado />
        {detalle}
      </Marco>
    );
  }

  // Rechazado, cancelado, o cualquier cosa que no sea aprobado ni pendiente.
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
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
        <span className="dato">Total</span>
        <span className="font-display text-xl text-ink tabular">
          {precio(orden.totalCentavos)}
        </span>
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
