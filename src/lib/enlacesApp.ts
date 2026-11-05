/**
 * App Links (Android) y Universal Links (iOS), 5 nov 2026: un enlace de
 * paragontrophies.com a un perfil, una ficha, una sesión o la parte social
 * abre la app si está instalada, en vez del navegador. Las rutas tienen que
 * ser las que la app sabe abrir (`rutaAppDeAviso` en
 * kmp/…/navigation/EnlaceAviso.kt) y las mismas que el `intent-filter` de
 * kmp/androidApp/src/main/AndroidManifest.xml. Módulo puro:
 * `tests/enlacesApp.test.ts`.
 */

export const PAQUETE_ANDROID = "com.paragon.app";
export const BUNDLE_IOS = "com.paragon.app.kmp";

/** Prefijos de ruta que abren la app. */
export const RUTAS_APP = ["/u/", "/juego/", "/sesiones", "/ligas", "/amigos", "/clanes", "/comparar", "/enfoque"];

/**
 * Huella SHA-256 del certificado de la APK de debug que compila la CI
 * (kmp/androidApp/debug.keystore): para que la verificación también valga en
 * las APK de prueba. La de release (y la de Play App Signing, que es OTRA)
 * van en `ANDROID_CERT_SHA256`, separadas por comas: Play Console → Prueba y
 * publica → Configuración → Integridad de la app → Firma de apps.
 */
export const HUELLA_DEBUG = "6C:33:50:FE:C6:E0:D9:06:A0:96:7D:85:EE:65:CB:49:16:4F:65:B1:07:A8:12:AB:C9:64:B3:AC:22:A5:3A:B9";

export function huellasAndroid(variable: string | undefined): string[] {
  const extra = (variable ?? "")
    .split(",")
    .map((h) => h.trim().toUpperCase())
    .filter((h) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(h));
  return [...new Set([HUELLA_DEBUG, ...extra])];
}

export function assetLinks(huellas: string[]) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: PAQUETE_ANDROID, sha256_cert_fingerprints: huellas },
    },
  ];
}

/** `null` sin `APPLE_TEAM_ID`: sin cuenta de pago de Apple no hay Universal Links. */
export function appleAppSiteAssociation(teamId: string | undefined) {
  if (!teamId || !/^[A-Z0-9]{10}$/.test(teamId)) return null;
  const appId = `${teamId}.${BUNDLE_IOS}`;
  return {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: RUTAS_APP.map((ruta) => ({ "/": `${ruta}*` })),
        },
      ],
    },
    webcredentials: { apps: [appId] },
  };
}
