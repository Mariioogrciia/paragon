import { ImageResponse } from "next/og";
import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import { paragonProgress } from "@/lib/level";
import { summarise } from "@/lib/stats";
import { urlAbsolutaParaOg } from "@/lib/design";

/**
 * Tarjeta social del perfil: lo que se ve al pegar `/u/<handle>` en Discord,
 * WhatsApp, Twitter o Slack.
 *
 * El porqué: hasta ahora la app no tenía NADA de `openGraph` en ninguna
 * página, así que compartir un perfil dejaba un enlace pelado — el peor
 * formato posible para lo único que puede traer usuarios nuevos a una app
 * que ya tiene construidas media docena de funciones sociales esperando
 * gente (guías, votos de dificultad, ligas, rankings; todas con 0 filas en
 * la base a día de hoy).
 *
 * Convención de archivo de Next (`opengraph-image.tsx` junto al `page.tsx`):
 * Next enlaza esta imagen sola en el `<head>`, sin que haya que declararla
 * en `generateMetadata`. Mismo mecanismo que las otras dos imágenes que ya
 * genera la app (`api/wrap/[handle]` y `api/trophy-card/...`): Satori vía
 * `ImageResponse`, que solo entiende flexbox — nada de CSS grid, ni
 * sombras, ni variables CSS.
 *
 * Corre en Node, no en edge, por lo mismo que las otras dos: `getLibrary`
 * habla con Postgres por `postgres-js`, que no funciona en edge.
 *
 * No exige sesión a propósito, igual que las otras dos: quien recibe el
 * enlace por WhatsApp no tiene por qué haber entrado nunca en Paragon.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Perfil de Paragon";

const PLATINO = "#9fd4ec";
const FONDO = "#0a0d13";
const TEXTO_TENUE = "#8b93a7";

function Cifra({ valor, etiqueta, color }: { valor: string; etiqueta: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        borderRadius: 20,
        padding: "26px 30px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 60, fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>
        {valor}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 10,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: TEXTO_TENUE,
        }}
      >
        {etiqueta}
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);

  // Un handle que no existe igual acaba compartido por ahí (un enlace mal
  // copiado). Mejor una tarjeta sobria de Paragon que un 404 que los
  // buscadores enseñan como imagen rota.
  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: FONDO,
            color: "#ffffff",
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          PARAGON
        </div>
      ),
      size,
    );
  }

  const { player, games } = await getLibrary(profile);
  const stats = summarise(games);
  const nivel = paragonProgress(games);
  const avatarUrl = urlAbsolutaParaOg(player.avatarUrl);
  const nombre = profile.displayName ?? player.name ?? handle;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: FONDO,
          // Satori no sabe de `radial-gradient` con varias paradas complejas,
          // pero sí de uno simple: basta para que no sea un rectángulo plano.
          backgroundImage: `radial-gradient(circle at 20% 0%, rgba(159,212,236,0.18), transparent 60%)`,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              width={140}
              height={140}
              style={{ borderRadius: 32, border: `3px solid ${PLATINO}` }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 140,
                height: 140,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.08)",
                border: `3px solid ${PLATINO}`,
                fontSize: 64,
                fontWeight: 700,
                color: PLATINO,
              }}
            >
              {nombre.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#ffffff", lineHeight: 1.05 }}>
              {nombre}
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: TEXTO_TENUE }}>
              @{handle} · Nivel {nivel.level} · {nivel.xp.toLocaleString("es-ES")} XP
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 22 }}>
          <Cifra valor={stats.platinos.toLocaleString("es-ES")} etiqueta="Platinos" color={PLATINO} />
          <Cifra valor={stats.trofeos.toLocaleString("es-ES")} etiqueta="Trofeos" color="#e2b53e" />
          <Cifra valor={stats.juegos.toLocaleString("es-ES")} etiqueta="Juegos" color="#b9c2cc" />
          <Cifra valor={`${stats.completadoMedio}%`} etiqueta="Completado" color="#c07b4a" />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: TEXTO_TENUE,
          }}
        >
          <div style={{ display: "flex" }}>Paragon</div>
          <div style={{ display: "flex", color: PLATINO }}>Trofeos y logros, en un solo sitio</div>
        </div>
      </div>
    ),
    size,
  );
}
