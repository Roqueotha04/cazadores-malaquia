"use client";

import { useEffect } from "react";
import { recordarToken } from "@/lib/orden-guardada";

/**
 * Guarda el token de la orden en el navegador, apenas el comprador llega a la
 * pantalla de pago.
 *
 * Mercado Pago devuelve a una back-url fija que no lleva el token, y sin token
 * no hay forma de preguntar si el pago entro. Este componente no dibuja nada:
 * existe solo para que la vuelta del checkout tenga con que trabajar.
 */
export function RecordarOrden({ token }: { token: string }) {
  useEffect(() => {
    recordarToken(token);
  }, [token]);

  return null;
}
