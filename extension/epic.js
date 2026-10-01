// Corre en https://store.epicgames.com/* (ver manifest.json). Lee los logros
// de Epic del propio usuario DESDE SU NAVEGADOR y se los pasa al background,
// que los envía a Paragon (POST /api/extension/epic-sync).
//
// Por qué aquí y no en el servidor: Epic bloquea con su protección antibots
// (Cloudflare) las consultas que hace el servidor de Paragon, pero no las de
// un navegador de verdad con la sesión del usuario. Esto NO esquiva nada: es
// el navegador de la persona consultando, en la web de Epic, su propio perfil
// — las mismas peticiones que ya hace la propia página de "Mis logros".
//
// Los hashes son las "persisted queries" que usa la web de Epic (sacados de
// sus peticiones reales, ver src/lib/epic/client.ts). Si Epic los cambia,
// hay que volver a sacarlos de la web y actualizar los dos sitios.

const HASH = {
  playerProfile: "ff954147a23d38a0e5b050962d442099487da001a0ab4b10ccbec8ac49755b3c",
  playerProfilePrivate: "47d0391fa5ec42d829e4a03f399cb586a29cf3cebd940cc4747aed0192c61114",
  getSandboxData: "43d8a3f7b403dc92e195efb75b0b28e8901ba76cff025b87482388762aee6894",
  Achievement: "9284d2fe200e351d1496feda728db23bb52bfd379b236fc3ceca746c1f1b33f2",
  playerProfileAchievementsByProductId: "70ff714976f88a85aafa3cb5abb9909d52e12a3ff585d7b49550d2493a528fb0",
};

// Mismos topes que el servidor (EPIC_DETAIL_LIMIT en src/lib/sync.ts y los de
// src/lib/epic/extensionData.ts): lo que pase de aquí se descartaría igual.
const MAX_JUEGOS_CON_DETALLE = 40;
const CONCURRENCIA = 4;

class ErrorEpic extends Error {}

async function consultar(operationName, variables, sha256Hash) {
  const url =
    `/graphql?operationName=${operationName}` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash } }))}`;
  const respuesta = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
  if (!respuesta.ok) throw new ErrorEpic("epic-respuesta-" + respuesta.status);
  return respuesta.json();
}

function idDeCuentaEnLaUrl() {
  // La página "Mis logros" es /u/<epicAccountId de 32 caracteres hexadecimales>.
  const coincide = location.pathname.match(/\/u\/([0-9a-f]{32})/i);
  return coincide ? coincide[1].toLowerCase() : null;
}

function imagenesHttp(imagenes) {
  return (imagenes || []).filter((i) => i && typeof i.url === "string" && i.url.startsWith("http")).map((i) => ({ url: i.url, type: i.type }));
}

async function detalleDeJuego(epicAccountId, sandboxId) {
  const sandbox = await consultar("getSandboxData", { sandboxId }, HASH.getSandboxData);
  const productId = sandbox?.data?.Product?.sandbox?.productId;
  if (!productId) return null;

  const [catalogo, jugador] = await Promise.all([
    consultar("Achievement", { sandboxId, locale: "es-ES" }, HASH.Achievement),
    consultar("playerProfileAchievementsByProductId", { epicAccountId, productId }, HASH.playerProfileAchievementsByProductId),
  ]);

  const definiciones = catalogo?.data?.Achievement?.productAchievementsRecordBySandbox?.achievements ?? [];
  const delJugador = jugador?.data?.PlayerProfile?.playerProfile?.productAchievements?.data?.playerAchievements ?? [];

  return {
    sandboxId,
    catalogo: definiciones.map(({ achievement: a }) => ({
      name: a.name,
      hidden: a.hidden,
      unlockedDisplayName: a.unlockedDisplayName,
      lockedDisplayName: a.lockedDisplayName,
      unlockedDescription: a.unlockedDescription,
      lockedDescription: a.lockedDescription,
      unlockedIconLink: a.unlockedIconLink,
      lockedIconLink: a.lockedIconLink,
      XP: a.XP,
      tier: a.tier ? { name: a.tier.name } : null,
      rarity: a.rarity ? { percent: a.rarity.percent } : null,
    })),
    jugador: delJugador.map(({ playerAchievement: p }) => ({
      achievementName: p.achievementName,
      unlocked: p.unlocked,
      unlockDate: p.unlockDate,
      XP: p.XP,
    })),
  };
}

/** Reparte el trabajo en `CONCURRENCIA` hilos: no machacar a Epic con 40 peticiones a la vez. */
async function enParalelo(elementos, hacer) {
  const resultados = [];
  let siguiente = 0;
  const hilos = Array.from({ length: Math.min(CONCURRENCIA, elementos.length) }, async () => {
    while (siguiente < elementos.length) {
      const indice = siguiente++;
      try {
        const r = await hacer(elementos[indice]);
        if (r) resultados.push(r);
      } catch (error) {
        // Un juego que falla no tira la sincronización entera: se queda sin detalle.
        if (error instanceof ErrorEpic && error.message === "epic-respuesta-403") throw error;
      }
    }
  });
  await Promise.all(hilos);
  return resultados;
}

async function leerEpic() {
  const epicAccountId = idDeCuentaEnLaUrl();
  if (!epicAccountId) return { error: "no-es-pagina-de-logros" };

  try {
    const [basico, privado] = await Promise.all([
      consultar("playerProfile", { epicAccountId }, HASH.playerProfile),
      consultar("playerProfilePrivate", { epicAccountId, locale: "es-ES", page: 1, accountId: epicAccountId }, HASH.playerProfilePrivate),
    ]);

    const perfil = basico?.data?.PlayerProfile?.playerProfile;
    if (!perfil?.epicAccountId) return { error: "perfil-no-encontrado" };

    const entradas = privado?.data?.PlayerProfile?.playerProfile?.achievementsSummaries?.data;
    if (!Array.isArray(entradas)) return { error: "perfil-privado" };

    const resumenes = entradas
      .filter((e) => e?.product?.name)
      .map((e) => ({
        sandboxId: e.sandboxId,
        totalUnlocked: e.totalUnlocked,
        totalXP: e.totalXP,
        product: { name: e.product.name, slug: e.product.slug },
        productAchievements: { totalAchievements: e.productAchievements?.totalAchievements ?? 0 },
        baseOfferForSandbox: { keyImages: imagenesHttp(e.baseOfferForSandbox?.keyImages) },
      }));

    // Detalle (logro a logro) de los juegos con algo conseguido, como hace el servidor.
    const conLogros = resumenes.filter((r) => r.totalUnlocked > 0).slice(0, MAX_JUEGOS_CON_DETALLE);
    const detalles = await enParalelo(conLogros, (r) => detalleDeJuego(epicAccountId, r.sandboxId));

    return {
      datos: {
        epicAccountId,
        displayName: perfil.displayName,
        avatarUrl: perfil.avatar?.medium,
        resumenes,
        detalles,
      },
    };
  } catch (error) {
    // 403 = Cloudflare pidiendo un reto en este navegador: se resuelve abriendo la web de Epic con normalidad.
    if (error instanceof ErrorEpic) return { error: error.message === "epic-respuesta-403" ? "epic-reto" : "epic-no-responde" };
    return { error: "epic-no-responde" };
  }
}

chrome.runtime.onMessage.addListener((mensaje, _remitente, responder) => {
  if (mensaje?.type !== "EPIC_LEER") return false;
  leerEpic().then(responder);
  return true;
});
