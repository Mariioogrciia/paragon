import Link from "next/link";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Privacidad · Paragon" };

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

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-4 space-y-8">
      <BackButton fallbackHref="/" label="Volver al inicio" />

      <div className="space-y-4">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">
          Política de Privacidad
        </h1>
        <p className="text-sm text-muted">Última actualización: septiembre de 2026</p>
      </div>

      <Seccion num="1" title="Quién trata tus datos">
        <p className="text-muted">
          Paragon es un proyecto personal de <strong>Mario García</strong>, no una
          empresa. A efectos del Reglamento General de Protección de Datos
          (RGPD), Mario García es el responsable del tratamiento de los datos
          que se describen aquí. Puedes escribir a{" "}
          <a href="mailto:mario.meca2005@gmail.com" className="text-accent hover:underline">
            mario.meca2005@gmail.com
          </a>{" "}
          para cualquier duda o para ejercer tus derechos (sección 6).
        </p>
      </Seccion>

      <Seccion num="2" title="Qué datos recopilamos">
        <p>Solo lo que hace falta para que el servicio funcione:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-muted">
          <li>
            <strong>Al crear tu cuenta:</strong> nombre, correo electrónico y
            foto de perfil que nos entrega Google o Discord al iniciar sesión
            con ellos (son los únicos dos proveedores de acceso; Paragon nunca
            ve ni guarda tu contraseña de esos servicios).
          </li>
          <li>
            <strong>Al vincular una plataforma de juego</strong> (PlayStation,
            Steam, Xbox, y las que en el futuro se puedan vincular de verdad):
            tu identificador público en esa plataforma, y los datos que esa
            plataforma hace públicos con él — biblioteca de juegos, trofeos o
            logros, horas jugadas y nivel. Se lee con credenciales del
            servidor, nunca con las tuyas: vincular es decir «este soy yo ahí»,
            no dar acceso a tu cuenta.
          </li>
          <li>
            <strong>Contenido que escribes tú:</strong> reseñas, notas privadas
            por juego, guías, comentarios, tu apodo («handle») y lo que
            personalices en tu perfil público (título, banner, color, etc.).
          </li>
          <li>
            <strong>Notificaciones push (opcional):</strong> si activas los
            avisos del navegador en Ajustes, se guarda el «endpoint» que tu
            propio navegador genera para poder enviarte esa notificación — no
            es un dato que identifique tu persona, lo genera Chrome/Firefox/etc.
            y solo sirve para eso.
          </li>
          <li>
            <strong>Webhook de Discord (opcional):</strong> si pegas una URL de
            webhook de tu propio servidor de Discord para recibir avisos de
            trofeos ahí, esa URL se guarda tal cual la escribiste. Solo tú la
            ves y solo se usa para enviar los mensajes que tú has pedido.
          </li>
        </ul>
      </Seccion>

      <Seccion num="3" title="Para qué se usan">
        <ul className="list-disc pl-5 space-y-1 text-muted">
          <li>Dejarte entrar y gestionar tu cuenta.</li>
          <li>Calcular y enseñar tus estadísticas de trofeos, logros y progreso.</li>
          <li>La comparación entre amigos, el feed de comunidad y las ligas.</li>
          <li>Enviarte los avisos push o de Discord que tú mismo activaste.</li>
        </ul>
        <p className="text-muted">
          <strong>Nunca</strong> vendemos, alquilamos ni compartimos tus datos
          personales con terceros con fines comerciales o publicitarios. Paragon
          no muestra anuncios ni usa herramientas de analítica o publicidad de
          terceros (ver la <Link href="/cookies" className="text-accent hover:underline">política de cookies</Link>).
        </p>
      </Seccion>

      <Seccion num="4" title="Con quién se comparte, y por qué">
        <p className="text-muted">Ningún dato tuyo se vende. Sí hay servicios técnicos que lo procesan por nosotros o de los que leemos datos públicos:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-muted">
          <li><strong>Vercel</strong> aloja la aplicación. <strong>Supabase</strong> aloja la base de datos. Ambos actúan como encargados del tratamiento, no como dueños de tus datos.</li>
          <li><strong>Google y Discord</strong>, solo para el inicio de sesión (OAuth) — no reciben datos de trofeos ni de tu actividad en Paragon.</li>
          <li><strong>PlayStation Network, Steam y Xbox</strong> (esta última vía un servicio de terceros no oficial): de ahí se <em>leen</em> tus datos públicos de trofeos, nunca se les envía nada.</li>
          <li><strong>IGDB, PowerPyx, HowLongToBeat, YouTube e IsThereAnyDeal</strong>: fuentes de las que se lee información pública sobre los propios juegos (carátulas, géneros, guías, tiempos de finalización, precios) — no reciben datos tuyos, solo se les pide información sobre un juego.</li>
          <li><strong>El servicio de notificaciones push de tu propio navegador</strong> (por ejemplo Firebase Cloud Messaging en Chrome), únicamente si activas los avisos — es el mecanismo estándar de la web, no algo propio de Paragon.</li>
        </ul>
      </Seccion>

      <Seccion num="5" title="Cuánto tiempo se conservan">
        <p className="text-muted">
          Mientras tu cuenta exista. Si la eliminas (sección 6), se borran junto
          a ella tus cuentas de plataforma vinculadas, tus notas privadas, tu
          suscripción push y tu webhook de Discord. El contenido público que
          hayas compartido con otras personas (reseñas, comentarios, guías)
          puede quedar anonimizado en vez de borrado del todo, si borrarlo del
          todo rompiera una conversación ajena.
        </p>
      </Seccion>

      <Seccion num="6" title="Tus derechos">
        <p className="text-muted">
          Acceso, rectificación, supresión, portabilidad, oposición y
          limitación del tratamiento — el listado completo del RGPD. Puedes
          descargar una copia de tus propios datos desde{" "}
          <Link href="/ajustes/seguridad" className="text-accent hover:underline">Ajustes → Inicio de sesión y seguridad</Link>.
          Para eliminar tu cuenta, o para cualquier otro derecho, escribe a{" "}
          <a href="mailto:mario.meca2005@gmail.com" className="text-accent hover:underline">mario.meca2005@gmail.com</a>{" "}
          — se atiende en un máximo de 30 días, el plazo que marca el RGPD.
          También puedes reclamar ante la Agencia Española de Protección de
          Datos (aepd.es) si consideras que no se ha atendido tu solicitud.
        </p>
      </Seccion>

      <Seccion num="7" title="Seguridad de tus credenciales">
        <p className="text-muted">
          Paragon <strong>nunca solicita ni almacena contraseñas</strong> de tus
          cuentas de PlayStation, Steam, Xbox ni ninguna otra plataforma de
          juego. La sincronización usa identificadores públicos, no
          credenciales privadas de Sony, Valve ni Microsoft.
        </p>
      </Seccion>

      <Seccion num="8" title="Menores de edad">
        <p className="text-muted">
          Paragon no está dirigido a menores de 14 años y no solicita
          conscientemente datos de menores de esa edad. Si crees que un menor
          nos ha facilitado datos, escríbenos y los eliminaremos.
        </p>
      </Seccion>

      <Seccion num="9" title="Cambios en esta política">
        <p className="text-muted">
          Si esta política cambia de forma relevante, se actualizará la fecha
          de arriba y, cuando el cambio sea importante, se avisará dentro de la
          propia aplicación.
        </p>
      </Seccion>
    </div>
  );
}
