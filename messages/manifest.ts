/**
 * Lista de namespaces de traduccion. Cada uno es una carpeta en `messages/`
 * con un `es.json`/`en.json`/`de.json`/`fr.json` (misma forma, mismas
 * claves, texto en cada idioma) — ver `messages/Entrar/*.json` de ejemplo.
 *
 * Por que namespaces en carpetas separadas y no un unico JSON gigante por
 * idioma: varias personas/agentes traduciendo secciones distintas a la vez
 * necesitan archivos distintos, si no se pisan las ediciones entre si.
 * `request.ts` los funde en un solo objeto de mensajes en tiempo de
 * peticion, bajo la clave que le da nombre a la carpeta (asi que
 * `messages/Biblioteca/es.json` se usa en componentes con
 * `useTranslations("Biblioteca")`).
 *
 * Al anadir un namespace nuevo, se registra aqui — es el UNICO sitio que
 * hay que tocar aparte de la propia carpeta de mensajes.
 */
export const NAMESPACES = [
  "Entrar",
  "Shell",
  "Onboarding",
  "Biblioteca",
  "Perfil",
  "Descubrir",
  "Analitica",
  "Admin",
] as const;
