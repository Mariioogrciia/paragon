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
      className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-background"
      style={{ background: "var(--accent-grad)" }}
    >
      Descargar como PDF
    </button>
  );
}
