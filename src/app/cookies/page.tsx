import Link from "next/link";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Cookies · Paragon" };

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-4 space-y-8">
      <BackButton fallbackHref="/" label="Volver al inicio" />

      <div className="space-y-4">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">
          Política de Cookies
        </h1>
        <p className="text-sm text-muted">Última actualización: septiembre de 2026</p>
      </div>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">La versión corta</h2>
        <p className="text-muted">
          Paragon <strong>no usa cookies de publicidad ni de analítica</strong>.
          No hay ningún píxel de rastreo, ni Google Analytics, ni redes
          sociales incrustadas que puedan seguirte. Solo hay una cookie, y es
          la que te mantiene la sesión iniciada — la analítica de uso que sí
          medimos (ver más abajo) no usa cookies ni te identifica.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">Cookie de sesión (imprescindible)</h2>
        <p className="text-muted">
          Al iniciar sesión con Google o Discord, Paragon guarda una cookie
          técnica (gestionada por Auth.js) que identifica tu sesión para que no
          tengas que volver a entrar en cada página. Es estrictamente necesaria
          para que la aplicación funcione — sin ella no se puede mantener una
          cuenta iniciada — y por eso no pide consentimiento por separado: la
          normativa de cookies (LSSI-CE, transposición de la directiva ePrivacy)
          exime a las cookies técnicas u operativas imprescindibles.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">Almacenamiento local (no son cookies)</h2>
        <p className="text-muted">
          Algunas preferencias — el tema de color, el tamaño de letra, o si ya
          cerraste este mismo aviso de cookies — se guardan con{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">localStorage</code>{" "}
          en tu propio navegador, no en una cookie ni en nuestros servidores.
          Se quedan solo en tu dispositivo, no viajan con cada petición como sí
          hace una cookie, y puedes borrarlos en cualquier momento desde los
          ajustes de tu navegador.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">Analítica de uso (Vercel Analytics)</h2>
        <p className="text-muted">
          Desde septiembre de 2026 medimos visitas agregadas (qué páginas se
          ven, desde qué país aproximado, tipo de dispositivo) con{" "}
          <a
            href="https://vercel.com/docs/analytics/privacy-policy"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent hover:underline"
          >
            Vercel Analytics
          </a>
          . No usa cookies — identifica cada visita con un hash anónimo que
          se descarta a las 24 horas, no un identificador tuyo permanente —
          y no cruza datos con ningún otro sitio, por eso no hace falta
          pedir consentimiento para esto. No sabemos qué juegos miras tú en
          concreto por esta vía: eso sale de tu cuenta, con sesión, no de
          la analítica.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">Si esto cambia</h2>
        <p className="text-muted">
          Si en el futuro Paragon incorporase publicidad o cualquier cookie
          no imprescindible, se pedirá tu consentimiento explícito antes de
          activarla y esta página se actualizará para explicarlo.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">Más información</h2>
        <p className="text-muted">
          Para saber qué datos personales se tratan y con qué finalidad, mira
          la <Link href="/privacidad" className="text-accent hover:underline">Política de Privacidad</Link>{" "}
          y los <Link href="/terminos" className="text-accent hover:underline">Términos y Condiciones</Link>.
        </p>
      </section>
    </div>
  );
}
