"use client";

import { useEffect } from "react";
import { avisarContador } from "@/components/ContadorVisitas";

/** Apunta en Admin → Analítica qué dirección ha dado "no encontrado" (21 oct 2026). */
export function Contador404() {
  useEffect(() => {
    avisarContador({ k: "404", r: location.pathname });
  }, []);
  return null;
}
