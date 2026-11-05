/**
 * Content-Security-Policy en modo SOLO INFORMAR (auditoría, 5 nov 2026).
 *
 * La CSP que se aplica de verdad (next.config.ts) es mínima a propósito:
 * con los scripts inline de Next, YouTube, Vercel Analytics, AdSense y
 * carátulas de media docena de CDNs, una estricta sin probar rompería más de
 * lo que protege. Esta otra NO bloquea nada: el navegador manda a
 * `/api/csp` lo que habría bloqueado, y queda en Admin → Registro. Cuando
 * un par de semanas de informes digan que no sale nada legítimo, se puede
 * pasar de `Content-Security-Policy-Report-Only` a `Content-Security-Policy`.
 *
 * Módulo puro: `tests/csp.test.ts`.
 */
export const DIRECTIVAS_CSP: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-inline': los scripts de arranque de Next van inline sin nonce.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://va.vercel-scripts.com",
    "https://pagead2.googlesyndication.com",
    "https://fundingchoicesmessages.google.com",
    "https://www.googletagservices.com",
    "https://www.youtube.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  // Carátulas, avatares y logros vienen de muchas CDNs (PSN, Steam, Xbox, IGDB, Epic…).
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "https:"],
  "connect-src": ["'self'", "https://vitals.vercel-insights.com", "https://*.supabase.co", "https://pagead2.googlesyndication.com", "https://fundingchoicesmessages.google.com"],
  "frame-src": [
    "'self'",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://player.twitch.tv",
    "https://player.kick.com",
    "https://googleads.g.doubleclick.net",
    "https://tpc.googlesyndication.com",
    "https://fundingchoicesmessages.google.com",
  ],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "frame-ancestors": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https://accounts.google.com", "https://discord.com", "https://steamcommunity.com", "https://www.epicgames.com"],
};

export function politicaCsp(informe = "/api/csp"): string {
  const partes = Object.entries(DIRECTIVAS_CSP).map(([d, v]) => `${d} ${v.join(" ")}`);
  partes.push(`report-uri ${informe}`);
  return partes.join("; ");
}

/** Lo útil de un informe CSP (formato viejo `csp-report` o el nuevo de Reporting API). */
export function resumenInformeCsp(cuerpo: unknown): { directiva: string; bloqueado: string; pagina: string } | null {
  const lista = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
  const primero = lista[0] as Record<string, unknown> | undefined;
  if (!primero || typeof primero !== "object") return null;
  const r = (primero["csp-report"] ?? primero["body"] ?? primero) as Record<string, unknown>;
  const directiva = String(r["effective-directive"] ?? r["effectiveDirective"] ?? r["violated-directive"] ?? "");
  const bloqueado = String(r["blocked-uri"] ?? r["blockedURL"] ?? "");
  const pagina = String(r["document-uri"] ?? r["documentURL"] ?? "");
  if (!directiva) return null;
  // Solo el origen de lo bloqueado: la ruta entera puede llevar datos de alguien.
  let origen = bloqueado;
  try {
    origen = new URL(bloqueado).origin;
  } catch {
    // "inline", "eval", "data"…: tal cual.
  }
  let ruta = pagina;
  try {
    ruta = new URL(pagina).pathname;
  } catch {
    // vacío o raro: tal cual
  }
  return { directiva: directiva.slice(0, 60), bloqueado: origen.slice(0, 120), pagina: ruta.slice(0, 120) };
}
