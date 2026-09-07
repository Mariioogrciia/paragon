import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportarDatosUsuario } from "@/lib/exportData";

/**
 * Descarga de "Tu legado" — todo lo que Paragon sabe del usuario, en JSON.
 *
 * Ruta de API y no una acción de servidor: una acción de servidor no puede
 * devolver un archivo para descargar con su propia cabecera
 * `Content-Disposition`, solo datos a React. Aquí sí, con una respuesta HTTP
 * normal.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  }

  try {
    const datos = await exportarDatosUsuario(session.user.id);
    const nombreArchivo = `paragon-export-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(datos, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        // Nunca cachear: son datos personales de quien pide, no contenido
        // compartido entre visitantes.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[exportarDatosUsuario]", error);
    return NextResponse.json({ error: "No se pudo generar la exportación." }, { status: 500 });
  }
}
