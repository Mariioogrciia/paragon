# Publicar Paragon en Google Play

Todo lo que pide la tienda ya está preparado aquí (16 oct 2026). Lo único
que no se puede hacer desde el código es la cuenta de desarrollador, el
pago y rellenar los formularios de Play Console. Esta guía dice qué poner
en cada uno.

| Carpeta | Qué hay |
|---|---|
| `ficha/<idioma>/` | `titulo.txt` (≤30), `corta.txt` (≤80) y `completa.txt` (≤4000) en es-ES, en-US, de-DE y fr-FR |
| `graficos/icono-512.png` | Icono de la tienda (512 × 512) |
| `graficos/<idioma>/destacado.png` | Gráfico de funciones (1024 × 500) |
| `graficos/<idioma>/telefono-N.png` | Capturas del móvil (1080 × 1920) |
| `novedades/whatsnew-<idioma>` | "Novedades" de la versión; las sube el workflow |

Los gráficos se rehacen con `npm run graficos-play` dentro de `video/`. Las
capturas salen de `video/public/capturas/app-*.jpg`: hoy son dos y con la
app en español. Google pide 2 como mínimo; con 4-8 la ficha luce más.
Para añadir más, se ponen en esa carpeta y se suman a `CAPTURAS` y
`TEXTOS` de `video/graficos-play.mjs`.

## 1. Cuenta y app

1. Crear la cuenta en https://play.google.com/console (25 $, pago único).
   Google pide verificar la identidad y, en cuentas personales, un teléfono.
2. **Ojo, cuentas personales nuevas**: antes de poder publicar en
   producción, Google exige una **prueba cerrada con al menos 12 personas
   durante 14 días seguidos**. Es el momento de pasar la app a los amigos.
3. "Crear aplicación": nombre `Paragon`, idioma por defecto español (España),
   Aplicación, Gratis.
4. El nombre del paquete es `com.paragon.app`: se fija con el primer AAB
   que se sube y no se puede cambiar nunca.

## 2. Clave de firma (una vez)

```bash
keytool -genkeypair -v -keystore paragon-release.jks -alias paragon \
  -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 paragon-release.jks   # → secreto ANDROID_KEYSTORE_BASE64
```

Secretos del repo (Settings → Secrets and variables → Actions):
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
(`paragon`) y `ANDROID_KEY_PASSWORD`. Guarda el `.jks` y las contraseñas
fuera del ordenador también. En Play Console, deja activada la **firma de
apps de Google Play** (la opción por defecto): así, si un día se pierde esta
clave, Google puede cambiar la de subida.

## 3. Primera subida (a mano)

La API de Play no deja subir el primer AAB de una app nueva: el primero va
a mano.

1. Actions → "Publicar en las tiendas" → Run workflow → plataforma
   `android`. Descarga el artefacto `paragon-android-aab`.
2. Play Console → Pruebas → Prueba interna → Crear versión → sube el `.aab`.
   Novedades: el texto de `novedades/whatsnew-es-ES`.

## 4. Subidas siguientes (automáticas)

1. Play Console → Configuración → Acceso a la API → crear/vincular un
   proyecto de Google Cloud y una **cuenta de servicio**; en Google Cloud,
   crear una clave JSON para ella.
2. Play Console → Usuarios y permisos → invitar el correo de la cuenta de
   servicio con permiso de "Publicar versiones" en Paragon.
3. Secreto del repo `PLAY_SERVICE_ACCOUNT_JSON` = el contenido del JSON.
4. Desde entonces, el mismo workflow firma el AAB **y lo sube** a la pista
   que elijas (`internal` por defecto). `estado_play`: `draft` mientras la
   app no esté publicada ninguna vez; después, `completed`.
   El `versionCode` es el número de ejecución del workflow, así que siempre
   sube.

## 5. Ficha de la tienda

Presencia en Google Play → Ficha principal: copiar `ficha/<idioma>/*.txt` y
subir los gráficos de `graficos/`. Añadir las traducciones (inglés, alemán
y francés) con "Gestionar traducciones". Correo de contacto: el tuyo.
Sitio web: la dirección de la web (o el dominio propio cuando lo haya).

## 6. Formularios de "Contenido de la aplicación"

- **Política de privacidad**: `https://<la web>/privacidad`.
- **Acceso a la aplicación**: hace falta iniciar sesión. Instrucciones para
  quien revisa: "Inicia sesión con cualquier cuenta de Google o Discord y
  vincula un ID público de PlayStation, Steam o Xbox (por ejemplo, una
  cuenta de Steam con el perfil en público)". Si piden una cuenta fija, crea
  una de Google solo para esto y dásela.
- **Anuncios**: no tiene anuncios.
- **Clasificación de contenido**: cuestionario IARC, tipo "Todos los demás
  tipos de apps" (no es un juego). Interacción entre usuarios: sí (amigos,
  comentarios, clanes). Sin violencia, sexo, apuestas, ubicación ni
  compras.
- **Categoría de la tienda**: Entretenimiento.
- **Público objetivo**: 13 años o más (hay contenido de otros usuarios y
  login con Google/Discord). No marcar que atrae a niños.
- **Seguridad de los datos** (Data safety):
  - Recoge datos: sí. Cifrados en tránsito: sí. Se pueden borrar: sí, con
    la URL `https://<la web>/eliminar-cuenta`.
  - *Información personal*: nombre y correo (de la cuenta de Google o
    Discord) — para la cuenta; obligatorio.
  - *Identificadores de usuario*: el ID de PlayStation/Steam/Xbox que
    vinculas — funcionalidad de la app.
  - *Actividad en apps*: juegos, trofeos y progreso; lo que escribes
    (reseñas, comentarios, notas) — funcionalidad de la app.
  - *Identificadores del dispositivo*: el token de notificaciones de
    Firebase — para los avisos.
  - Compartidos con terceros: no (Firebase y el alojamiento son
    proveedores que trabajan para la app, eso no cuenta como compartir).
  - Sin analíticas ni informes de fallos en la app (solo usa Firebase
    Messaging para los avisos).
- **Eliminación de la cuenta**: dentro de la app, Ajustes → "Eliminar
  cuenta" (abajo del todo). URL pública: `https://<la web>/eliminar-cuenta`.
- **Permisos**: solo internet y notificaciones. El lector de QR usa el
  escáner de Google Play Services, sin permiso de cámara.
- **App de noticias / salud / finanzas / VPN**: no.

## 7. De prueba interna a producción

Prueba interna (hasta 100 personas, sin revisión larga) → prueba cerrada
(los 12 durante 14 días si la cuenta es personal) → solicitar acceso a
producción → Producción. Cada paso es "promocionar versión" en Play
Console, o lanzar el workflow con `pista_play` = `alpha`/`production`.
