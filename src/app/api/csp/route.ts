import { resumenInformeCsp } from "@/lib/csp";
import { registrar } from "@/lib/registro";
import { dentroDelLimite, ipDe } from "@/lib/rateLimit";

/**
 * Informes de la CSP en modo solo informar (lib/csp.ts). Se apuntan en
 * Admin → Registro como aviso, una vez por hora por cada (directiva,
 * origen bloqueado): un mismo fallo sale en cada visita de cada persona y
 * llenaría el registro.
 */
export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const informe = resumenInformeCsp(cuerpo);
  if (informe) {
    const porIp = await dentroDelLimite(`csp:${ipDe(request.headers)}`, 20, 600);
    const nuevo = porIp && (await dentroDelLimite(`csp:${informe.directiva}:${informe.bloqueado}`, 1, 3600));
    if (nuevo) await registrar("aviso", "cliente", `CSP bloquearía ${informe.bloqueado || "algo"} (${informe.directiva})`, informe);
  }
  return new Response(null, { status: 204 });
}
