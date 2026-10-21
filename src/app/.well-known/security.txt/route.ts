import { dominioPublico } from "@/lib/site";

/**
 * /.well-known/security.txt (RFC 9116, 21 oct 2026): a quién avisar si
 * alguien encuentra un fallo de seguridad. El contacto es la página de
 * privacidad, que ya tiene el correo del responsable (no se repite aquí).
 * `Expires` es obligatorio: se calcula a un año vista en cada despliegue.
 */
export function GET() {
  const dominio = dominioPublico();
  const caduca = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const texto = [
    `Contact: ${dominio}/privacidad`,
    `Expires: ${caduca}`,
    "Preferred-Languages: es, en",
    `Canonical: ${dominio}/.well-known/security.txt`,
    `Policy: ${dominio}/terminos`,
    "",
  ].join("\n");
  return new Response(texto, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
