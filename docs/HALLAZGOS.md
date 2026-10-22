# Lo que se descubrió al conectar PSN de verdad

Fecha: 2026-09-02. Todo esto está comprobado ejecutando contra la API real, no
deducido de la documentación.

## 1. PSN no deja leer los trofeos de cualquiera

Es el hallazgo que más condiciona el diseño.

| Cuenta consultada | Resultado |
|---|---|
| La del token del servidor | ✅ 265 juegos |
| Un amigo *de PlayStation* de esa cuenta | ✅ 38 juegos |
| Un desconocido (perfil famoso, público) | ❌ falla |

También falla `getUserTrophyProfileSummary` sobre un desconocido, con
`"Not permitted by access control"`.

**Consecuencia:** la idea de "una credencial de servidor lee el perfil público de
cualquiera" —que es como parecía funcionar Trophies Hunter— **no se sostiene**.
Sony restringe los trofeos a la propia cuenta y a sus amigos de PSN.

### Cómo se ha resuelto

Persistiendo en Postgres todo lo que se lee (tablas `game`, `game_trophy`,
`user_game`, `user_trophy`). Las páginas leen de nuestra base, nunca de Sony.

Eso separa dos cosas que antes estaban pegadas:

- **Ingesta** (traer los datos): limitada por PSN a la cuenta del servidor y sus
  amigos de PlayStation.
- **Consulta** (verlos): sin límite. Un amigo *de la plataforma* ve tu progreso
  aunque PSN nunca le dejaría consultarlo, porque se lo servimos nosotros.

El requisito de "ver los trofeos de mis amigos de la plataforma, no de PSN" queda
así resuelto. Lo que sigue limitado es de quién podemos importar.

### Lo que queda por decidir

Para que se dé de alta alguien que no sea amigo de PSN de la cuenta del servidor,
hay dos caminos:

1. **Cada usuario aporta su propio NPSSO.** Funciona con cualquiera, pero implica
   guardar credenciales de terceros (habría que cifrarlas en reposo) y que el
   usuario repita el proceso cada ~2 meses, que es justo la fricción que se
   quería evitar.
2. **Aceptar el límite**: solo entra gente que sea amiga en PSN de la cuenta del
   servidor. Para el caso real (Mario, su padre, sus colegas de partida) basta,
   porque ya son amigos en PlayStation.

## 2. No hay "Iniciar sesión con PlayStation" para terceros

Sony tiene OAuth 2.0 y existen integraciones (FusionAuth documenta un proveedor
de PSN), pero requieren credenciales de cliente del programa de partners de
PlayStation, no accesibles para un proyecto personal. La vía de la comunidad
sigue siendo el token NPSSO copiado a mano.

**Apple** sí es viable como proveedor de login, pero exige cuenta de Apple
Developer de pago (99 $/año). Google y Discord son gratis.

## 3. El progreso parcial de los trofeos no existe

Se comprobó en cinco juegos de PS5 a medias (Red Dead Redemption, EA FC 26,
Cyberpunk 2077, AC Mirage, Clair Obscur): **ni uno solo** trae
`trophyProgressTargetValue` ni un campo `progress`.

O sea, el "llevas 31 de 48 cuervos" **no está en los datos**. El código que lo
pinta se queda (no molesta, y se activaría si algún día apareciera), pero no debe
presentarse como funcionalidad. El orden de "próximos pasos" se decide entonces
solo por rareza: lo que más gente consigue primero.

## 4. El nivel de trofeos venía mal

`getProfileFromUserName().trophySummary.level` devuelve **0** para cuentas
ajenas. El nivel real está en `getUserTrophyProfileSummary()`, que además puede
denegar el acceso. Ya está corregido: se pide aparte y puede quedarse en null.

## 5. Supabase: la conexión directa es solo IPv6

`db.<ref>.supabase.co` no tiene registro A, solo AAAA. Desde una red IPv4 la
conexión **se queda colgada sin dar error**. Hay que usar los poolers:

- `DATABASE_URL` → transaction pooler, puerto 6543 (la app).
- `DIRECT_URL` → session pooler, puerto 5432 (las migraciones; el de
  transacciones no mantiene sesión y el DDL falla).

Ojo: en los poolers el usuario es `postgres.<ref>`, no `postgres`.

## Estado verificado

Ejecutado de extremo a extremo con la cuenta real (`npx tsx --conditions
react-server scripts/probar-sync.mts <accountId>`):

- 265 juegos importados de PSN y guardados.
- Releídos correctamente desde la base de datos.
- 60 trofeos de un juego, con rareza (el más raro al 0,6%).
- Nivel de la cuenta: 345, con 23 platinos y 4.442 trofeos.

**Sin verificar todavía:** todo lo que pasa por el navegador. El login OAuth no se
ha probado nunca porque faltan las credenciales de Google/Discord.
