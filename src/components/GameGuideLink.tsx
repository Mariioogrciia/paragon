/**
 * Enlace a una guía completa del juego — fuera de Paragon, a propósito.
 *
 * Por qué no una guía propia escrita por la comunidad: esa función YA
 * existe (`/juego/[id]/guias`, un foro tipo hilo) y tiene 0 filas en
 * producción — con pocos usuarios, nadie se pone a escribir "mejor armadura
 * de X" para cada juego. Y a diferencia de los trofeos perdibles (donde
 * PowerPyx cubre casi todo con un formato consistente), no hay una fuente
 * única para "mejor arma/armadura": cada juego tiene su propia wiki, con su
 * propio formato, y muchos géneros (plataformas, puzzle) ni tienen ese
 * concepto. Sin un scraper universal razonable, la opción honesta es
 * enlazar a una búsqueda real en vez de fingir que la tenemos nosotros.
 *
 * No se apunta a un sitio fijo (IGN, Fextralife...) porque cuál es la mejor
 * guía varía por juego — un buscador ya resuelve eso solo, normalmente con
 * la wiki correcta (Fextralife para souls-likes, IGN o la wiki oficial para
 * el resto) como primer resultado.
 */
export function GameGuideLink({ title }: { title: string }) {
  const query = encodeURIComponent(`${title} guía completa mejores armas y armadura`);
  const href = `https://www.google.com/search?q=${query}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center gap-3 rounded-2xl p-5 transition-colors hover:bg-white/5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--surface-2)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">Guía completa del juego</span>
        <span className="block text-xs text-muted">Mejores armas, armadura y más — en un sitio externo</span>
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    </a>
  );
}
