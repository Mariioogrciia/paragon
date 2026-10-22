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
  // "Biblioteca", "Onboarding" y "Perfil" van por partes (22 oct 2026):
  // enteros eran 78 KB en el HTML de cada página y los componentes de
  // cliente usan menos de la mitad. El script de arriba comprueba cada
  // `t("parte.clave")` contra esta lista.
  "Biblioteca.AcquisitionEditor",
  "Biblioteca.AddManualGameModal",
  "Biblioteca.AutoSyncJuego",
  "Biblioteca.CarpetasManager",
  "Biblioteca.CollapsibleSection",
  "Biblioteca.CommunityDifficulty",
  "Biblioteca.FavoritePicker",
  "Biblioteca.FiltroEstadoAnimo",
  "Biblioteca.FocusMode",
  "Biblioteca.GameCard",
  "Biblioteca.GameLanguages",
  "Biblioteca.GameNotes",
  "Biblioteca.GameVideos",
  "Biblioteca.GameWishlistCard",
  "Biblioteca.HltbCard",
  "Biblioteca.IgnorarHoras",
  "Biblioteca.JuegoPage",
  "Biblioteca.LibraryGrid",
  "Biblioteca.ManualGameStatus",
  "Biblioteca.NuevaGuiaForm",
  "Biblioteca.Pegi",
  "Biblioteca.PinGameButton",
  "Biblioteca.PinnedGameBanner",
  "Biblioteca.RespuestaGuiaForm",
  "Biblioteca.SaludSincronizacion",
  "Biblioteca.TrophyCountRow",
  "Biblioteca.TrophyGuideModal",
  "Biblioteca.TrophyIcon",
  "Biblioteca.TrophyList",
  "Onboarding.ajustesNav",
  "Onboarding.ajustesPlataformas",
  "Onboarding.appearanceSettings",
  "Onboarding.asistente",
  "Onboarding.avisoPublico",
  "Onboarding.avisos",
  "Onboarding.completarSteam",
  "Onboarding.firma",
  "Onboarding.forms",
  "Onboarding.importLibraryModal",
  "Onboarding.privacyGuide",
  "Onboarding.profileForm",
  "Onboarding.pushToggle",
  "Onboarding.themeCustomizer",
  "Onboarding.trofeoDesbloqueado",
  "Perfil.AvisoAtasco",
  "Perfil.Badges",
  "Perfil.ClanPage",
  "Perfil.CompararFiltrable",
  "Perfil.ComparePairGames",
  "Perfil.CompartirImagen",
  "Perfil.CompartirImagenWrap",
  "Perfil.DescargarPdfButton",
  "Perfil.EfectosNombre",
  "Perfil.FiltroJuegosComunes",
  "Perfil.LigasPage",
  "Perfil.PerfilPage",
  "Perfil.ProfileSectionOrderEditor",
  "Perfil.ProfileTabsNav",
  "Perfil.ReservarHitoButton",
  "Perfil.RetosAmigos",
  "Perfil.ReviewEditor",
  "Perfil.SalonDeLaVerguenza",
  "Perfil.ScreenshotStrip",
  "Perfil.Stars",
  "Perfil.TituloEspecial",
  "Perfil.Titulos",
  "Perfil.Vitrinas",
  "Perfil.WrapStories",
  "Perfil.WrapStoriesButton",
  "Perfil.compartirPlatino",
  "Shell.Declarado",
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
  "Descubrir.CardCarousel",
  "Descubrir.DiscoverSearch",
  "Descubrir.DescubrirPage.matriz",
  "Descubrir.EsportsHub",
  "Descubrir.EsportsPartido",
  "Descubrir.GamePassCatalog",
  "Descubrir.HeroCarousel",
  "Descubrir.UpcomingGames",
  "Shell.BackButton",
  "Shell.ConfirmForm",
  "Shell.CookieBanner",
  "Shell.Error",
  "Shell.Footer",
  "Shell.Header",
  "Shell.Home",
  "Shell.HunterGame",
  "Shell.Offline",
  "Shell.Selector",
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
