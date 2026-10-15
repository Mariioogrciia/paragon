import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import medidas from "./medidas.json";
import { ACENTO, ACENTO_2, APAGADO, CUERPO, FONDO, ORO, PLATINO, SUPERFICIE, TEXTO, TITULAR, cargarFuentes } from "./estilo";

/**
 * Promo de Paragon para TikTok (15 oct 2026). Todas las pantallas son
 * capturas reales: la web como se ve en un PC (el perfil de ejemplo, con los
 * mismos componentes que un perfil de verdad, capturado con capturar.mjs) y
 * dos capturas del móvil del propio usuario (ficha de Ghost of Yōtei y su
 * gráfica del platino). Sin música: en TikTok se le pone un sonido de moda.
 *
 * Zonas seguras de TikTok: arriba ~150 px (pestañas) y abajo ~450 px
 * (descripción y botones), a la derecha ~140 px (iconos). Los textos van
 * entre y = 180 y y = 1450.
 */

export const FPS = 30;

// Escenas, en fotogramas.
const ESCENAS = {
  gancho: { desde: 0, dura: 90 },
  marca: { desde: 90, dura: 75 },
  perfil: { desde: 165, dura: 180 },
  ficha: { desde: 345, dura: 120 },
  grafica: { desde: 465, dura: 105 },
  funciones: { desde: 570, dura: 120 },
  cierre: { desde: 690, dura: 120 },
};
export const DURACION = ESCENAS.cierre.desde + ESCENAS.cierre.dura;

export const PromoTikTok = () => {
  cargarFuentes();
  return (
    <AbsoluteFill style={{ backgroundColor: FONDO, fontFamily: CUERPO, color: TEXTO }}>
      <Fondo />
      <Sequence from={ESCENAS.gancho.desde} durationInFrames={ESCENAS.gancho.dura}>
        <Gancho />
      </Sequence>
      <Sequence from={ESCENAS.marca.desde} durationInFrames={ESCENAS.marca.dura}>
        <Marca />
      </Sequence>
      <Sequence from={ESCENAS.perfil.desde} durationInFrames={ESCENAS.perfil.dura}>
        <EscenaWeb
          titulo="Tu perfil de cazador"
          subtitulo="Nivel, platinos, insignias, tus favoritos y tu Wrap del año"
          imagen="capturas/perfil-pc.png"
          dura={ESCENAS.perfil.dura}
        />
      </Sequence>
      <Sequence from={ESCENAS.ficha.desde} durationInFrames={ESCENAS.ficha.dura}>
        <EscenaMovil
          titulo="Cada juego cuenta su historia"
          subtitulo="Con el diario de cada platino"
          imagen="capturas/app-ficha-diario.jpg"
          dura={ESCENAS.ficha.dura}
        />
      </Sequence>
      <Sequence from={ESCENAS.grafica.desde} durationInFrames={ESCENAS.grafica.dura}>
        <EscenaMovil
          titulo="Y cómo lo conseguiste"
          subtitulo="Cada trofeo, en el tiempo"
          imagen="capturas/app-grafica-platino.jpg"
          dura={ESCENAS.grafica.dura}
        />
      </Sequence>
      <Sequence from={ESCENAS.funciones.desde} durationInFrames={ESCENAS.funciones.dura}>
        <Funciones />
      </Sequence>
      <Sequence from={ESCENAS.cierre.desde} durationInFrames={ESCENAS.cierre.dura}>
        <Cierre />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ Piezas */

/** Fondo oscuro con un halo del acento que respira despacio. */
const Fondo = () => {
  const f = useCurrentFrame();
  const x = 50 + Math.sin(f / 70) * 18;
  const y = 30 + Math.cos(f / 90) * 10;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(900px 700px at ${x}% ${y}%, rgba(124,196,228,0.22), transparent 70%), radial-gradient(700px 600px at 80% 95%, rgba(226,181,62,0.10), transparent 70%)`,
      }}
    />
  );
};

/** Entrada y salida suaves de una escena entera. */
function useVisibilidad(dura: number) {
  const f = useCurrentFrame();
  return interpolate(f, [0, 8, dura - 8, dura], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

function useMuelle(retraso = 0, rigidez = 140) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - retraso, fps, config: { damping: 14, stiffness: rigidez, mass: 0.8 } });
}

const Titular = ({ children, size = 96, style }: { children: ReactNode; size?: number; style?: CSSProperties }) => (
  <div
    style={{
      fontFamily: TITULAR,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.05,
      textTransform: "uppercase",
      letterSpacing: 1,
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ Escenas */

const PLATAFORMAS = [
  { nombre: "PlayStation", color: "#3B82F6" },
  { nombre: "Steam", color: "#66C0F4" },
  { nombre: "Xbox", color: "#22C55E" },
];

/** 0-3 s: el problema. Tus trofeos están repartidos por todas partes. */
const Gancho = () => {
  const opacidad = useVisibilidad(ESCENAS.gancho.dura);
  const titulo = useMuelle(0);
  return (
    <AbsoluteFill style={{ opacity: opacidad, alignItems: "center", justifyContent: "center", padding: "0 90px" }}>
      <div style={{ transform: `scale(${0.85 + titulo * 0.15})`, opacity: titulo, marginTop: -160 }}>
        <Titular size={92}>¿Tus trofeos están repartidos?</Titular>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 70, alignItems: "center" }}>
        {PLATAFORMAS.map((p, i) => (
          <Chip key={p.nombre} retraso={14 + i * 9} color={p.color} desdeIzquierda={i % 2 === 0}>
            {p.nombre}
          </Chip>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Chip = ({ children, retraso, color, desdeIzquierda }: { children: ReactNode; retraso: number; color: string; desdeIzquierda: boolean }) => {
  const m = useMuelle(retraso, 170);
  const desplazamiento = (1 - m) * (desdeIzquierda ? -500 : 500);
  return (
    <div
      style={{
        transform: `translateX(${desplazamiento}px)`,
        opacity: m,
        padding: "22px 52px",
        borderRadius: 999,
        border: `3px solid ${color}`,
        background: `${color}22`,
        fontFamily: TITULAR,
        fontWeight: 700,
        fontSize: 58,
        color: TEXTO,
      }}
    >
      {children}
    </div>
  );
};

/** 3-5,5 s: la marca. Todos en un solo sitio. */
const Marca = () => {
  const opacidad = useVisibilidad(ESCENAS.marca.dura);
  const logo = useMuelle(0, 120);
  const texto = useMuelle(10);
  return (
    <AbsoluteFill style={{ opacity: opacidad, alignItems: "center", justifyContent: "center", padding: "0 90px" }}>
      <div style={{ marginTop: -180, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 300,
            height: 300,
            borderRadius: 70,
            transform: `scale(${logo}) rotate(${(1 - logo) * -20}deg)`,
            boxShadow: `0 0 120px ${ACENTO}66`,
          }}
        />
        <Titular size={140} style={{ marginTop: 50, opacity: texto, letterSpacing: 10 }}>
          Paragon
        </Titular>
        <div
          style={{
            marginTop: 30,
            fontSize: 54,
            fontWeight: 600,
            textAlign: "center",
            color: ACENTO_2,
            opacity: texto,
            transform: `translateY(${(1 - texto) * 30}px)`,
          }}
        >
          Todos tus trofeos, en un solo sitio
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Un móvil con una captura real de la app, que se acerca un poco. */
const EscenaMovil = ({ titulo, subtitulo, imagen, dura }: { titulo: string; subtitulo: string; imagen: string; dura: number }) => {
  const f = useCurrentFrame();
  const opacidad = useVisibilidad(dura);
  const entrada = useMuelle(0, 110);
  const textos = useMuelle(6);

  // Pantalla del móvil: 560 × 1212 (proporción de un iPhone, 390 × 844).
  const ancho = 560;
  const alto = Math.round((ancho * 844) / 390);
  const zoom = interpolate(f, [0, dura], [1, 1.06]);

  return (
    <AbsoluteFill style={{ opacity: opacidad, alignItems: "center" }}>
      <div style={{ position: "absolute", top: 175, left: 80, right: 80, opacity: textos, transform: `translateY(${(1 - textos) * -24}px)` }}>
        <Titular size={74}>{titulo}</Titular>
        <div style={{ marginTop: 14, fontSize: 40, lineHeight: 1.25, textAlign: "center", color: APAGADO, fontWeight: 600 }}>{subtitulo}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 430,
          width: ancho + 28,
          height: alto + 28,
          borderRadius: 78,
          padding: 14,
          background: "linear-gradient(160deg, #2a3342, #0d1118)",
          boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 90px ${ACENTO}33`,
          transform: `translateY(${(1 - entrada) * 260}px) scale(${0.92 + entrada * 0.08})`,
        }}
      >
        <div style={{ width: ancho, height: alto, borderRadius: 64, overflow: "hidden", position: "relative", background: FONDO }}>
          <Img
            src={staticFile(imagen)}
            style={{
              width: ancho,
              position: "absolute",
              top: 0,
              left: 0,
              transform: `scale(${zoom})`,
              transformOrigin: "50% 30%",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * La web como se ve en un PC: una ventana de navegador con la página entera
 * capturada (1440 px de ancho), que se recorre de arriba abajo como al hacer
 * scroll.
 */
const EscenaWeb = ({ titulo, subtitulo, imagen, dura }: { titulo: string; subtitulo: string; imagen: string; dura: number }) => {
  const f = useCurrentFrame();
  const opacidad = useVisibilidad(dura);
  const entrada = useMuelle(0, 110);
  const textos = useMuelle(6);

  // La página se pinta a 1120 px de ancho dentro de un vídeo de 1080: se
  // recortan solo los márgenes vacíos de los lados y el texto se lee mejor.
  const ancho = 1120;
  const altoVista = 980;
  // Medidas de la página capturada (las escribe capturar.mjs).
  const altoPagina = (medidas.perfilPc.alto * ancho) / medidas.perfilPc.ancho;
  const recorrido = Math.max(0, altoPagina - altoVista) * 0.95;
  const scroll = interpolate(f, [24, dura - 24], [0, recorrido], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ opacity: opacidad, alignItems: "center" }}>
      <div style={{ position: "absolute", top: 175, left: 80, right: 80, opacity: textos, transform: `translateY(${(1 - textos) * -24}px)` }}>
        <Titular size={74}>{titulo}</Titular>
        <div style={{ marginTop: 14, fontSize: 40, lineHeight: 1.25, textAlign: "center", color: APAGADO, fontWeight: 600 }}>{subtitulo}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 420,
          left: 0,
          right: 0,
          overflow: "hidden",
          borderTop: "2px solid #2a3342",
          borderBottom: "2px solid #2a3342",
          background: "#0d1118",
          boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 90px ${ACENTO}33`,
          transform: `translateY(${(1 - entrada) * 260}px)`,
          opacity: entrada,
        }}
      >
        {/* Barra del navegador */}
        <div style={{ height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 30px", background: "#161c27", borderBottom: "1px solid #2a3342" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
          ))}
          <div style={{ marginLeft: 18, flex: 1, height: 38, borderRadius: 19, background: "#0b0f16", color: APAGADO, fontSize: 22, display: "flex", alignItems: "center", padding: "0 20px" }}>
            platinos-nine.vercel.app
          </div>
        </div>
        <div style={{ height: altoVista, overflow: "hidden", position: "relative" }}>
          <Img
            src={staticFile(imagen)}
            style={{ width: ancho, position: "absolute", top: 0, left: (1080 - ancho) / 2, transform: `translateY(${-scroll}px)` }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FUNCIONES = [
  { icono: "🏆", texto: "Ligas con amigos" },
  { icono: "⚔️", texto: "Clanes y guerras" },
  { icono: "🎮", texto: "Sesiones para trofeos online" },
  { icono: "🎯", texto: "Modo Enfoque" },
  { icono: "⚠️", texto: "Trofeos perdibles" },
  { icono: "🔥", texto: "Rachas y estadísticas" },
];

/** Lo demás que trae, en ráfaga. */
const Funciones = () => {
  const opacidad = useVisibilidad(ESCENAS.funciones.dura);
  const titulo = useMuelle(0);
  return (
    <AbsoluteFill style={{ opacity: opacidad, alignItems: "center", padding: "0 80px" }}>
      <div style={{ marginTop: 200, opacity: titulo, transform: `scale(${0.9 + titulo * 0.1})` }}>
        <Titular size={84}>Y además</Titular>
      </div>
      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 26, width: "100%" }}>
        {FUNCIONES.map((fn, i) => (
          <FilaFuncion key={fn.texto} retraso={8 + i * 7} {...fn} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const FilaFuncion = ({ icono, texto, retraso }: { icono: string; texto: string; retraso: number }) => {
  const m = useMuelle(retraso, 180);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 30,
        padding: "26px 36px",
        borderRadius: 32,
        background: SUPERFICIE,
        border: `2px solid ${ACENTO}44`,
        opacity: m,
        transform: `translateX(${(1 - m) * 160}px)`,
      }}
    >
      <span style={{ fontSize: 58 }}>{icono}</span>
      <span style={{ fontSize: 50, fontWeight: 700 }}>{texto}</span>
    </div>
  );
};

/** Llamada final. */
const Cierre = () => {
  const f = useCurrentFrame();
  const opacidad = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const logo = useMuelle(0, 120);
  const textos = useMuelle(10);
  const boton = useMuelle(22, 160);
  const brillo = 0.55 + Math.sin(f / 6) * 0.25;
  return (
    <AbsoluteFill style={{ opacity: opacidad, alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      <div style={{ marginTop: -200, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img src={staticFile("logo.png")} style={{ width: 220, height: 220, borderRadius: 52, transform: `scale(${logo})` }} />
        <Titular size={100} style={{ marginTop: 44, opacity: textos }}>
          Empieza la caza
        </Titular>
        <div style={{ marginTop: 26, fontSize: 46, color: APAGADO, fontWeight: 600, textAlign: "center", opacity: textos }}>
          Gratis · PlayStation, Steam y Xbox · en 4 idiomas
        </div>
        <div
          style={{
            marginTop: 60,
            padding: "30px 60px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${ACENTO}, ${PLATINO})`,
            color: "#0A0D13",
            fontFamily: TITULAR,
            fontWeight: 700,
            fontSize: 52,
            transform: `scale(${boton})`,
            boxShadow: `0 0 ${80 * brillo}px ${ACENTO}`,
          }}
        >
          platinos-nine.vercel.app
        </div>
        <div style={{ marginTop: 40, fontSize: 40, color: ORO, fontWeight: 700, opacity: boton }}>Pruébalo gratis 🏆</div>
      </div>
    </AbsoluteFill>
  );
};
