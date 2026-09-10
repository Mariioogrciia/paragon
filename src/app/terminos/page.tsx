import Link from "next/link";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Términos y Condiciones · Paragon" };

function Seccion({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
      <h2 className="text-lg font-bold text-foreground">
        {num}. {title}
      </h2>
      {children}
    </section>
  );
}

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-4 space-y-8">
      <BackButton fallbackHref="/" label="Volver al inicio" />

      <div className="space-y-4">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-muted">Última actualización: septiembre de 2026</p>
      </div>

      <Seccion num="1" title="Qué es Paragon">
        <p className="text-muted">
          Paragon es un rastreador de trofeos y logros multiplataforma,
          desarrollado y mantenido por Mario García como proyecto personal.{" "}
          <strong>No está afiliado, patrocinado ni respaldado</strong> por Sony
          Interactive Entertainment (PlayStation), Valve (Steam), Microsoft
          (Xbox), Epic Games, Ubisoft, Google, Nintendo ni ningún otro
          fabricante o plataforma mencionados en la app. Todas las marcas,
          logotipos, carátulas e imágenes de juegos pertenecen a sus
          respectivos dueños y se usan únicamente con fines informativos e
          identificativos.
        </p>
      </Seccion>

      <Seccion num="2" title="Tu cuenta">
        <p className="text-muted">
          Para usar Paragon inicias sesión con una cuenta de Google o Discord;
          no se crean contraseñas propias de Paragon. Eres responsable de la
          actividad que ocurra en tu cuenta y de mantener el acceso a tu
          proveedor de inicio de sesión bajo control. Puedes eliminar tu cuenta
          de Paragon en cualquier momento desde Ajustes.
        </p>
      </Seccion>

      <Seccion num="3" title="Datos de trofeos y de terceros">
        <p className="text-muted">
          Los datos de trofeos, logros, horas jugadas, precios y tiempos de
          finalización que enseña Paragon proceden de las plataformas de
          origen (PlayStation, Steam, Xbox) y de fuentes públicas de terceros
          (IGDB, PowerPyx, HowLongToBeat, IsThereAnyDeal, entre otras).
          <strong> Ninguna de esas fuentes es oficial ni está garantizada</strong>:
          pueden fallar, cambiar de formato o dejar de estar disponibles sin
          aviso, y Paragon no puede garantizar que la información mostrada sea
          exacta, esté completa o se actualice al instante. Para tu progreso
          real, la fuente de verdad siempre es la app oficial de cada
          plataforma.
        </p>
      </Seccion>

      <Seccion num="4" title="Contenido que publicas tú">
        <p className="text-muted">
          Reseñas, comentarios, guías y notas que publiques en zonas visibles
          para otras personas (a diferencia de tus notas privadas) siguen
          siendo tuyas, pero al publicarlas nos das permiso para mostrarlas
          dentro de Paragon. Eres el único responsable de lo que escribas: no
          se permite contenido ilegal, difamatorio, de acoso, ni spoilers sin
          avisar donde el propio formato lo pida. Podemos eliminar contenido
          que incumpla esto, o suspender una cuenta que abuse del servicio
          (spam, scraping automatizado, intentos de acceso no autorizado a
          otras cuentas).
        </p>
      </Seccion>

      <Seccion num="5" title="Uso aceptable">
        <p className="text-muted">
          Paragon es para uso personal. No está permitido intentar
          desentrañar, sobrecargar o automatizar peticiones contra el
          servicio más allá del uso normal de la interfaz, ni usar la
          plataforma para recopilar datos de otras personas con fines
          distintos a los que la propia app ofrece (comparar biblioteca,
          rankings, ligas).
        </p>
      </Seccion>

      <Seccion num="6" title="Disponibilidad del servicio">
        <p className="text-muted">
          Paragon se ofrece «tal cual», sin garantía de disponibilidad
          continua. Al depender de servicios externos que no controlamos
          (plataformas de juego, servicios de terceros para Xbox, fuentes de
          datos públicas), pueden producirse interrupciones o datos incompletos
          por causas ajenas a Paragon. Nos reservamos el derecho a modificar,
          suspender o descontinuar funciones del servicio en cualquier
          momento.
        </p>
      </Seccion>

      <Seccion num="7" title="Limitación de responsabilidad">
        <p className="text-muted">
          En la medida permitida por la ley, Paragon y su desarrollador no
          serán responsables de daños indirectos, pérdida de datos de terceros,
          ni de decisiones que tomes basándote en información (precios,
          tiempos de finalización, guías) que en última instancia procede de
          fuentes externas fuera de nuestro control.
        </p>
      </Seccion>

      <Seccion num="8" title="Cambios en estos términos">
        <p className="text-muted">
          Si estos términos cambian de forma relevante, se actualizará la
          fecha de arriba y, cuando el cambio sea importante, se avisará dentro
          de la propia aplicación. Seguir usando Paragon después de un cambio
          implica aceptarlo.
        </p>
      </Seccion>

      <Seccion num="9" title="Ley aplicable y contacto">
        <p className="text-muted">
          Estos términos se rigen por la legislación española. Para cualquier
          duda, escribe a{" "}
          <a href="mailto:mario.meca2005@gmail.com" className="text-accent hover:underline">
            mario.meca2005@gmail.com
          </a>
          . Ver también la{" "}
          <Link href="/privacidad" className="text-accent hover:underline">Política de Privacidad</Link>{" "}
          y la <Link href="/cookies" className="text-accent hover:underline">Política de Cookies</Link>.
        </p>
      </Seccion>
    </div>
  );
}
