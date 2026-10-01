// Cambiar aquí si el dominio de producción cambia (ver capacitor.config.ts,
// que tiene el mismo valor hardcodeado por el mismo motivo: un manifest de
// extensión no puede leer variables de entorno).
const BASE_URL = "https://platinos-nine.vercel.app";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PARAGON_TOKEN") {
    chrome.storage.local.set({ paragonToken: message.token }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "GET_STATUS") {
    chrome.storage.local.get("paragonToken").then(({ paragonToken }) => {
      sendResponse({ connected: Boolean(paragonToken) });
    });
    return true;
  }

  if (message?.type === "SYNC_PSN") {
    sincronizarPsn()
      .then(sendResponse)
      .catch((error) => sendResponse({ error: String(error?.message ?? error) }));
    return true;
  }

  if (message?.type === "SYNC_EPIC") {
    sincronizarEpic()
      .then(sendResponse)
      .catch((error) => sendResponse({ error: String(error?.message ?? error) }));
    return true;
  }

  if (message?.type === "DESCONECTAR") {
    chrome.storage.local.remove("paragonToken").then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

/**
 * El paso que sustituye a copiar el NPSSO a mano: con la sesión de
 * playstation.com ya iniciada en este navegador (cookies normales, nada
 * que la extensión lea ni guarde), este endpoint de Sony devuelve el mismo
 * token que hoy se saca copiando la respuesta JSON a mano. `host_permissions`
 * en manifest.json es lo que permite este fetch cross-origin sin que CORS
 * lo bloquee.
 */
async function leerNpssoDeSony() {
  const respuesta = await fetch("https://ca.account.sony.com/api/v1/ssocookie", {
    credentials: "include",
  });
  if (!respuesta.ok) throw new Error("sin-sesion-psn");

  const datos = await respuesta.json().catch(() => null);
  if (!datos?.npsso) throw new Error("sin-sesion-psn");

  return datos.npsso;
}

/**
 * Todo el flujo: sacar el NPSSO de Sony y mandarlo a Paragon, que lo usa
 * una vez (nunca lo guarda, ver lib/psn/auth.ts#authenticateWithNpssoEphemeral)
 * para traer la biblioteca y el detalle de los juegos recientes de la
 * cuenta del propio usuario, sea o no amiga de la cuenta maestra.
 */
async function sincronizarPsn() {
  const { paragonToken } = await chrome.storage.local.get("paragonToken");
  if (!paragonToken) return { error: "no-conectado" };

  let npsso;
  try {
    npsso = await leerNpssoDeSony();
  } catch {
    return { error: "sin-sesion-psn" };
  }

  const respuesta = await fetch(`${BASE_URL}/api/extension/psn-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${paragonToken}`,
    },
    body: JSON.stringify({ npsso }),
  });

  const resultado = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // 401: el token de la extensión ya no vale (se revocó desde Paragon o
    // caducó) — se borra solo para que el popup vuelva a pedir conectar,
    // en vez de fallar en silencio para siempre.
    if (respuesta.status === 401) await chrome.storage.local.remove("paragonToken");
    return { error: resultado?.error ?? `Error del servidor (${respuesta.status})` };
  }

  return resultado;
}

/**
 * Epic: lo lee el script de la propia página de Epic (epic.js, en
 * store.epicgames.com) con la sesión del usuario, porque Epic bloquea las
 * consultas desde el servidor de Paragon. Aquí solo se busca esa pestaña
 * ("Mis logros", /u/<id>), se le pide que lea y se envía el resultado.
 */
async function sincronizarEpic() {
  const { paragonToken } = await chrome.storage.local.get("paragonToken");
  if (!paragonToken) return { error: "no-conectado" };

  const pestanas = await chrome.tabs.query({ url: "https://store.epicgames.com/*" });
  const deLogros = pestanas.filter((p) => /\/u\/[0-9a-f]{32}/i.test(p.url ?? ""));
  if (deLogros.length === 0) return { error: "abre-mis-logros-de-epic" };
  const pestana = deLogros.find((p) => p.active) ?? deLogros[0];

  let lectura;
  try {
    lectura = await chrome.tabs.sendMessage(pestana.id, { type: "EPIC_LEER" });
  } catch {
    // La pestaña estaba abierta antes de instalar/actualizar la extensión: no tiene el script.
    return { error: "recarga-la-pagina-de-epic" };
  }
  if (!lectura || lectura.error) return { error: lectura?.error ?? "epic-no-responde" };

  const respuesta = await fetch(`${BASE_URL}/api/extension/epic-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${paragonToken}`,
    },
    body: JSON.stringify(lectura.datos),
  });

  const resultado = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 401) await chrome.storage.local.remove("paragonToken");
    return { error: resultado?.error ?? `Error del servidor (${respuesta.status})` };
  }

  return resultado;
}
