import { Archivo, Young_Serif } from "next/font/google";

// Young Serif para titulos. Trazo grueso con remates cortados: se lee grabado,
// como una placa de laton o el programa anual de un club. Viene en un solo peso
// (400), asi que la jerarquia se hace con tamaño y nunca con font-weight: si se
// le pide bold, el navegador lo falsea y se ensucia.
export const display = Young_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--fuente-display",
  display: "swap",
});

// Archivo para interfaz, datos y cifras. Grotesca de trabajo, pensada para
// carteleria y formularios. Es variable, asi que un solo archivo cubre todos los
// pesos. Tiene cifras tabulares, que es lo que hace que el contador y los
// precios no bailen.
export const sans = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--fuente-sans",
  display: "swap",
});
