"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { MesConTrofeos } from "@/lib/history";

const MESES_CORTOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function nombreMes(clave: string): string {
  const [, mes] = clave.split("-");
  const indice = Number(mes) - 1;
  return MESES_CORTOS[indice] ?? mes;
}

export function MonthlySummary({ meses }: { meses: MesConTrofeos[] }) {
  if (!meses || meses.length === 0) return null;

  // El último mes del array es el actual, según trofeosPorMes()
  const mesActual = meses[meses.length - 1];

  // Antes esto devolvía null a secas cuando el mes iba a 0 — la tarjeta vive
  // en una rejilla `[1fr_2.5fr]` (app/page.tsx) junto a "Tu ritmo", así que
  // ocultarla dejaba la columna izquierda entera en negro los primeros días
  // de cada mes (el caso normal, no el raro). Un estado vacío propio evita
  // el hueco muerto sin inventar un número que no existe.
  if (mesActual.total === 0) {
    return (
      <div
        className="flex h-full flex-col justify-between rounded-[20px] p-6"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            {nombreMes(mesActual.mes)}
          </p>
          <h3 className="font-heading mt-2 text-xl font-bold leading-tight text-foreground/85">
            Todavía ningún trofeo este mes
          </h3>
        </div>
        <p className="mt-4 text-sm text-muted">El primero se enseña aquí en cuanto lo consigas.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="animate-glint relative overflow-hidden rounded-[20px] p-6 text-white transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.8), rgb(var(--accent-rgb) / 0.3))",
        border: "1px solid rgb(var(--accent-rgb) / 0.4)",
        boxShadow: "0 10px 30px rgb(var(--accent-rgb) / 0.15)",
      }}
    >
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">
            Resumen de {nombreMes(mesActual.mes)}
          </p>
          <h3 className="font-heading mt-2 text-2xl font-bold leading-tight">
            Has conseguido {mesActual.total} trofeos este mes
          </h3>
        </div>
        
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">
              {mesActual.platinos > 0 
                ? `¡Incluyendo ${mesActual.platinos} platino${mesActual.platinos > 1 ? 's' : ''}!` 
                : "Sigue así para acercarte al platino."}
            </p>
          </div>
          <Link
            href={`/ritmo?mes=${mesActual.mes}`}
            className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold backdrop-blur-md transition-colors hover:bg-white/30"
          >
            Ver desglose →
          </Link>
        </div>
      </div>
      
      {/* Fondo decorativo */}
      <div 
        className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full blur-2xl pointer-events-none"
        style={{ background: "white", opacity: 0.1 }}
      />
    </motion.div>
  );
}
