"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import Link from "@/components/Enlace";

type EstadoExtension = "comprobando" | "sin-instalar" | "sin-conectar" | "conectada";

/** Lo que deja `extension/marca.js` en <html>: si está instalada y conectada. */
function leerMarca(): EstadoExtension | null {
  const marca = document.documentElement.dataset.paragonExtension;
  return marca === "conectada" || marca === "sin-conectar" ? marca : null;
}

// marca.js corre al cargar la página pero contesta en asíncrono: sin marca
// tras este rato, se da por no instalada.
const ESPERA_MS = 1500;
let esperaCumplida = false;

function suscribir(avisar: () => void) {
  document.addEventListener("paragon-extension", avisar);
  const espera = window.setTimeout(() => {
    esperaCumplida = true;
    avisar();
  }, ESPERA_MS);
  return () => {
    document.removeEventListener("paragon-extension", avisar);
    window.clearTimeout(espera);
  };
}

function instantanea(): EstadoExtension {
  return leerMarca() ?? (esperaCumplida ? "sin-instalar" : "comprobando");
}

/**
 * El paso que toca para traer los logros de Epic (23 oct 2026): instalar la
 * extensión, conectarla o, si ya está, abrir la página de logros de Epic con
 * `?paragon=sync` para que la extensión los lea y los envíe sola (ver
 * extension/epic.js). Antes eran tres instrucciones a la vez y ningún sitio
 * de donde sacar la extensión.
 */
export function ExtensionEpic({ epicId, urlTienda }: { epicId: string | null; urlTienda: string | null }) {
  const t = useTranslations("Onboarding.ajustesPlataformas.epicExt");
  const estado = useSyncExternalStore(suscribir, instantanea, () => "comprobando" as const);

  const boton =
    // Texto oscuro sobre el acento, nunca blanco (DESIGN.md).
    "inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-[0.8125rem] font-bold text-[#0a0d13] transition-colors hover:bg-[var(--accent-2)]";

  if (estado === "comprobando") return <p className="text-[0.8125rem] text-muted">{t("comprobando")}</p>;

  if (estado === "sin-instalar") {
    return (
      <div className="flex flex-col gap-2">
        {urlTienda ? (
          <a href={urlTienda} target="_blank" rel="noopener noreferrer" className={boton}>
            {t("instalar")}
          </a>
        ) : (
          <>
            <a href="/descargas/paragon-extension.zip" download className={`${boton} self-start`}>
              {t("descargar")}
            </a>
            <ol className="list-decimal space-y-1 pl-5 text-[0.8125rem] text-muted">
              <li>{t("manual1")}</li>
              <li>{t("manual2")}</li>
              <li>{t("manual3")}</li>
            </ol>
          </>
        )}
      </div>
    );
  }

  if (estado === "sin-conectar") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[0.8125rem] text-muted">{t("sinConectar")}</p>
        <Link href="/movil/enlazar-extension" className={`${boton} self-start`}>
          {t("conectar")}
        </Link>
      </div>
    );
  }

  return epicId ? (
    <div className="flex flex-col gap-2">
      <a href={`https://store.epicgames.com/u/${epicId}?paragon=sync`} target="_blank" rel="noopener noreferrer" className={`${boton} self-start`}>
        {t("traer")}
      </a>
      <p className="text-xs text-muted">{t("traerAyuda")}</p>
    </div>
  ) : (
    <ol className="list-decimal space-y-1 pl-5 text-[0.8125rem] text-muted">
      <li>{t("paso2")}</li>
      <li>{t("paso3")}</li>
    </ol>
  );
}
