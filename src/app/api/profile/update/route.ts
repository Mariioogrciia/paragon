import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getParagonLevel } from "@/lib/paragonLevel";
import { FRAME_REQUISITOS } from "@/lib/level";
import { normalizeSectionOrder } from "@/lib/profileSections";

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
    const profileColor = formData.get("profileColor") as string | null;
    const profileFrameSolicitado = formData.get("profileFrame") as string | null;
    const statusText = formData.get("statusText") as string | null;
    const theme = formData.get("theme") as string | null;
    const profileSectionOrderRaw = formData.get("profileSectionOrder") as string | null;

    // El desplegable de /ajustes dice "Nivel 10+/50+/100+", pero hasta ahora
    // nada lo comprobaba: cualquiera podía guardar el marco de fuego a nivel
    // 1. Se recalcula el nivel real aquí, en el servidor, en vez de fiarse de
    // lo que mande el formulario.
    let profileFrame = profileFrameSolicitado?.trim() || null;
    if (profileFrame && FRAME_REQUISITOS[profileFrame] !== undefined) {
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
      handle: handle ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      language: language ?? "es-ES",
      timezone: timezone ?? "Europe/Madrid",
      profileTitle: profileTitle?.trim().slice(0, 60) || null,
      profileBackgroundGameId: profileBackgroundGameId?.trim() || null,
      profileBannerUrl: profileBannerUrl?.trim() || null,
      profileColor: profileColor?.trim() || null,
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
