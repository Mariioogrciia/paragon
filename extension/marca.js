// Corre en las páginas de Paragon (ver manifest.json). Deja en <html> si la
// extensión está instalada y conectada, para que Ajustes → Plataformas enseñe
// el paso que toca (instalar, conectar o traer los logros de Epic) en vez de
// las tres instrucciones a la vez. Solo escribe un atributo: no lee nada de
// la página ni del usuario.
chrome.runtime.sendMessage({ type: "GET_STATUS" }).then((estado) => {
  document.documentElement.dataset.paragonExtension = estado?.connected ? "conectada" : "sin-conectar";
  document.dispatchEvent(new CustomEvent("paragon-extension"));
});
