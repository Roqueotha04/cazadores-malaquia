"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Boton } from "@/components/ui/boton";
import { hora, ubicacion } from "@/lib/formato";
import {
  anularEntrada,
  validarEntrada,
  type EntradaValidada,
} from "@/lib/admin/acciones/puerta";
import type { EntradaInvitado, Invitado } from "@/lib/admin/tipos";
import { AccionConfirmada } from "../ui/accion-confirmada";
import { Aviso, Pildora } from "../ui/piezas";

/**
 * Una persona en la puerta, con sus entradas.
 *
 * La pantalla se usa de pie, de noche, con alguien esperando adelante. Todo lo
 * que se toca es grande, y lo que hay que leer despues de tocar —a que mesa va
 * esta persona— aparece en el tamaño mas grande de la ficha.
 */
export function FichaInvitado({ invitado }: { invitado: Invitado }) {
  const vigentes = invitado.entradas.filter(
    (e) => !e.anuladaEl && !e.usadoEl,
  ).length;

  return (
    <article className="rounded-sm border border-line bg-surface-raised">
      <header className="border-b border-line px-4 py-3.5 sm:px-5">
        <h2 className="text-lg">
          {invitado.apellido}, {invitado.nombre}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="tabular">DNI {invitado.dni}</span>
          <a href={`tel:${invitado.celular}`} className="subrayado-vivo tabular">
            {invitado.celular}
          </a>
        </p>
      </header>

      {/* Compro y no llego a pagar. Sin decirlo, esta persona se ve igual que
          quien nunca compro, y la respuesta correcta es la contraria: hubo una
          compra, quedo sin pagar, y hay algo que revisar. */}
      {invitado.tieneOrdenSinPagar && invitado.entradas.length === 0 && (
        <div className="p-4 sm:p-5">
          <Aviso tono="alerta" titulo="Compró, pero no llegó a pagar">
            Tiene una orden sin pagar y ninguna entrada emitida. No es alguien
            que nunca compró: la compra existió y quedó a medio camino.
          </Aviso>
        </div>
      )}

      {invitado.entradas.length === 0 && !invitado.tieneOrdenSinPagar && (
        <p className="px-4 py-5 text-sm text-ink-soft sm:px-5">
          Sin entradas y sin ninguna compra registrada.
        </p>
      )}

      {invitado.entradas.length > 0 && (
        <>
          <ul className="divide-y divide-line">
            {invitado.entradas.map((entrada) => (
              <Entrada key={entrada.codigo} entrada={entrada} />
            ))}
          </ul>

          <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint sm:px-5">
            {vigentes === 0
              ? "No le queda ninguna entrada por usar."
              : `${vigentes} ${vigentes === 1 ? "entrada" : "entradas"} sin usar.`}
          </p>
        </>
      )}
    </article>
  );
}

function Entrada({ entrada }: { entrada: EntradaInvitado }) {
  const [validada, setValidada] = useState<EntradaValidada | null>(null);
  const [error, setError] = useState("");
  const [validando, empezar] = useTransition();

  const anulada = entrada.anuladaEl !== null;
  const usada = entrada.usadoEl !== null;

  function validar() {
    setError("");

    empezar(async () => {
      const resultado = await validarEntrada(entrada.codigo);

      if (resultado.ok) setValidada(resultado.entrada);
      else setError(resultado.error);
    });
  }

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={
              // Tachada, no escondida: la entrada anulada tiene que verse, y
              // tiene que verse que ya no vale. Si no apareciera, la puerta no
              // sabria que esa butaca existio.
              anulada
                ? "text-ink-faint line-through"
                : "font-medium text-ink"
            }
          >
            {ubicacion(entrada.mesaNumero, entrada.asientoNumero)}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {entrada.titular}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {anulada && <Pildora tono="error">Anulada</Pildora>}
          {!anulada && usada && (
            <Pildora tono="neutro">Entró {hora(entrada.usadoEl)}</Pildora>
          )}
        </div>
      </div>

      {/* Lo que hay que leer despues de validar: a donde va esta persona. */}
      {validada && (
        <div className="mt-4 rounded-sm border border-exito/50 bg-exito/10 p-4">
          <p className="text-sm font-semibold text-exito">Entrada válida</p>
          <p className="mt-1 font-display text-2xl text-ink">
            {ubicacion(validada.mesaNumero, validada.asientoNumero)}
          </p>
          <p className="mt-0.5 text-ink-soft">{validada.titular}</p>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!anulada && !usada && !validada && (
        <div className="mt-4 flex flex-wrap items-start gap-2">
          <Boton onClick={validar} cargando={validando} disabled={validando}>
            {validando ? "Validando…" : "Validar y dejar pasar"}
          </Boton>

          <Link
            href={`/admin/puerta/${entrada.codigo}/butaca?mesa=${entrada.mesaNumero}&silla=${entrada.asientoNumero}`}
            className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-5 text-sm text-ink-soft transition-colors duration-200 hover:border-brass hover:text-ink"
          >
            Cambiar butaca
          </Link>

          <AccionConfirmada
            etiqueta="Anular"
            confirmar="Sí, anular la entrada"
            tono="fantasma"
            medida="base"
            accion={anularEntrada.bind(null, entrada.codigo)}
            motivo={{
              rotulo: "Por qué se anula",
              ayuda:
                "Queda asentado. Anular no devuelve la plata: el reintegro lo hace el equipo a mano, y esto es lo único que después explica por qué.",
              placeholder: "El invitado avisó que no viene",
            }}
            pregunta={
              <>
                La butaca{" "}
                <strong className="text-ink">
                  {ubicacion(entrada.mesaNumero, entrada.asientoNumero)}
                </strong>{" "}
                vuelve a la venta y esta entrada deja de valer. El código que
                tenga impreso o en el teléfono no va a servir más.
              </>
            }
          />
        </div>
      )}
    </li>
  );
}
