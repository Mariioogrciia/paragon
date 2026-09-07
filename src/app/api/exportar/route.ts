import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportarDatosUsuario } from "@/lib/exportData";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const data = await exportarDatosUsuario(session.user.id);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="paragon-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("[exportarDatosUsuario] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
