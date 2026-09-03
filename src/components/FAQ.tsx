import React from "react";
import Link from "next/link";

const CARD = {
  border: "1px solid var(--border)",
  background: "linear-gradient(var(--surface), var(--background))",
};

interface Pregunta {
  q: string;
  a: React.ReactNode;
}

const GENERAL: Pregunta[] = [
  {
    q: "¿Tengo que dar mi contraseña de PlayStation o de Steam?",
    a: (
      <>
        No, y no hay forma de dárnosla aunque quisieras: no existe ningún campo
        para eso. Paragon lee los perfiles <strong>públicos</strong> con una
        credencial del servidor. Vincular una cuenta es solo decir «este soy yo
        ahí», igual que escribir tu nombre de usuario.
      </>
    ),
  },
  {
    q: "¿Por qué mi biblioteca aparece vacía?",
    a: (
      <>
        Casi siempre es cuestión de privacidad en la plataforma de origen. En
        PSN, tu perfil de trofeos tiene que ser público. En Steam hacen falta
        dos ajustes, no uno: <strong>«Mi perfil»</strong> y{" "}
        <strong>«Detalles del juego»</strong>, los dos en público. Si solo pones
        el perfil, la API devuelve una biblioteca vacía sin dar ningún error.
      </>
    ),
  },
  {
    q: "¿Cada cuánto se actualizan los datos?",
    a: (
      <>
        Al vincular una cuenta se importa todo de golpe, y a partir de ahí puedes
        forzar una lectura cuando quieras con «Sincronizar ahora» en ajustes. Los
        logros de un juego concreto se traen la primera vez que abres su ficha.
      </>
    ),
  },
];

const PLATAFORMAS: Pregunta[] = [
  {
    q: "¿Qué plataformas se pueden vincular?",
    a: (
      <>
        <strong>PlayStation (PSN)</strong> y <strong>Steam</strong>, las dos
        completas: juegos, logros, porcentajes de rareza y progreso. En Steam,
        además, se leen desarrolladora, editora y géneros, que es lo que permite
        agrupar la biblioteca por empresa.
      </>
    ),
  },
  {
    q: "¿Y Google Play Games o Game Center de Apple?",
    a: (
      <>
        No se puede, y no es cuestión de tiempo ni de ganas. La API de Google
        Play Games solo devuelve los logros de los juegos que pertenecen a{" "}
        <em>tu propio</em> proyecto de desarrollador: no existe ningún endpoint
        para leer los logros de un jugador en juegos de terceros, ni siquiera
        con su permiso. Game Center es aún más cerrado: GameKit funciona solo
        dentro del dispositivo y solo para tu propio juego, sin API de servidor.
      </>
    ),
  },
  {
    q: "¿Xbox, Epic o GOG?",
    a: (
      <>
        Xbox es viable, pero su API oficial es solo para socios comerciales;
        habría que apoyarse en un intermediario de terceros. Epic y GOG no
        publican API de logros, así que cualquier integración dependería de
        endpoints no oficiales que se rompen sin aviso.
      </>
    ),
  },
  {
    q: "¿Por qué en Steam no hay platinos?",
    a: (
      <>
        Porque Steam no tiene metales: un logro es un logro y todos valen igual.
        Los de bronce, plata, oro y platino son de PlayStation. Por eso, en los
        juegos de Steam, el equivalente de terminar algo es llegar al 100%, y
        aparecen como «Al 100%» en vez de «Platinado».
      </>
    ),
  },
];

const BIBLIOTECA: Pregunta[] = [
  {
    q: "¿Qué son las carpetas?",
    a: (
      <>
        Agrupaciones que te haces tú a mano («Pendientes 2026», «Para el
        verano»). Existen porque la agrupación automática por empresa depende de
        que la plataforma diga quién edita cada juego, y PSN no lo dice. Se crean
        y se rellenan desde la ficha de cualquier juego.
      </>
    ),
  },
  {
    q: "¿Por qué algunos juegos de PSN no tienen empresa?",
    a: (
      <>
        Porque la API de PlayStation no expone ni desarrolladora ni editora. Los
        de Steam sí la traen. Para cubrir los de PSN haría falta cruzar los
        títulos con un catálogo externo, y eso trae errores de emparejamiento
        propios. Mientras tanto, para eso están las carpetas.
      </>
    ),
  },
  {
    q: "¿Cómo se calcula «lo que menos falta»?",
    a: (
      <>
        Por logros pendientes, no por porcentaje. Un juego al 90% con cincuenta
        logros te deja más trabajo que uno al 70% con diez. Se dejan fuera los ya
        terminados y los que no has empezado, porque en esos dos casos «lo que
        falta» no informa de nada.
      </>
    ),
  },
  {
    q: "¿Las valoraciones las ve todo el mundo?",
    a: (
      <>
        La nota que pones a un juego cuenta para la media de la comunidad que
        aparece en su ficha, junto al número de votos. La media y el número van
        siempre juntos a propósito: un 5,0 con un voto no dice lo mismo que un
        4,2 con cuarenta.
      </>
    ),
  },
];

function Bloque({ titulo, preguntas }: { titulo: string; preguntas: Pregunta[] }) {
  return (
    <section className="mt-9">
      <h3 className="font-heading mb-4 text-xl font-bold">{titulo}</h3>

      <div className="space-y-2.5">
        {preguntas.map((p) => (
          <details key={p.q} className="group rounded-[18px] p-5" style={CARD}>
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-semibold marker:content-['']">
              {p.q}
              <span
                className="shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{p.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FAQSection() {
  return (
    <div className="mx-auto max-w-[760px] py-16" id="faq">
      <div className="text-center mb-10">
        <h2 className="font-heading text-[42px] font-bold uppercase leading-none">
          Preguntas frecuentes
        </h2>
        <p className="mt-3 text-[15px] text-muted">
          Lo que suele preguntarse antes de vincular una cuenta, y lo que conviene
          saber sobre lo que se puede y lo que no.
        </p>
      </div>

      <Bloque titulo="Lo básico" preguntas={GENERAL} />
      <Bloque titulo="Plataformas" preguntas={PLATAFORMAS} />
      <Bloque titulo="Biblioteca y valoraciones" preguntas={BIBLIOTECA} />

      <p className="mt-9 text-center text-[13px] text-muted">
        ¿Te falta algo por aquí?{" "}
        <Link href="/ajustes" className="font-semibold text-accent hover:underline">
          Revisa tus ajustes
        </Link>{" "}
        o escríbenos.
      </p>
    </div>
  );
}
