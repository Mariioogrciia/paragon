import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { mintExtensionSession } from "@/lib/mobileAuth";

export const metadata = { title: "Conectar extensión · Paragon" };

/**
 * Puente entre el login web (cookie normal, `auth()`) y la extensión de
 * navegador que sincroniza PSN sin pedir el NPSSO a mano (ver
 * extension/background.js y /api/extension/psn-sync).
 *
 * A diferencia de /movil/enlazar (el mismo puente para la app nativa), aquí
 * NO hay una "sesión prestada" que consumir: el usuario sigue con su
 * pestaña de Paragon abierta con su cookie de siempre, y el token que se
 * genera aquí es uno TERCERO, propio de la extensión — cerrar sesión en el
 * navegador o desinstalar la extensión son cosas independientes entre sí y
 * de la sesión web.
 *
 * El content script de la extensión (ver extension/content.js, que declara
 * esta misma ruta en su manifest) lee el token del `data-token` de abajo y
 * se lo manda al background vía `chrome.runtime.sendMessage` — no hace
 * falta copiar nada a mano.
 */
export default async function EnlazarExtensionPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar?callbackUrl=/movil/enlazar-extension");

  const token = await mintExtensionSession(session.user.id);

  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="font-heading text-xl font-bold">Conectando la extensión…</h1>
      <p className="mt-3 text-sm text-muted">
        Ya puedes cerrar esta pestaña — la extensión de Paragon queda conectada a tu cuenta y lista para
        sincronizar PSN.
      </p>
      {/* El content script de la extensión busca este id exacto. */}
      <div id="paragon-extension-token" data-token={token} hidden />
    </main>
  );
}
