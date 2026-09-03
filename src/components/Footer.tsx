import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border py-8 text-xs text-muted">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-7">
        <div className="flex items-center gap-4">
          <span className="font-heading font-bold tracking-[0.08em] text-foreground">
            PARAGON
          </span>
          <span className="hidden sm:inline text-muted/60">·</span>
          <span className="hidden sm:inline">
            Rastreador de trofeos y logros multiplataforma
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/#faq"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            Preguntas frecuentes
          </Link>
          <Link
            href="/privacidad"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            Privacidad
          </Link>
          <span className="hidden md:inline text-muted/60">·</span>
          <span className="hidden md:inline text-[11px] text-muted/80">
            Desarrollado por <strong className="text-foreground/80">Mario García</strong>
          </span>
          <span className="hidden md:inline text-muted/60">·</span>
          <span className="hidden md:inline text-[11px] text-muted/80">
            No afiliado a Sony ni a Valve
          </span>
        </div>
      </div>
    </footer>
  );
}
