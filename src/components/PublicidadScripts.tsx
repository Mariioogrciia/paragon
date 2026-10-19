import Script from "next/script";
import { clienteAdSense, urlAdSense, urlMensajeConsentimiento } from "@/lib/publicidad";

/**
 * Scripts de publicidad (19 oct 2026, ver lib/publicidad.ts), en el layout
 * raíz. Sin `NEXT_PUBLIC_ADSENSE_CLIENT` no pinta nada.
 *
 * Orden: primero el mensaje de consentimiento de Google (CMP certificado,
 * IAB TCF v2.2) y su señal `googlefcPresent`, tal como da la etiqueta
 * oficial de "Privacidad y mensajes"; después AdSense, que espera a que el
 * CMP diga qué se puede hacer antes de pedir anuncios personalizados.
 */
export function PublicidadScripts() {
  const cliente = clienteAdSense();
  if (!cliente) return null;
  return (
    <>
      <Script id="consentimiento-google" src={urlMensajeConsentimiento(cliente)} strategy="afterInteractive" />
      <Script id="consentimiento-google-presente" strategy="afterInteractive">
        {`(function(){function s(){if(!window.frames['googlefcPresent']){if(document.body){var i=document.createElement('iframe');i.style.cssText='width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px;display:none';i.name='googlefcPresent';document.body.appendChild(i);}else{setTimeout(s,0);}}}s();})();`}
      </Script>
      <Script id="adsense" src={urlAdSense(cliente)} strategy="afterInteractive" crossOrigin="anonymous" />
    </>
  );
}
