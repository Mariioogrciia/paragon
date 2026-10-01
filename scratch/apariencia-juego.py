import io
p='src/lib/apariencia.ts'
s=io.open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert a in s, a[:60]
    s=s.replace(a,b,1)
rep('import { ESTILO_REQUISITOS } from "@/lib/level";','import { ESTILO_REQUISITOS } from "@/lib/level";\nimport { paletaDesdeColor, variablesPaleta } from "@/lib/paletaJuego";')
rep('const CLAVE_TEXTO = "platinos:texto";','''const CLAVE_TEXTO = "platinos:texto";
/** JSON `{ id, color, vars }`: el juego elegido, su color de carátula y las
 *  variables ya calculadas (el script anti-parpadeo de layout.tsx solo las
 *  copia, no puede recalcular la paleta). */
const CLAVE_ACENTO_JUEGO = "platinos:acento-juego";

export interface AcentoJuego {
  id: string;
  color: string;
}''')
rep('''/** Aplica la clase de acento al <html>, quitando la anterior. */
function aplicarAcento(clase: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);''','''const VARIABLES_JUEGO = ["--juego-rgb", "--juego-rgb-claro", "--juego-2", "--juego-bg", "--juego-surface", "--juego-surface-2", "--juego-border"];

function quitarAcentoJuego(html: HTMLElement) {
  html.classList.remove("accent-juego");
  for (const v of VARIABLES_JUEGO) html.style.removeProperty(v);
}

/** Aplica la clase de acento al <html>, quitando la anterior. */
function aplicarAcento(clase: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  quitarAcentoJuego(html);''')
rep('''function aplicarAcentoLibre(hex: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);''','''function aplicarAcentoLibre(hex: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  quitarAcentoJuego(html);''')
rep('''/** Aplica la clase de estilo al <html>, quitando la anterior. */''','''/**
 * Paleta sacada de la carátula de un juego: acento y, en oscuro, el suelo
 * entero (ver `.accent-juego` en globals.css). Devuelve las variables para
 * guardarlas, o null si el color no vale.
 */
function aplicarAcentoJuego(color: string): Record<string, string> | null {
  const paleta = paletaDesdeColor(color);
  if (!paleta) return null;
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  html.style.removeProperty("--accent-rgb");
  html.style.removeProperty("--accent-2");
  const vars = variablesPaleta(paleta);
  for (const [k, v] of Object.entries(vars)) html.style.setProperty(k, v);
  html.classList.add("accent-juego");
  return vars;
}

function leerAcentoJuego(): AcentoJuego | undefined {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_ACENTO_JUEGO) ?? "null");
    return crudo && typeof crudo.id === "string" && typeof crudo.color === "string" ? { id: crudo.id, color: crudo.color } : undefined;
  } catch {
    return undefined;
  }
}

function escribirAcentoJuego(juego: AcentoJuego | undefined) {
  const vars = juego ? aplicarAcentoJuego(juego.color) : null;
  if (juego && vars) localStorage.setItem(CLAVE_ACENTO_JUEGO, JSON.stringify({ ...juego, vars }));
  else localStorage.removeItem(CLAVE_ACENTO_JUEGO);
}

/** Aplica la clase de estilo al <html>, quitando la anterior. */''')
rep('''  acentoLibre?: string;
  estilo?: string;
  tamanoTexto?: string;
}''','''  acentoLibre?: string;
  acentoJuego?: AcentoJuego;
  estilo?: string;
  tamanoTexto?: string;
}''')
rep('''    acentoLibre: localStorage.getItem(CLAVE_ACENTO_LIBRE) ?? "",
    estilo: localStorage.getItem(CLAVE_ESTILO) ?? "",
    tamanoTexto: localStorage.getItem(CLAVE_TEXTO) ?? "",
  };
}''','''    acentoLibre: localStorage.getItem(CLAVE_ACENTO_LIBRE) ?? "",
    ...(leerAcentoJuego() ? { acentoJuego: leerAcentoJuego() } : {}),
    estilo: localStorage.getItem(CLAVE_ESTILO) ?? "",
    tamanoTexto: localStorage.getItem(CLAVE_TEXTO) ?? "",
  };
}''')
rep('''    escribirLocal(CLAVE_TEXTO, final.tamanoTexto);
    if (final.acentoLibre) aplicarAcentoLibre(final.acentoLibre);
    else aplicarAcento(final.acento ?? "");''','''    escribirLocal(CLAVE_TEXTO, final.tamanoTexto);
    if (final.acentoJuego) escribirAcentoJuego(final.acentoJuego);
    else {
      localStorage.removeItem(CLAVE_ACENTO_JUEGO);
      if (final.acentoLibre) aplicarAcentoLibre(final.acentoLibre);
      else aplicarAcento(final.acento ?? "");
    }''')
rep('''  const [acentoLibre, setAcentoLibre] = useState("");
  const [estilo''','''  const [acentoLibre, setAcentoLibre] = useState("");
  const [acentoJuego, setAcentoJuego] = useState("");
  const [estilo''')
rep('''    setMontado(true);
    const libreGuardado = localStorage.getItem(CLAVE_ACENTO_LIBRE) ?? "";
    if (libreGuardado) {''','''    setMontado(true);
    const libreGuardado = localStorage.getItem(CLAVE_ACENTO_LIBRE) ?? "";
    const juegoGuardado = leerAcentoJuego();
    if (juegoGuardado) {
      setAcentoJuego(juegoGuardado.id);
      aplicarAcentoJuego(juegoGuardado.color);
    } else if (libreGuardado) {''')
rep('''  function elegirAcento(valor: string) {
    setAcento(valor);
    setAcentoLibre("");
    aplicarAcento(valor);''','''  function elegirAcento(valor: string) {
    setAcento(valor);
    setAcentoLibre("");
    setAcentoJuego("");
    localStorage.removeItem(CLAVE_ACENTO_JUEGO);
    aplicarAcento(valor);''')
rep('''    setAcentoLibre(hex);
    setAcento("");
    aplicarAcentoLibre(hex);''','''    setAcentoLibre(hex);
    setAcento("");
    setAcentoJuego("");
    localStorage.removeItem(CLAVE_ACENTO_JUEGO);
    aplicarAcentoLibre(hex);''')
rep('''  function elegirEstilo(valor: string) {''','''  function elegirAcentoJuego(juego: AcentoJuego) {
    setAcentoJuego(juego.id);
    setAcento("");
    setAcentoLibre("");
    localStorage.removeItem(CLAVE_ACENTO);
    localStorage.removeItem(CLAVE_ACENTO_LIBRE);
    escribirAcentoJuego(juego);
    persistir();
  }

  function elegirEstilo(valor: string) {''')
rep('''    acentoLibre,
    estilo,
    tamanoTexto,
    elegirAcento,
    elegirAcentoLibre,''','''    acentoLibre,
    acentoJuego,
    estilo,
    tamanoTexto,
    elegirAcento,
    elegirAcentoLibre,
    elegirAcentoJuego,''')
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('ok')
