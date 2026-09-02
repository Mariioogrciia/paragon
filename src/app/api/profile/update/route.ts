import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    
    // We update everything but the email, because email is linked to the OAuth provider
    
    const db = getDb();
    await db.update(users).set({
      handle: handle ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      language: language ?? "es-ES",
      timezone: timezone ?? "Europe/Madrid",
    }).where(eq(users.id, session.user.id));

    // Redirect back to settings page
    return NextResponse.redirect(new URL("/ajustes", request.url));
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.redirect(new URL("/ajustes?error=update_failed", request.url));
  }
}
