import type { AbstractIntlMessages } from "next-intl";

/**
 * Qué parte de los mensajes viaja al navegador (`NextIntlClientProvider` en
 * app/layout.tsx). Auditoría de rendimiento, 28 sept 2026: antes se mandaban
 * TODOS (~110 KB en español) serializados en el HTML de CADA página — casi
 * la mitad del peso del documento —, incluidos los textos largos de
 * páginas de servidor (Cómo funciona, Cookies, Admin, Entrar...) que ningún
 * componente de cliente llega a leer.
 *
 * La lista cubre cada namespace que aparece en un `useTranslations(...)` en
 * cualquier archivo, sea de cliente o no: un componente sin "use client"
 * importado desde uno que sí lo es también se ejecuta en el navegador, así
 * que quedarse solo con los "use client" podría romperlo. Lo que queda fuera
 * es lo que solo se lee con `getTranslations` (servidor), que no necesita
 * el proveedor.
 *
 * Al añadir un `useTranslations("Nuevo.namespace")` fuera de esta lista,
 * `npx tsx scripts/comprobar-namespaces-cliente.mts` lo detecta.
 */
export const NAMESPACES_CLIENTE = [
  "Analitica.activityFeed",
  "Analitica.activityHeatmap",
  "Analitica.activityStats",
  "Analitica.calculadoraNivel",
  "Analitica.deudaBacklog",
  "Analitica.dietaGamer",
  "Analitica.eficienciaPersonal",
  "Analitica.historicalTimeline",
  "Analitica.hourlyHeatmap",
  "Analitica.monthlySummary",
  "Analitica.planificador",
  "Analitica.playtimeBarChart",
  "Analitica.playtimeComparison",
  "Analitica.priceHistoryChart",
  "Analitica.ritmoPage",
  "Analitica.statCharts",
  "Analitica.statusBadge",
  "Analitica.talDiaComoHoy",
  "Analitica.trophyDnaRadar",
  "Analitica.trophyHistory",
  "Analitica.trophyRecommendations",
  "Analitica.trophyTimeline",
  "Analitica.trophyTree",
  "Biblioteca",
  "Descubrir.CardCarousel",
  "Descubrir.DiscoverSearch",
  "Descubrir.DescubrirPage.matriz",
  "Descubrir.EsportsHub",
  "Descubrir.GamePassCatalog",
  "Descubrir.HeroCarousel",
  "Descubrir.UpcomingGames",
  "Onboarding",
  "Perfil",
  "Shell.BackButton",
  "Shell.ConfirmForm",
  "Shell.CookieBanner",
  "Shell.CustomSelect",
  "Shell.Dropdown",
  "Shell.Footer",
  "Shell.Header",
  "Shell.Home",
  "Shell.HunterGame",
  "Shell.Offline",
  "Shell.Sesiones",
] as const;

export function mensajesCliente(mensajes: AbstractIntlMessages): AbstractIntlMessages {
  const resultado: AbstractIntlMessages = {};
  for (const ruta of NAMESPACES_CLIENTE) {
    const partes = ruta.split(".");
    let origen: AbstractIntlMessages | string | undefined = mensajes;
    for (const parte of partes) origen = typeof origen === "object" ? origen[parte] : undefined;
    if (origen === undefined) continue;

    let destino = resultado;
    for (const parte of partes.slice(0, -1)) {
      const siguiente = destino[parte];
      destino = (typeof siguiente === "object" ? siguiente : (destino[parte] = {})) as AbstractIntlMessages;
    }
    destino[partes[partes.length - 1]] = origen;
  }
  return resultado;
}
