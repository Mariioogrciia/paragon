# Platinos

Rastreador de trofeos de PlayStation: tu progreso, el de tus amigos, y qué te
falta para el siguiente platino.

Next.js 16 · TypeScript · Tailwind v4 · Auth.js · Drizzle + Postgres · psn-api

## Cómo está montado

**El token de PSN es del servidor, no de cada usuario.** Hay un solo `PSN_NPSSO`
para toda la app, y con él se leen los perfiles *públicos* de todo el mundo. Por
eso un usuario solo escribe su ID de PlayStation al registrarse: nadie más tiene
que entregar credenciales de Sony, y nosotros no almacenamos secretos ajenos. El
precio es que un perfil de trofeos en privado no se puede sincronizar.

**El login de la app es cosa aparte**, con Google o Discord vía Auth.js. No
guardamos contraseñas.

**Los amigos se añaden por handle de plataforma** (`@mario_gg`), no por PSN ID.
El handle lo elige el usuario y es lo que se comparte.

```
src/
  auth.ts              Auth.js: proveedores, sesión, adaptador
  db/schema.ts         Tablas de Auth.js + psn_profile + friendship
  lib/psn/auth.ts      NPSSO -> access token, con renovación y caché
  lib/psn/client.ts    Llamadas a PSN traducidas a nuestro modelo
  lib/profiles.ts      Único punto de acceso a datos (BD + PSN + caché)
  lib/stats.ts         Progreso, próximos pasos, comparativas
  app/                 Páginas y server actions
```

Las páginas nunca hablan con PSN ni con la base de datos directamente: pasan por
`lib/profiles.ts`. Añadir Steam o Xbox algún día se hace ahí, sin tocar pantallas.

## Puesta en marcha

1. `npm install`
2. `cp .env.example .env.local` y rellenarlo (ver abajo).
3. `npx drizzle-kit push` para crear las tablas.
4. `npm run dev`

### Qué hay que conseguir para `.env.local`

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Un Postgres gestionado: Neon, Supabase o Vercel Postgres. |
| `AUTH_SECRET` | `npx auth secret` lo genera y lo escribe solo. |
| `AUTH_GOOGLE_ID` / `_SECRET` | Google Cloud Console → Credenciales → ID de cliente OAuth (aplicación web). Redirect: `http://localhost:3000/api/auth/callback/google` |
| `AUTH_DISCORD_ID` / `_SECRET` | Discord Developer Portal → Applications → OAuth2. Redirect: `http://localhost:3000/api/auth/callback/discord` |
| `PSN_NPSSO` | Con sesión iniciada en playstation.com, abrir `https://ca.account.sony.com/api/v1/ssocookie` y copiar el campo `npsso`. Caduca cada ~2 meses. |

Al desplegar hay que repetir los redirect URI con el dominio real y volver a
cargar las variables en Vercel.

## Limitaciones conocidas

- **El progreso parcial de un trofeo** ("31 de 48 cuervos") solo lo exponen
  algunos juegos de PS5, y el campo con el valor actual no está declarado en los
  tipos de `psn-api`. Se lee de forma defensiva: si no viene, no se muestra.
- **Qué coleccionable concreto llevas** no lo da ninguna API: vive en el save del
  juego, cifrado y distinto en cada título. No se puede resolver a escala.
- **`npm audit`** marca un `esbuild` antiguo que entra por `drizzle-kit`. Es una
  dependencia de desarrollo y el fallo afecta al dev server de esbuild, que aquí
  no se usa; el "arreglo" degradaría drizzle-kit varias versiones mayores.
