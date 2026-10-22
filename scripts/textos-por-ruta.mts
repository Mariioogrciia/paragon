/**
 * Qué textos (namespaces de messages/) necesita el navegador en cada sección
 * de la web (22 oct 2026). Antes iban todos los de cliente en el HTML de
 * CADA página (83 KB en español); ahora:
 *   - los de lo que sale siempre (cabecera, pie, aviso de cookies...) van en
 *     el proveedor de la raíz (`NAMESPACES_GLOBALES`, documento.tsx);
 *   - los de cada sección los añade su `layout.tsx` con <TextosRuta>
 *     (`NAMESPACES_POR_RUTA`).
 *
 * Cómo: se sigue el grafo de imports desde los archivos de cada ruta y se
 * recogen los `useTranslations("Ns")` de todo lo alcanzable. De cada uno,
 * solo los sub-apartados que se usan (`t("parte.clave")` → "Ns.parte");
 * si `t` se usa de forma que no se puede leer (clave variable, pasada como
 * prop...), el namespace entero.
 *
 *   npx tsx scripts/textos-por-ruta.mts            # regenera src/i18n/textosPorRuta.ts
 *   npx tsx scripts/textos-por-ruta.mts --comprobar # falla si no está al día (CI)
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

const RAIZ = resolve(import.meta.dirname, "..");
const SRC = join(RAIZ, "src");
const APP = join(SRC, "app");
const SALIDA = join(SRC, "i18n", "textosPorRuta.ts");
const errores: string[] = [];

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
  });
}

/* ------------------------------ Imports ------------------------------ */

function resolver(desde: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(desde), spec);
  else return null; // paquete de node_modules
  if (/\.(css|json|svg|png|jpe?g|webp)$/.test(spec)) return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  errores.push(`${relative(RAIZ, desde)}: no se encuentra el import "${spec}"`);
  return null;
}

const cacheImports = new Map<string, string[]>();
function imports(archivo: string): string[] {
  const hecho = cacheImports.get(archivo);
  if (hecho) return hecho;
  const codigo = readFileSync(archivo, "utf8");
  const specs = new Set<string>();
  // import x from "y" / export { x } from "y" (los `import type` no llegan al navegador)
  for (const m of codigo.matchAll(/^\s*(import|export)\s+(type\s+)?[^;]*?\sfrom\s+["']([^"']+)["']/gm)) {
    if (!m[2]) specs.add(m[3]);
  }
  for (const m of codigo.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) specs.add(m[1]);
  for (const m of codigo.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) specs.add(m[1]);
  const res = [...specs].map((s) => resolver(archivo, s)).filter((r): r is string => r !== null);
  cacheImports.set(archivo, res);
  return res;
}

function alcanzables(entradas: string[]): Set<string> {
  const vistos = new Set<string>();
  const pila = [...entradas];
  while (pila.length) {
    const a = pila.pop()!;
    if (vistos.has(a)) continue;
    vistos.add(a);
    pila.push(...imports(a));
  }
  return vistos;
}

/* ----------------------------- Namespaces ----------------------------- */

/*
 * Con el compilador de TypeScript (solo análisis, sin tipos de otros
 * archivos): así se sabe qué `t` es el traductor y cuál es un trofeo en
 * `.map((t) => …)` o un temporizador en `clearInterval(t)`, que se llaman
 * igual. Un análisis por texto los confundía y mandaba apartados enteros.
 */
const programa = ts.createProgram(archivos(SRC), {
  jsx: ts.JsxEmit.Preserve,
  noResolve: true,
  noLib: true,
  types: [],
  skipLibCheck: true,
});
const checker = programa.getTypeChecker();

const METODOS_T = new Set(["rich", "raw", "markup", "has"]);
const HOOKS_CON_DEPENDENCIAS = new Set(["useMemo", "useCallback", "useEffect", "useLayoutEffect"]);

/** Primer trozo estático de la clave (`"forms.x"` → "forms"), o null si no se puede leer. */
function primerTrozo(arg: ts.Expression | undefined): string | null {
  if (!arg) return null;
  let texto: string | null = null;
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) texto = arg.text;
  else if (ts.isTemplateExpression(arg) && arg.head.text.includes(".")) texto = arg.head.text;
  if (texto === null) return null;
  const trozo = texto.split(".")[0];
  return /^[A-Za-z_]\w*$/.test(trozo) && (texto.includes(".") || !ts.isTemplateExpression(arg)) ? trozo : null;
}

/** La llamada `t(...)` o `t.rich(...)` de la que `id` es el traductor, si lo es. */
function llamadaDe(id: ts.Identifier): ts.CallExpression | null {
  const p = id.parent;
  if (ts.isCallExpression(p) && p.expression === id) return p;
  if (ts.isPropertyAccessExpression(p) && p.expression === id && METODOS_T.has(p.name.text) && ts.isCallExpression(p.parent) && p.parent.expression === p) return p.parent;
  return null;
}

/** Nombre de lo que recibe `id` (`f(…id…)` o `<Comp x={id}>`), o null. */
function receptor(id: ts.Identifier): string | null {
  const p = id.parent;
  if (ts.isCallExpression(p) && p.arguments.includes(id)) {
    const e = p.expression;
    return ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : null;
  }
  if (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)) {
    const tag = p.parent.parent.parent; // JsxAttributes → JsxOpeningElement / JsxSelfClosingElement
    if (ts.isJsxOpeningElement(tag) || ts.isJsxSelfClosingElement(tag)) return tag.tagName.getText();
  }
  return null;
}

/** ¿Es la lista de dependencias de un useMemo/useEffect...? Ahí `t` no se pasa a nadie. */
function esDependencia(id: ts.Identifier): boolean {
  const lista = id.parent;
  if (!ts.isArrayLiteralExpression(lista) || !ts.isCallExpression(lista.parent)) return false;
  const e = lista.parent.expression;
  return ts.isIdentifier(e) && HOOKS_CON_DEPENDENCIAS.has(e.text);
}

const cacheNamespaces = new Map<string, string[]>();
function namespacesDe(archivo: string): string[] {
  if (!cacheNamespaces.has(archivo)) cacheNamespaces.set(archivo, analizar(archivo));
  return cacheNamespaces.get(archivo)!;
}

/** Los namespaces que usa un archivo, lo más ajustados que se pueda leer. */
function analizar(archivo: string): string[] {
  const fuente = programa.getSourceFile(archivo);
  if (!fuente) return [];
  const res = new Set<string>();
  const definidos = new Set<string>();
  const identificadores: ts.Identifier[] = [];
  const declaraciones: { nombre: ts.Identifier; ns: string }[] = [];
  const visitar = (n: ts.Node) => {
    if (ts.isIdentifier(n)) identificadores.push(n);
    if ((ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n)) && n.name && ts.isIdentifier(n.name)) definidos.add(n.name.text);
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "useTranslations") {
      const arg = n.arguments[0];
      if (!arg || !ts.isStringLiteral(arg)) errores.push(`${relative(RAIZ, archivo)}: useTranslations(${arg?.getText() ?? ""}) sin namespace literal`);
      else if (ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) declaraciones.push({ nombre: n.parent.name, ns: arg.text });
      else res.add(arg.text); // sin asignar a una constante: entero
    }
    ts.forEachChild(n, visitar);
  };
  visitar(fuente);

  // `// @textos Ns.parte` en el archivo: lo que necesita lo que recibe `t`
  // en otro archivo (p. ej. `gradeLabel(grado, t)` usa "TrophyIcon.*").
  const anotados = [...fuente.text.matchAll(/@textos\s+([\w.]+(?:\s*,\s*[\w.]+)*)/g)].flatMap((m) => m[1].split(/\s*,\s*/));

  for (const { nombre, ns } of declaraciones) {
    const simbolo = checker.getSymbolAtLocation(nombre);
    const partes = new Set<string>();
    let entero = false;
    // Las llamadas con el mismo nombre en funciones de este archivo que lo
    // reciben como parámetro (`function fila(t: Traductor)`) también cuentan.
    let pasadoAqui = false;
    for (const id of identificadores) {
      if (id === nombre || id.text !== nombre.text || checker.getSymbolAtLocation(id) !== simbolo) continue;
      const llamada = llamadaDe(id);
      if (llamada) {
        const trozo = primerTrozo(llamada.arguments[0]);
        if (trozo) partes.add(`${ns}.${trozo}`);
        else entero = true;
        continue;
      }
      if (esDependencia(id)) continue;
      const quien = receptor(id);
      if (quien && definidos.has(quien)) pasadoAqui = true;
      else if (quien && anotados.length) anotados.forEach((n) => res.add(n));
      else {
        entero = true; // a otro archivo, o un uso que no se sabe leer
        if (process.env.DEPURAR) console.error(`  por: ${id.parent.getText().slice(0, 90)}`);
      }
    }
    if (pasadoAqui && !entero) {
      for (const id of identificadores) {
        if (id.text !== nombre.text || checker.getSymbolAtLocation(id) === simbolo) continue;
        const llamada = llamadaDe(id);
        if (!llamada) continue;
        const trozo = primerTrozo(llamada.arguments[0]);
        if (trozo) partes.add(`${ns}.${trozo}`);
        else entero = true;
      }
    }
    if (process.env.DEPURAR && (entero || partes.size === 0)) console.error(`ENTERO ${relative(RAIZ, archivo)} ${ns}`);
    if (entero || partes.size === 0) res.add(ns);
    else partes.forEach((p) => res.add(p));
  }
  return [...res];
}

/** Quita lo que ya cubre otro de la lista ("Ns" cubre "Ns.parte"). */
function compactar(lista: Iterable<string>, yaCubiertos: string[] = []): string[] {
  const todos = [...new Set(lista)].sort();
  const cubre = (a: string, b: string) => b === a || b.startsWith(`${a}.`);
  return todos.filter((n) => !todos.some((o) => o !== n && cubre(o, n)) && !yaCubiertos.some((g) => cubre(g, n)));
}

function namespacesDesde(entradas: string[]): string[] {
  const ns = new Set<string>();
  for (const a of alcanzables(entradas)) namespacesDe(a).forEach((n) => ns.add(n));
  return compactar(ns);
}

/** ¿Existe en messages/<carpeta>/es.json? */
function existe(ns: string): boolean {
  const [carpeta, ...resto] = ns.split(".");
  const ruta = join(RAIZ, "messages", carpeta, "es.json");
  if (!existsSync(ruta)) return false;
  let nodo: unknown = JSON.parse(readFileSync(ruta, "utf8"));
  for (const parte of resto) {
    if (typeof nodo !== "object" || nodo === null || !(parte in nodo)) return false;
    nodo = (nodo as Record<string, unknown>)[parte];
  }
  return true;
}

/* ------------------------------- Rutas ------------------------------- */

const MODULOS_RUTA = /^(page|layout|loading|error|not-found|template|default)\.tsx?$/;
const modulosDe = (dir: string) => archivos(dir).filter((a) => MODULOS_RUTA.test(a.split("/").pop()!));

const APP_GRUPO = join(APP, "(app)");
const PUBLICO = join(APP, "(publico)", "p", "[locale]");

const globales = namespacesDesde(
  [
    join(APP, "documento.tsx"),
    join(APP, "global-error.tsx"),
    join(APP, "global-not-found.tsx"),
    join(APP_GRUPO, "layout.tsx"),
    join(APP_GRUPO, "error.tsx"),
    join(APP_GRUPO, "loading.tsx"),
    join(APP_GRUPO, "not-found.tsx"),
    join(PUBLICO, "layout.tsx"),
    join(PUBLICO, "not-found.tsx"),
  ].filter((a) => existsSync(a)),
);

const rutas: Record<string, string[]> = {};
const anotar = (clave: string, entradas: string[]) => {
  const ns = compactar(namespacesDesde(entradas), globales);
  if (ns.length) rutas[clave] = ns;
};
anotar("/", [join(APP_GRUPO, "page.tsx")]);
for (const seg of readdirSync(APP_GRUPO).filter((n) => statSync(join(APP_GRUPO, n)).isDirectory()).sort()) {
  anotar(`/${seg}`, modulosDe(join(APP_GRUPO, seg)));
}
anotar("publico:/", [join(PUBLICO, "page.tsx")]);
for (const seg of readdirSync(PUBLICO).filter((n) => statSync(join(PUBLICO, n)).isDirectory()).sort()) {
  anotar(`publico:/${seg}`, modulosDe(join(PUBLICO, seg)));
}

for (const ns of [...globales, ...Object.values(rutas).flat()]) {
  // Las partes ("Onboarding.forms") salen de leer `t("forms.x")`: si no
  // existe, es una clave mal escrita que ya fallaría igual en la página.
  if (!existe(ns)) errores.push(`"${ns}" no existe en messages/ (es)`);
}

// Cada sección con textos tiene que llevar su <TextosRuta ruta="..."> (en
// su layout, o en la página donde no hay carpeta propia): si no, sus
// componentes se quedarían sin textos en el navegador.
const dondeVa = (clave: string): string[] => {
  if (clave === "/") return [join(APP_GRUPO, "page.tsx")];
  if (clave === "publico:/") return [join(PUBLICO, "page.tsx")];
  if (clave.startsWith("publico:/")) return modulosDe(join(PUBLICO, clave.slice("publico:/".length)));
  return modulosDe(join(APP_GRUPO, clave.slice(1)));
};
for (const clave of Object.keys(rutas)) {
  const puesto = dondeVa(clave).some((a) => readFileSync(a, "utf8").includes(`<TextosRuta ruta="${clave}">`));
  if (!puesto) errores.push(`Falta <TextosRuta ruta="${clave}"> en el layout de esa sección (o en su página)`);
}

/* ------------------------------ Salida ------------------------------ */

const salida = `// GENERADO por scripts/textos-por-ruta.mts — no editar a mano.
// Qué textos se mandan al navegador: los globales en todas las páginas
// (documento.tsx) y los de cada sección desde su layout (<TextosRuta>).

export const NAMESPACES_GLOBALES = ${JSON.stringify(globales, null, 2)} as const;

export const NAMESPACES_POR_RUTA: Record<string, readonly string[]> = ${JSON.stringify(rutas, null, 2)};
`;

if (errores.length) {
  console.error(errores.join("\n"));
  process.exit(1);
}

if (process.argv.includes("--comprobar")) {
  const actual = existsSync(SALIDA) ? readFileSync(SALIDA, "utf8") : "";
  if (actual !== salida) {
    console.error("src/i18n/textosPorRuta.ts no está al día: npx tsx scripts/textos-por-ruta.mts");
    process.exit(1);
  }
  console.log(`OK: textos por ruta al día (${globales.length} globales, ${Object.keys(rutas).length} rutas).`);
} else {
  writeFileSync(SALIDA, salida);
  console.log(`Escrito ${relative(RAIZ, SALIDA)}: ${globales.length} globales, ${Object.keys(rutas).length} rutas.`);
}
