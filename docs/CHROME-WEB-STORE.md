# Publicar la extensión en la Chrome Web Store

Todo lo que pide el formulario, listo para copiar (23 oct 2026). El paquete
es `public/descargas/paragon-extension.zip` (`npm run extension:zip`).

## Pasos (los hace el usuario: son su cuenta y su pago)

1. Darse de alta como desarrollador en
   https://chrome.google.com/webstore/devconsole (pago único de 5 US$).
2. "Nuevo elemento" → subir `public/descargas/paragon-extension.zip`.
3. Rellenar las pestañas con lo de abajo y enviar a revisión. Suele tardar
   de unos días a un par de semanas; las extensiones con permisos de host
   (como esta) se revisan más a fondo.
4. Cuando esté publicada, en Vercel: `NEXT_PUBLIC_EXTENSION_STORE_URL` =
   la URL de la ficha (`https://chromewebstore.google.com/detail/…`) y
   volver a desplegar. Ajustes → Plataformas pasa a enlazar a la tienda en
   vez de a la descarga.
5. Opcional: la misma subida vale para Edge Add-ons
   (https://partner.microsoft.com/dashboard/microsoftedge), gratis.

**Antes de enviarla**, lo que ya apuntaba `extension/README.md`:
- Un icono de 128×128 con margen (hoy es el logo tal cual) y, para la
  ficha, al menos una captura de 1280×800 y el mosaico de 440×280.
- La parte de PSN lee la sesión de playstation.com del propio usuario: es un
  uso no oficial. Si la revisión pone pegas, la opción es publicar una
  versión solo con Epic (quitar `ca.account.sony.com` de `host_permissions`
  y el botón de PSN del popup).

## Ficha

- **Nombre**: viene del manifest (`__MSG_nombre__`, 6 idiomas).
- **Categoría**: Entretenimiento.
- **Idioma principal**: Español.
- **Descripción breve** (máx. 132): viene del manifest (`__MSG_descripcion__`).
- **Descripción detallada**:

> Paragon junta tus trofeos y logros de PlayStation, Steam, Xbox y Epic en un
> solo perfil (https://www.paragontrophies.com).
>
> Esta extensión hace dos cosas, siempre desde tu propio navegador y con tu
> propia sesión:
>
> • Epic Games: lee tus logros desde tu página «Mis logros» de la Epic Games
> Store y los envía a tu cuenta de Paragon. Epic no deja leerlos desde
> servidores, así que lo hace tu navegador, con las mismas peticiones que ya
> hace esa página.
> • PlayStation: sincroniza tus trofeos sin que tengas que copiar ningún
> código a mano. Paragon lo usa una vez y no lo guarda.
>
> No pide contraseñas, no lee otras webs y no guarda nada más que el enlace
> con tu cuenta de Paragon. Puedes desconectarla cuando quieras.
>
> Paragon no está afiliado a Sony, Microsoft, Valve ni Epic Games.

## Prácticas de privacidad

- **Propósito único**: "Sincronizar con Paragon los trofeos de PlayStation y
  los logros de Epic Games del propio usuario, leídos desde su sesión en el
  navegador."
- **Justificación de permisos**:
  - `storage`: guardar el token que enlaza la extensión con la cuenta de
    Paragon del usuario (se crea al pulsar «Conectar con Paragon»).
  - `https://store.epicgames.com/*`: leer, en la página «Mis logros» del
    propio usuario, sus logros de Epic (las mismas consultas que hace esa
    página) y enseñar el aviso de resultado.
  - `https://ca.account.sony.com/*`: obtener el código de sesión de
    PlayStation del propio usuario para sincronizar sus trofeos, sin
    copiarlo a mano. Se envía a Paragon una vez y no se guarda.
  - `https://www.paragontrophies.com/*` (y `platinos-nine.vercel.app`, el
    dominio antiguo): enviar los datos a la cuenta de Paragon del usuario y
    marcar en Ajustes que la extensión está instalada.
- **¿Código remoto?** No.
- **Datos que recoge** (marcar):
  - *Información de autenticación*: el código de sesión de PlayStation (se
    envía a Paragon una vez para sincronizar, no se guarda) y el token de la
    extensión.
  - *Contenido del sitio web*: los logros de Epic del usuario.
- **Certificaciones**: no se venden datos a terceros; no se usan para nada
  ajeno al propósito único; no se usan para solvencia ni préstamos.
- **Política de privacidad**: https://www.paragontrophies.com/privacidad
