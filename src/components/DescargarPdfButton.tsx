"use client";

/**
 * "Descargar como PDF" sin generar nada en el servidor: el diálogo de
 * impresión del propio navegador, con `@media print` (globals.css) quitando
 * la cabecera y el pie de sitio. Se evita así meter una dependencia pesada
 * de generación de PDF (tipo puppeteer) en una función serverless del plan
 * Hobby solo para esto.
 */
export function DescargarPdfButton() {
  return (
    <button
      onClick={() => window.print()}
      data-no-print
      className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(88,167,255,0.4)] active:translate-y-0"
      style={{ background: "var(--accent-grad)" }}
    >
      Descargar como PDF
    </button>
  );
}
