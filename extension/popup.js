const BASE_URL = "https://platinos-nine.vercel.app";

const estado = document.getElementById("estado");
const btnConectar = document.getElementById("btn-conectar");
const btnSync = document.getElementById("btn-sync");
const btnSyncEpic = document.getElementById("btn-sync-epic");
const btnDesconectar = document.getElementById("btn-desconectar");

const MENSAJES_ERROR = {
  "sin-sesion-psn":
    "No se ha detectado sesión de PlayStation en este navegador — abre playstation.com, inicia sesión y vuelve a intentarlo.",
  "no-conectado": "Conecta tu cuenta de Paragon primero.",
  "abre-mis-logros-de-epic":
    "Abre tu página «Mis logros» en store.epicgames.com (avatar → Mis logros), con tu sesión iniciada, y vuelve a pulsar.",
  "recarga-la-pagina-de-epic": "Recarga la pestaña de Epic (F5) y vuelve a intentarlo: se abrió antes de instalar la extensión.",
  "perfil-privado":
    "Epic no devuelve tus logros: en «Mis logros» → «Nivel de privacidad», ponlo en Público y vuelve a intentarlo.",
  "perfil-no-encontrado": "Epic no devuelve ese perfil. Comprueba que estás en tu página «Mis logros».",
  "epic-reto":
    "Epic te está pidiendo comprobar que eres una persona. Abre la web de Epic con normalidad, complétalo y reintenta.",
  "epic-no-responde": "Epic no ha respondido. Inténtalo de nuevo en un momento.",
  "no-es-pagina-de-logros": "Abre tu página «Mis logros» de Epic (la URL acaba en /u/ y un código).",
};

function mostrarEstadoConectado() {
  btnConectar.hidden = true;
  btnSync.hidden = false;
  btnSyncEpic.hidden = false;
  btnDesconectar.hidden = false;
  estado.textContent = "Conectado. PSN: pulsa para sincronizar. Epic: abre antes tu página «Mis logros».";
}

function mostrarEstadoDesconectado() {
  btnConectar.hidden = false;
  btnSync.hidden = true;
  btnSyncEpic.hidden = true;
  btnDesconectar.hidden = true;
  estado.textContent = "Conecta tu cuenta de Paragon primero.";
}

async function refrescarEstado() {
  const { connected } = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  if (connected) mostrarEstadoConectado();
  else mostrarEstadoDesconectado();
}

btnConectar.addEventListener("click", () => {
  chrome.tabs.create({ url: `${BASE_URL}/movil/enlazar-extension` });
  // La pestaña que se abre manda el token al background sola (content.js);
  // al volver a abrir este popup, refrescarEstado() ya lo verá conectado.
  window.close();
});

btnSync.addEventListener("click", async () => {
  btnSync.disabled = true;
  estado.textContent = "Sincronizando…";

  const resultado = await chrome.runtime.sendMessage({ type: "SYNC_PSN" });
  btnSync.disabled = false;

  if (resultado?.error) {
    estado.textContent = MENSAJES_ERROR[resultado.error] ?? resultado.error;
    if (resultado.error === "no-conectado") mostrarEstadoDesconectado();
    return;
  }

  estado.textContent = `Listo — ${resultado.juegos} juego(s) sincronizado(s) como ${resultado.username}.`;
});

btnSyncEpic.addEventListener("click", async () => {
  btnSyncEpic.disabled = true;
  estado.textContent = "Leyendo tus logros de Epic… puede tardar un poco.";

  const resultado = await chrome.runtime.sendMessage({ type: "SYNC_EPIC" });
  btnSyncEpic.disabled = false;

  if (resultado?.error) {
    estado.textContent = MENSAJES_ERROR[resultado.error] ?? resultado.error;
    if (resultado.error === "no-conectado") mostrarEstadoDesconectado();
    return;
  }

  estado.textContent = `Listo — ${resultado.juegos} juego(s) de Epic sincronizado(s) como ${resultado.username}. Se muestran como progreso declarado (no puntúan en rankings).`;
});

btnDesconectar.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "DESCONECTAR" });
  mostrarEstadoDesconectado();
});

refrescarEstado();
