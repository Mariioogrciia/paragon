// Corre solo en /movil/enlazar-extension (ver manifest.json "matches" y la
// página en src/app/movil/enlazar-extension/page.tsx). Esa página ya
// autenticó al usuario con SU cookie normal de Paragon (auth() de
// Auth.js) y generó un token propio de la extensión — este script solo lo
// lee del DOM y se lo pasa al background, para no tener que copiarlo a
// mano.
const elemento = document.getElementById("paragon-extension-token");
const token = elemento?.dataset.token;

if (token) {
  chrome.runtime.sendMessage({ type: "PARAGON_TOKEN", token });
}
