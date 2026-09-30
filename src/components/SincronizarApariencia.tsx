"use client";

import { useEffect } from "react";
import { aplicarAparienciaGuardada, type AparienciaGuardada } from "@/lib/apariencia";

/** Aplica la apariencia guardada en la cuenta al abrir la app en cualquier dispositivo (ver lib/apariencia.ts). */
export function SincronizarApariencia({ guardada, nivel }: { guardada: AparienciaGuardada | null; nivel: number }) {
  useEffect(() => {
    aplicarAparienciaGuardada(guardada, nivel);
  }, [guardada, nivel]);
  return null;
}
