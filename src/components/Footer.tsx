import Link from "next/link";
import { useTranslations } from "next-intl";
import { SiInstagram, SiTiktok, SiGithub } from "@icons-pack/react-simple-icons";

export function Footer() {
  const t = useTranslations("Shell.Footer");
  return (
    <footer className="mt-auto border-t border-border py-8 text-xs text-muted">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-7">
        <div className="flex items-center gap-4">
          <span className="font-heading font-bold tracking-[0.08em] text-foreground">
            {t("marca")}
          </span>
          <span className="hidden sm:inline text-muted/60">·</span>
          <span className="hidden sm:inline">
            {t("tagline")}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link
            href="/como-funciona"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            {t("comoFunciona")}
          </Link>
          <Link
            href="/#faq"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            {t("faq")}
          </Link>
          <Link
            href="/privacidad"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            {t("privacidad")}
          </Link>
          <Link
            href="/cookies"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            {t("cookies")}
          </Link>
          <Link
            href="/terminos"
            className="font-medium text-muted hover:text-foreground transition-colors"
          >
            {t("terminos")}
          </Link>
          <span className="hidden md:inline text-muted/60">·</span>
          <span className="hidden md:flex text-[0.6875rem] text-muted/80 items-center gap-2">
            {t("desarrolladoPor")} <strong className="text-foreground/80">Mario García</strong>
            <div className="flex items-center gap-2 ml-1">
              <a href="https://www.instagram.com/mariioogrciia/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted hover:text-foreground transition-colors">
                <SiInstagram size={14} />
              </a>
              <a href="https://www.tiktok.com/@mariioogrciia" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-muted hover:text-foreground transition-colors">
                <SiTiktok size={14} />
              </a>
              <a href="https://github.com/Mariioogrciia" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted hover:text-foreground transition-colors">
                <SiGithub size={14} />
              </a>
              {/* simple-icons retiró el logo de LinkedIn: SVG propio. */}
              <a href="https://www.linkedin.com/in/mario-garc%C3%ADa-romero-453348304" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted hover:text-foreground transition-colors">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </span>
          <span className="hidden md:inline text-muted/60">·</span>
          <span className="hidden md:inline text-[0.6875rem] text-muted/80">
            {t("noAfiliado")}
          </span>
        </div>
      </div>
    </footer>
  );
}
