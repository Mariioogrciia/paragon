const BASE_URL = "https://www.paragontrophies.com";

const estado = document.getElementById("estado");
const btnConectar = document.getElementById("btn-conectar");
const btnSync = document.getElementById("btn-sync");
const btnSyncEpic = document.getElementById("btn-sync-epic");
const btnDesconectar = document.getElementById("btn-desconectar");

// Textos en el idioma del navegador (_locales/<idioma>/messages.json, 21 oct 2026).
const t = (clave, ...sustituciones) => chrome.i18n.getMessage(clave, sustituciones) || clave;

// Código de error (del background o del servidor) → clave de _locales.
const MENSAJES_ERROR = {
  "sin-sesion-psn": "err_sin_sesion_psn",
  "no-conectado": "desconectado",
  "abre-mis-logros-de-epic": "err_abre_mis_logros",
  "recarga-la-pagina-de-epic": "err_recarga_epic",
  "perfil-privado": "err_perfil_privado",
  "perfil-no-encontrado": "err_perfil_no_encontrado",
  "epic-reto": "err_epic_reto",
  "epic-no-responde": "err_epic_no_responde",
  "no-es-pagina-de-logros": "err_no_es_pagina_de_logros",
};

function textoDeError(resultado) {
  if (resultado.error === "error-servidor") return t("errorServidor", String(resultado.estado ?? ""));
  const clave = MENSAJES_ERROR[resultado.error];
  return clave ? t(clave) : resultado.error;
}

// Los textos fijos del popup (data-i18n en popup.html).
for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
document.documentElement.lang = chrome.i18n.getUILanguage().slice(0, 2);

function mostrarEstadoConectado() {
  btnConectar.hidden = true;
  btnSync.hidden = false;
  btnSyncEpic.hidden = false;
  btnDesconectar.hidden = false;
  estado.textContent = t("conectado");
}

function mostrarEstadoDesconectado() {
  btnConectar.hidden = false;
  btnSync.hidden = true;
  btnSyncEpic.hidden = true;
  btnDesconectar.hidden = true;
  estado.textContent = t("desconectado");
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
  estado.textContent = t("sincronizando");

  const resultado = await chrome.runtime.sendMessage({ type: "SYNC_PSN" });
  btnSync.disabled = false;

  if (resultado?.error) {
    estado.textContent = textoDeError(resultado);
    if (resultado.error === "no-conectado") mostrarEstadoDesconectado();
    return;
  }

  estado.textContent = t("listoPsn", String(resultado.juegos), resultado.username);
});

btnSyncEpic.addEventListener("click", async () => {
  btnSyncEpic.disabled = true;
  estado.textContent = t("leyendoEpic");

  const resultado = await chrome.runtime.sendMessage({ type: "SYNC_EPIC" });
  btnSyncEpic.disabled = false;

  if (resultado?.error) {
    estado.textContent = textoDeError(resultado);
    if (resultado.error === "no-conectado") mostrarEstadoDesconectado();
    return;
  }

  estado.textContent = t("listoEpic", String(resultado.juegos), resultado.username);
});

btnDesconectar.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "DESCONECTAR" });
  mostrarEstadoDesconectado();
});

refrescarEstado();
