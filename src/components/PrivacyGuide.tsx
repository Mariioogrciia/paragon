import type { PlataformaVinculable } from "@/lib/types";

/**
 * Pasos reales para poner el perfil en público, por plataforma — sin esto,
 * "tu perfil tiene que ser público" es una frase que no dice DÓNDE tocar, y
 * cada vez que la app escale un poco más esto va a pasar muchísimo (ver el
 * caso real de Israel/Fendetesta11, cuya primera sincronización falló en
 * silencio). `<details>` en vez de un componente cliente: no hace falta
 * JavaScript para un desplegable, y así sirve igual en Server Components.
 */
const STEPS: Record<PlataformaVinculable, string[]> = {
  psn: [
    "Desde la consola (PS5/PS4): Ajustes → Usuarios y cuentas → Privacidad → Personalizar.",
    "Busca \"Nivel de trofeos, juegos y vitrinas\" (o \"Trofeos\") y ponlo en \"Cualquiera\" / \"Todo el mundo\".",
    "Si lo prefieres desde el móvil: app de PlayStation → tu perfil → icono de ajustes → Privacidad de la cuenta → Trofeos.",
    "El cambio es inmediato — no hace falta reiniciar sesión ni esperar.",
  ],
  steam: [
    "Entra en tu perfil de Steam (web o cliente) → \"Editar perfil\" → \"Ajustes de privacidad\".",
    "Pon \"Detalles de mi perfil\" en Público.",
    "Este es el que casi todo el mundo se salta: pon \"Detalles del juego\" TAMBIÉN en Público — sin él, Steam no deja leer tu biblioteca aunque el perfil ya sea público.",
    "Pulsa \"Guardar cambios\" al final de la página.",
  ],
  xbox: [
    "En la consola o en la app Xbox: tu perfil → \"Privacidad y seguridad en línea\" → \"Ver detalles y personalizar\".",
    "Busca \"Historial de juego y estadísticas\" (o \"Compartir contenido\") y ponlo en \"Todos\".",
    "Xbox usa un servicio de terceros no oficial (OpenXBL) para leer esto — si tu perfil ya es público y sigue sin funcionar, no es tu ajuste, prueba de nuevo más tarde.",
  ],
};

const TITLE: Record<PlataformaVinculable, string> = {
  psn: "¿Dónde pongo mi perfil de PSN en público?",
  steam: "¿Dónde pongo mi perfil de Steam en público?",
  xbox: "¿Dónde pongo mi historial de Xbox en público?",
};

export function PrivacyGuide({ platform }: { platform: PlataformaVinculable }) {
  return (
    <details className="mt-2 rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
      <summary className="cursor-pointer select-none font-semibold text-accent">{TITLE[platform]}</summary>
      <ol className="mt-3 space-y-2 pl-4 text-muted marker:text-accent" style={{ listStyleType: "decimal" }}>
        {STEPS[platform].map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </details>
  );
}
