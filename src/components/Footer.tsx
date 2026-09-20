import Link from "next/link";
import { SiInstagram, SiTiktok, SiGithub } from "@icons-pack/react-simple-icons";

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
            href="/como-funciona"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            Cómo funciona
          </Link>
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
          <Link
            href="/cookies"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            Cookies
          </Link>
          <Link
            href="/terminos"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            Términos
          </Link>
          <span className="hidden md:inline text-muted/60">·</span>
          <span className="hidden md:flex text-[0.6875rem] text-muted/80 items-center gap-2">
            Desarrollado por <strong className="text-foreground/80">Mario García</strong>
            <div className="flex items-center gap-2 ml-1">
              <a href="https://www.instagram.com/mariioogrciia/" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground transition-colors">
                <SiInstagram size={14} />
              </a>
              <a href="https://www.tiktok.com/@mariioogrciia" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground transition-colors">
                <SiTiktok size={14} />
              </a>
              <a href="https://github.com/Mariioogrciia" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground transition-colors">
                <SiGithub size={14} />
              </a>
            </div>
          </span>
          <span className="hidden md:inline text-muted/60">·</span>
          <span className="hidden md:inline text-[0.6875rem] text-muted/80">
            No afiliado a Sony ni a Valve
          </span>
        </div>
      </div>
    </footer>
  );
}
