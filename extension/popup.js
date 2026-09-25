const BASE_URL = "https://platinos-nine.vercel.app";

const estado = document.getElementById("estado");
const btnConectar = document.getElementById("btn-conectar");
const btnSync = document.getElementById("btn-sync");
const btnDesconectar = document.getElementById("btn-desconectar");

const MENSAJES_ERROR = {
  "sin-sesion-psn":
    "No se ha detectado sesión de PlayStation en este navegador — abre playstation.com, inicia sesión y vuelve a intentarlo.",
  "no-conectado": "Conecta tu cuenta de Paragon primero.",
};

function mostrarEstadoConectado() {
  btnConectar.hidden = true;
  btnSync.hidden = false;
  btnDesconectar.hidden = false;
  estado.textContent = "Conectado — pulsa para sincronizar tus trofeos de PSN.";
}

function mostrarEstadoDesconectado() {
  btnConectar.hidden = false;
  btnSync.hidden = true;
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

btnDesconectar.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "DESCONECTAR" });
  mostrarEstadoDesconectado();
});

refrescarEstado();
