import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getParagonLevel } from "@/lib/paragonLevel";
import { FRAME_REQUISITOS } from "@/lib/level";
import { normalizeSectionOrder } from "@/lib/profileSections";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";
import { isHandleTaken } from "@/lib/profiles";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const IDIOMA_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

function esUrlHttp(valor: string): boolean {
  if (valor.length > 2048) return false;
  try {
    const { protocol } = new URL(valor);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function esZonaHoraria(valor: string): boolean {
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: valor });
    return true;
  } catch {
    return false;
  }
}

const TEMAS_VALIDOS = ["dark", "light", "oled", "high-contrast"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/entrar", request.url));
    }

    const formData = await request.formData();
    const handle = formData.get("handle") as string | null;
    const firstName = formData.get("firstName") as string | null;
    const lastName = formData.get("lastName") as string | null;
    const language = formData.get("language") as string | null;
    const timezone = formData.get("timezone") as string | null;
    const profileTitle = formData.get("profileTitle") as string | null;
    const profileBackgroundGameId = formData.get("profileBackgroundGameId") as string | null;
    const profileBannerUrl = formData.get("profileBannerUrl") as string | null;
    const image = formData.get("image") as string | null;
    const profileColor = formData.get("profileColor") as string | null;
    const profileFrameSolicitado = formData.get("profileFrame") as string | null;
    const statusText = formData.get("statusText") as string | null;
    const theme = formData.get("theme") as string | null;
    const profileSectionOrderRaw = formData.get("profileSectionOrder") as string | null;

    // Bloquea el guardado entero si cualquiera de los campos que otros
    // pueden ver (nombre, título, estado) lleva lenguaje ofensivo — nada
    // ofensivo llega a guardarse, ni siquiera el resto de campos "limpios"
    // del mismo envío, para no complicar qué se guardó y qué no.
    const textosAComprobar = [handle, firstName, lastName, profileTitle, statusText].filter(
      (v): v is string => Boolean(v && v.trim()),
    );
    if (textosAComprobar.some((texto) => contieneLenguajeOfensivo(texto))) {
      return NextResponse.redirect(new URL("/ajustes?error=contenido_ofensivo", request.url));
    }

    // Mismas reglas que `chooseHandleAction` (actions.ts) y
    // /api/mobile/profile/handle — antes esta ruta guardaba el handle tal
    // cual llegaba (auditoría del 25 sept 2026): vacío, con espacios,
    // mayúsculas o "/" rompía `/u/[handle]`. Un campo vacío ya no borra el
    // handle: se deja el que había.
    const handleNormalizado = handle?.trim().toLowerCase() || null;
    if (handleNormalizado) {
      if (!HANDLE_RE.test(handleNormalizado)) {
        return NextResponse.redirect(new URL("/ajustes?error=handle_invalido", request.url));
      }
      if (await isHandleTaken(handleNormalizado, session.user.id)) {
        return NextResponse.redirect(new URL("/ajustes?error=handle_cogido", request.url));
      }
    }

    // Resto de campos libres (auditoría del 25 sept 2026): el color acababa
    // en `--accent` y las URLs en `url(...)`/`<img>` del perfil público sin
    // comprobar nada. Imagen y banner: solo http(s) — o `preset:` en el
    // banner (ver lib/bannerPresets.ts). Un valor inválido corta el guardado
    // entero, igual que el filtro de lenguaje de arriba.
    const imagen = image?.trim() || null;
    const banner = profileBannerUrl?.trim() || null;
    const color = profileColor?.trim() || null;
    const zona = timezone?.trim() || "Europe/Madrid";
    if (
      (imagen && !esUrlHttp(imagen)) ||
      (banner && !banner.startsWith("preset:") && !esUrlHttp(banner)) ||
      (color && !COLOR_RE.test(color)) ||
      !esZonaHoraria(zona)
    ) {
      return NextResponse.redirect(new URL("/ajustes?error=datos_invalidos", request.url));
    }

    // El desplegable de /ajustes dice "Nivel 10+/50+/100+", pero hasta ahora
    // nada lo comprobaba: cualquiera podía guardar el marco de fuego a nivel
    // 1. Se recalcula el nivel real aquí, en el servidor, en vez de fiarse de
    // lo que mande el formulario.
    let profileFrame = profileFrameSolicitado?.trim() || null;
    // Un marco que no existe se descarta (antes se guardaba tal cual).
    if (profileFrame && FRAME_REQUISITOS[profileFrame] === undefined) profileFrame = null;
    if (profileFrame) {
      const nivel = await getParagonLevel(session.user.id);
      if (nivel.level < FRAME_REQUISITOS[profileFrame]) profileFrame = null;
    }

    let profileSectionOrder: string[] | null = null;
    if (profileSectionOrderRaw) {
      try {
        const parsed = JSON.parse(profileSectionOrderRaw);
        if (Array.isArray(parsed)) profileSectionOrder = normalizeSectionOrder(parsed);
      } catch {
        // Orden inválido: se ignora y se guarda `null` (orden por defecto).
      }
    }

    // We update everything but the email, because email is linked to the OAuth provider

    const db = getDb();
    await db.update(users).set({
      ...(handleNormalizado ? { handle: handleNormalizado } : {}),
      firstName: firstName?.trim().slice(0, 50) || null,
      lastName: lastName?.trim().slice(0, 50) || null,
      language: language && IDIOMA_RE.test(language) ? language : "es-ES",
      timezone: zona,
      profileTitle: profileTitle?.trim().slice(0, 60) || null,
      profileBackgroundGameId: profileBackgroundGameId?.trim().slice(0, 200) || null,
      profileBannerUrl: banner,
      image: imagen,
      ...(imagen ? { avatarPersonalizado: true } : {}),
      profileColor: color,
      profileFrame,
      statusText: statusText?.trim().slice(0, 100) || null,
      theme: theme && TEMAS_VALIDOS.includes(theme) ? theme : "dark",
      profileSectionOrder,
    }).where(eq(users.id, session.user.id));

    // Redirect back to settings page
    return NextResponse.redirect(new URL("/ajustes", request.url));
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.redirect(new URL("/ajustes?error=update_failed", request.url));
  }
}
