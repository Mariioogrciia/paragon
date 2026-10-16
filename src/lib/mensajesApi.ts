import { NextResponse } from "next/server";
import { idiomaDeCabecera, type Idioma } from "@/lib/idiomasTrofeo";

/**
 * Mensajes de error de /api/mobile en el idioma del teléfono (4 oct 2026).
 *
 * La app Android está en es/en/de/fr, pero los errores que llegan del
 * servidor (`{ error: "..." }`) se escriben en español por todo el código —
 * en las rutas y en las librerías que comparte con la web (PSN, Steam,
 * clanes...). En vez de reescribir cada `throw`, se traducen aquí, al
 * salir: texto exacto → traducción, o patrón con huecos para los que llevan
 * un nombre dentro. Lo que no esté en la lista sale tal cual (en español),
 * que es mejor que nada. Al añadir un error nuevo a la API móvil, añadirlo
 * aquí también.
 */

type Trad = { en: string; de: string; fr: string };

const FIJOS: Record<string, Trad> = {
  "No autenticado": { en: "Not signed in", de: "Nicht angemeldet", fr: "Non connecté" },
  "Demasiadas peticiones seguidas. Espera un momento.": { en: "Too many requests in a row. Wait a moment.", de: "Zu viele Anfragen hintereinander. Warte kurz.", fr: "Trop de requêtes d'affilée. Patiente un instant." },
  "Perfil sin terminar de configurar": { en: "Profile setup not finished", de: "Profil noch nicht fertig eingerichtet", fr: "Profil pas encore configuré" },
  "Clan no encontrado": { en: "Clan not found", de: "Clan nicht gefunden", fr: "Clan introuvable" },
  "Escudo no válido": { en: "Invalid crest", de: "Ungültiges Wappen", fr: "Blason non valide" },
  "Tu rango en el clan no permite editarlo": { en: "Your clan rank can't edit it", de: "Dein Clan-Rang erlaubt das Bearbeiten nicht", fr: "Ton rang dans le clan ne permet pas de le modifier" },
  "Tu rango en el clan no permite invitar": { en: "Your clan rank can't invite", de: "Dein Clan-Rang erlaubt keine Einladungen", fr: "Ton rang dans le clan ne permet pas d'inviter" },
  "Tu rango en el clan no permite ese cambio": { en: "Your clan rank can't make that change", de: "Dein Clan-Rang erlaubt diese Änderung nicht", fr: "Ton rang dans le clan ne permet pas ce changement" },
  "Tu rango en el clan no permite expulsar a esa persona": { en: "Your clan rank can't kick that person", de: "Dein Clan-Rang erlaubt nicht, diese Person zu entfernen", fr: "Ton rang dans le clan ne permet pas d'exclure cette personne" },
  "No puedes cambiar tu propio rango": { en: "You can't change your own rank", de: "Du kannst deinen eigenen Rang nicht ändern", fr: "Tu ne peux pas changer ton propre rang" },
  "Para irte, usa Abandonar clan": { en: "To leave, use Leave clan", de: "Zum Verlassen nutze „Clan verlassen“", fr: "Pour partir, utilise Quitter le clan" },
  "Esa persona no está en el clan": { en: "That person isn't in the clan", de: "Diese Person ist nicht im Clan", fr: "Cette personne n'est pas dans le clan" },
  "Rango no válido": { en: "Invalid rank", de: "Ungültiger Rang", fr: "Rang non valide" },
  "Ya estás en un clan. Sal de él para unirte a otro.": { en: "You're already in a clan. Leave it to join another.", de: "Du bist schon in einem Clan. Verlass ihn, um einem anderen beizutreten.", fr: "Tu es déjà dans un clan. Quitte-le pour en rejoindre un autre." },
  "El nombre debe tener entre 3 y 40 caracteres": { en: "The name must be 3 to 40 characters", de: "Der Name muss 3 bis 40 Zeichen haben", fr: "Le nom doit faire entre 3 et 40 caractères" },
  "La descripción no puede pasar de 200 caracteres": { en: "The description can't exceed 200 characters", de: "Die Beschreibung darf höchstens 200 Zeichen haben", fr: "La description ne peut pas dépasser 200 caractères" },
  "Ya existe un clan con ese nombre": { en: "A clan with that name already exists", de: "Es gibt schon einen Clan mit diesem Namen", fr: "Un clan porte déjà ce nom" },
  "No tienes esa plataforma vinculada.": { en: "You don't have that platform linked.", de: "Diese Plattform ist nicht verknüpft.", fr: "Cette plateforme n'est pas liée." },
  "Esa plataforma se sincroniza con la extensión del navegador.": { en: "That platform syncs through the browser extension.", de: "Diese Plattform wird über die Browser-Erweiterung synchronisiert.", fr: "Cette plateforme se synchronise via l'extension du navigateur." },
  "Ya se sincronizó hace muy poco. Espera un par de minutos.": { en: "It synced very recently. Wait a couple of minutes.", de: "Gerade erst synchronisiert. Warte ein paar Minuten.", fr: "Synchronisé il y a très peu. Attends quelques minutes." },
  "Plataforma no válida": { en: "Invalid platform", de: "Ungültige Plattform", fr: "Plateforme non valide" },
  "No hay ninguna invitación pendiente a esa liga.": { en: "There's no pending invite to that league.", de: "Es gibt keine offene Einladung zu dieser Liga.", fr: "Aucune invitation en attente pour cette ligue." },
  "No existe ese usuario": { en: "That user doesn't exist", de: "Diese Person gibt es nicht", fr: "Cet utilisateur n'existe pas" },
  "Ya perteneces a un clan. Abandónalo primero.": { en: "You're already in a clan. Leave it first.", de: "Du bist schon in einem Clan. Verlass ihn zuerst.", fr: "Tu es déjà dans un clan. Quitte-le d'abord." },
  "Trofeo no encontrado": { en: "Trophy not found", de: "Trophäe nicht gefunden", fr: "Trophée introuvable" },
  "Solo puedes invitar a amigos.": { en: "You can only invite friends.", de: "Du kannst nur Freunde einladen.", fr: "Tu ne peux inviter que des amis." },
  "Solo el dueño puede invitar.": { en: "Only the owner can invite.", de: "Nur der Besitzer kann einladen.", fr: "Seul le créateur peut inviter." },
  "Solo el dueño puede cambiar el reto.": { en: "Only the owner can change the challenge.", de: "Nur der Besitzer kann die Herausforderung ändern.", fr: "Seul le créateur peut changer le défi." },
  "Ponle un nombre a la liga.": { en: "Give the league a name.", de: "Gib der Liga einen Namen.", fr: "Donne un nom à la ligue." },
  "Perfil no encontrado": { en: "Profile not found", de: "Profil nicht gefunden", fr: "Profil introuvable" },
  "Nombre y etiqueta requeridos": { en: "Name and tag are required", de: "Name und Tag sind Pflicht", fr: "Nom et tag obligatoires" },
  "No se pudo salir de la liga.": { en: "Couldn't leave the league.", de: "Liga konnte nicht verlassen werden.", fr: "Impossible de quitter la ligue." },
  "No se pudo quitar a ese miembro.": { en: "Couldn't remove that member.", de: "Mitglied konnte nicht entfernt werden.", fr: "Impossible de retirer ce membre." },
  "No se pudo borrar la liga.": { en: "Couldn't delete the league.", de: "Liga konnte nicht gelöscht werden.", fr: "Impossible de supprimer la ligue." },
  "No se envió ningún archivo": { en: "No file was sent", de: "Keine Datei gesendet", fr: "Aucun fichier envoyé" },
  "Carpeta no encontrada": { en: "Folder not found", de: "Ordner nicht gefunden", fr: "Dossier introuvable" },
  "Solo puedes compararte con tus amigos": { en: "You can only compare yourself with friends", de: "Du kannst dich nur mit Freunden vergleichen", fr: "Tu ne peux te comparer qu'avec tes amis" },
  "Necesitas ser al menos Nivel 5 de Paragon para crear un clan.": { en: "You need to be at least Paragon level 5 to create a clan.", de: "Du brauchst mindestens Paragon-Stufe 5, um einen Clan zu gründen.", fr: "Il faut être au moins niveau 5 de Paragon pour créer un clan." },
  "Esta liga ya ha terminado.": { en: "This league has already ended.", de: "Diese Liga ist schon vorbei.", fr: "Cette ligue est déjà terminée." },
  // Guerra de clanes (lib/clanWars.ts).
  "Un clan no puede retarse a sí mismo.": { en: "A clan can't challenge itself.", de: "Ein Clan kann sich nicht selbst herausfordern.", fr: "Un clan ne peut pas se défier lui-même." },
  "Solo el líder del clan puede retar a otro.": { en: "Only the clan leader can challenge another clan.", de: "Nur der Clan-Anführer kann einen anderen Clan herausfordern.", fr: "Seul le chef du clan peut défier un autre clan." },
  "Ese clan no existe.": { en: "That clan doesn't exist.", de: "Diesen Clan gibt es nicht.", fr: "Ce clan n'existe pas." },
  "Tu clan ya tiene una guerra pendiente o en marcha.": { en: "Your clan already has a pending or ongoing war.", de: "Dein Clan hat schon einen offenen oder laufenden Krieg.", fr: "Ton clan a déjà une guerre en attente ou en cours." },
  "Ese clan ya tiene una guerra pendiente o en marcha.": { en: "That clan already has a pending or ongoing war.", de: "Dieser Clan hat schon einen offenen oder laufenden Krieg.", fr: "Ce clan a déjà une guerre en attente ou en cours." },
  "Ese reto ya no está pendiente.": { en: "That challenge is no longer pending.", de: "Diese Herausforderung ist nicht mehr offen.", fr: "Ce défi n'est plus en attente." },
  "Solo el líder del clan retado puede responder.": { en: "Only the challenged clan's leader can respond.", de: "Nur der Anführer des herausgeforderten Clans kann antworten.", fr: "Seul le chef du clan défié peut répondre." },
  // Sesiones de trofeos online (lib/sesiones.ts).
  "Sesión no encontrada": { en: "Session not found", de: "Session nicht gefunden", fr: "Session introuvable" },
  "Di qué trofeo o logro vais a por él (3-120 caracteres).": { en: "Say which trophy or achievement you're going for (3-120 characters).", de: "Gib an, welche Trophäe oder welchen Erfolg ihr holen wollt (3-120 Zeichen).", fr: "Indique le trophée ou succès visé (3 à 120 caractères)." },
  "La descripción puede tener como mucho 500 caracteres.": { en: "The description can be 500 characters at most.", de: "Die Beschreibung darf höchstens 500 Zeichen haben.", fr: "La description fait 500 caractères maximum." },
  "Ese texto contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.": { en: "That text contains offensive language — change it and try again.", de: "Dieser Text enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce texte contient des propos offensants — modifie-le et réessaie." },
  "Entre 2 y 16 plazas en total, contándote a ti.": { en: "Between 2 and 16 spots in total, including you.", de: "Zwischen 2 und 16 Plätzen insgesamt, dich eingeschlossen.", fr: "Entre 2 et 16 places au total, toi compris." },
  "La sesión tiene que ser dentro de al menos 10 minutos.": { en: "The session has to be at least 10 minutes from now.", de: "Die Session muss mindestens 10 Minuten in der Zukunft liegen.", fr: "La session doit commencer dans au moins 10 minutes." },
  "Como mucho con 60 días de antelación.": { en: "At most 60 days ahead.", de: "Höchstens 60 Tage im Voraus.", fr: "60 jours à l'avance maximum." },
  "Solo puedes organizar sesiones de juegos de tu biblioteca.": { en: "You can only set up sessions for games in your library.", de: "Du kannst nur Sessions für Spiele aus deiner Bibliothek organisieren.", fr: "Tu ne peux organiser des sessions que pour des jeux de ta bibliothèque." },
  "Ya tienes ese trofeo: elige uno que te falte.": { en: "You already have that trophy: pick one you're missing.", de: "Diese Trophäe hast du schon: Wähle eine, die dir fehlt.", fr: "Tu as déjà ce trophée : choisis-en un qui te manque." },
  "Ese trofeo no es de este juego.": { en: "That trophy isn't from this game.", de: "Diese Trophäe gehört nicht zu diesem Spiel.", fr: "Ce trophée n'est pas de ce jeu." },
  "Esa sesión ya no está abierta.": { en: "That session isn't open anymore.", de: "Diese Session ist nicht mehr offen.", fr: "Cette session n'est plus ouverte." },
  "Es tu propia sesión.": { en: "It's your own session.", de: "Das ist deine eigene Session.", fr: "C'est ta propre session." },
  "Ya no quedan plazas.": { en: "There are no spots left.", de: "Es sind keine Plätze mehr frei.", fr: "Il n'y a plus de places." },
  "Solo quien la organiza puede cancelarla.": { en: "Only the host can cancel it.", de: "Nur wer sie organisiert, kann sie absagen.", fr: "Seul l'organisateur peut l'annuler." },
  // Amigos (lib/profiles.ts → sendFriendRequest).
  "Escribe el usuario de tu amigo.": { en: "Type your friend's username.", de: "Gib den Benutzernamen deines Freundes ein.", fr: "Écris le nom d'utilisateur de ton ami." },
  "No existe nadie con ese usuario.": { en: "Nobody has that username.", de: "Niemand hat diesen Benutzernamen.", fr: "Personne n'a ce nom d'utilisateur." },
  "Ese eres tú.": { en: "That's you.", de: "Das bist du.", fr: "C'est toi." },
  "Ya sois amigos.": { en: "You're already friends.", de: "Ihr seid schon befreundet.", fr: "Vous êtes déjà amis." },
  "Ya le enviaste una solicitud.": { en: "You already sent them a request.", de: "Du hast schon eine Anfrage geschickt.", fr: "Tu lui as déjà envoyé une demande." },
  "Liga no encontrada": { en: "League not found", de: "Liga nicht gefunden", fr: "Ligue introuvable" },
  "La etiqueta debe tener 5 caracteres máximo": { en: "The tag can be 5 characters at most", de: "Der Tag darf höchstens 5 Zeichen haben", fr: "Le tag fait 5 caractères maximum" },
  "Juego no encontrado": { en: "Game not found", de: "Spiel nicht gefunden", fr: "Jeu introuvable" },
  "Has comprobado este juego muchas veces seguidas. Espera unos minutos.": { en: "You've checked this game many times in a row. Wait a few minutes.", de: "Du hast dieses Spiel oft hintereinander geprüft. Warte ein paar Minuten.", fr: "Tu as vérifié ce jeu trop de fois d'affilée. Patiente quelques minutes." },
  "Falta invitedUserId": { en: "Missing invitedUserId", de: "invitedUserId fehlt", fr: "invitedUserId manquant" },
  "Falta el usuario a añadir": { en: "Missing the user to add", de: "Hinzuzufügende Person fehlt", fr: "Utilisateur à ajouter manquant" },
  "Falta el token": { en: "Missing token", de: "Token fehlt", fr: "Jeton manquant" },
  "Falta el identificador de la cuenta": { en: "Missing the account ID", de: "Konto-ID fehlt", fr: "Identifiant du compte manquant" },
  "Ese nombre de usuario ya está cogido.": { en: "That username is already taken.", de: "Dieser Benutzername ist schon vergeben.", fr: "Ce nom d'utilisateur est déjà pris." },
  "Entre 3 y 20 caracteres, solo minúsculas, números y guion bajo.": { en: "3 to 20 characters: lowercase letters, numbers and underscores only.", de: "3 bis 20 Zeichen, nur Kleinbuchstaben, Zahlen und Unterstrich.", fr: "Entre 3 et 20 caractères : minuscules, chiffres et tiret bas uniquement." },
  "Elige un juego de los resultados.": { en: "Pick a game from the results.", de: "Wähle ein Spiel aus den Ergebnissen.", fr: "Choisis un jeu dans les résultats." },
  "El nombre a mostrar no puede estar vacío.": { en: "The display name can't be empty.", de: "Der Anzeigename darf nicht leer sein.", fr: "Le nom affiché ne peut pas être vide." },
  "Demasiados intentos de vincular seguidos. Prueba dentro de unos minutos.": { en: "Too many link attempts in a row. Try again in a few minutes.", de: "Zu viele Verknüpfungsversuche hintereinander. Versuch es in ein paar Minuten.", fr: "Trop de tentatives d'association d'affilée. Réessaie dans quelques minutes." },
  "Demasiadas comprobaciones seguidas. Espera un momento.": { en: "Too many checks in a row. Wait a moment.", de: "Zu viele Prüfungen hintereinander. Warte kurz.", fr: "Trop de vérifications d'affilée. Patiente un instant." },
  "Demasiados comentarios seguidos. Espera un momento.": { en: "Too many comments in a row. Wait a moment.", de: "Zu viele Kommentare hintereinander. Warte kurz.", fr: "Trop de commentaires d'affilée. Patiente un instant." },
  "Demasiadas subidas seguidas. Prueba dentro de unos minutos.": { en: "Too many uploads in a row. Try again in a few minutes.", de: "Zu viele Uploads hintereinander. Versuch es in ein paar Minuten.", fr: "Trop d'envois d'affilée. Réessaie dans quelques minutes." },
  "Datos no válidos": { en: "Invalid data", de: "Ungültige Daten", fr: "Données non valides" },
  "Comentario vacío": { en: "Empty comment", de: "Leerer Kommentar", fr: "Commentaire vide" },
  "No se ha podido contactar con la plataforma. Inténtalo en un momento.": { en: "Couldn't reach the platform. Try again in a moment.", de: "Die Plattform ist nicht erreichbar. Versuch es gleich noch mal.", fr: "Impossible de joindre la plateforme. Réessaie dans un instant." },
  "El servidor no tiene configurado el acceso a PSN.": { en: "The server isn't set up to access PSN.", de: "Der Server ist nicht für PSN eingerichtet.", fr: "Le serveur n'est pas configuré pour PSN." },
  "El servidor no tiene configurado el acceso a PSN (falta PSN_NPSSO).": { en: "The server isn't set up to access PSN.", de: "Der Server ist nicht für PSN eingerichtet.", fr: "Le serveur n'est pas configuré pour PSN." },
  "El servidor no tiene configurado el acceso a Steam (falta STEAM_API_KEY).": { en: "The server isn't set up to access Steam.", de: "Der Server ist nicht für Steam eingerichtet.", fr: "Le serveur n'est pas configuré pour Steam." },
  "El servidor no tiene configurado el acceso a Xbox (falta XBL_API_KEY).": { en: "The server isn't set up to access Xbox.", de: "Der Server ist nicht für Xbox eingerichtet.", fr: "Le serveur n'est pas configuré pour Xbox." },
  "PSN no aceptó el token NPSSO. Lo más habitual es que haya caducado: vuelve a copiarlo con la sesión de PlayStation abierta.": { en: "PSN didn't accept the server's session. Try again later.", de: "PSN hat die Server-Sitzung nicht akzeptiert. Versuch es später noch mal.", fr: "PSN n'a pas accepté la session du serveur. Réessaie plus tard." },
  "PSN no ha aceptado la sesión — vuelve a intentarlo con playstation.com abierto y con la sesión iniciada.": { en: "PSN didn't accept the session — try again with playstation.com open and signed in.", de: "PSN hat die Sitzung nicht akzeptiert — versuch es erneut, während playstation.com geöffnet und angemeldet ist.", fr: "PSN n'a pas accepté la session — réessaie avec playstation.com ouvert et connecté." },
  "Epic Games está bloqueando ahora mismo las consultas automáticas (su protección antibots), así que no podemos leer tu perfil. Tu enlace está bien: inténtalo más tarde.": { en: "Epic Games is blocking automated requests right now (its anti-bot protection), so we can't read your profile. Your link is fine: try again later.", de: "Epic Games blockiert gerade automatische Anfragen (Bot-Schutz), daher können wir dein Profil nicht lesen. Dein Link ist in Ordnung: versuch es später.", fr: "Epic Games bloque en ce moment les requêtes automatiques (protection anti-bots), donc on ne peut pas lire ton profil. Ton lien est bon : réessaie plus tard." },
  "Esa guía no se puede publicar — contiene lenguaje ofensivo. Cámbiala e inténtalo de nuevo.": { en: "That guide can't be published — it contains offensive language. Change it and try again.", de: "Dieser Guide kann nicht veröffentlicht werden — er enthält beleidigende Sprache. Ändere ihn und versuch es erneut.", fr: "Ce guide ne peut pas être publié — il contient des propos offensants. Modifie-le et réessaie." },
  "Ese comentario contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.": { en: "That comment contains offensive language — change it and try again.", de: "Dieser Kommentar enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce commentaire contient des propos offensants — modifie-le et réessaie." },
  "Ese nombre contiene lenguaje ofensivo — cámbialo.": { en: "That name contains offensive language — change it.", de: "Dieser Name enthält beleidigende Sprache — ändere ihn.", fr: "Ce nom contient des propos offensants — change-le." },
  "Escribe algo antes de publicar.": { en: "Write something before publishing.", de: "Schreib etwas, bevor du veröffentlichst.", fr: "Écris quelque chose avant de publier." },
  "Esa invitación ya no existe": { en: "That invite no longer exists", de: "Diese Einladung gibt es nicht mehr", fr: "Cette invitation n'existe plus" },
  "Esa persona ya está en un clan": { en: "That person is already in a clan", de: "Diese Person ist schon in einem Clan", fr: "Cette personne est déjà dans un clan" },
  "El nombre del clan tiene que tener entre 3 y 40 caracteres.": { en: "The clan name must be 3 to 40 characters.", de: "Der Clan-Name muss 3 bis 40 Zeichen haben.", fr: "Le nom du clan doit faire entre 3 et 40 caractères." },
  "La descripción puede tener como mucho 300 caracteres.": { en: "The description can be 300 characters at most.", de: "Die Beschreibung darf höchstens 300 Zeichen haben.", fr: "La description fait 300 caractères maximum." },
  "La etiqueta tiene que tener de 2 a 5 letras o números.": { en: "The tag must be 2 to 5 letters or numbers.", de: "Der Tag muss 2 bis 5 Buchstaben oder Zahlen haben.", fr: "Le tag doit faire 2 à 5 lettres ou chiffres." },
  "Ponle un nombre a la carpeta.": { en: "Give the folder a name.", de: "Gib dem Ordner einen Namen.", fr: "Donne un nom au dossier." },
  "Solo el líder del clan puede invitar": { en: "Only the clan leader can invite", de: "Nur die Clan-Leitung kann einladen", fr: "Seul le chef du clan peut inviter" },
  "Solo puedes invitar a amigos tuyos": { en: "You can only invite your friends", de: "Du kannst nur deine Freunde einladen", fr: "Tu ne peux inviter que tes amis" },
  "Ya estás en un clan": { en: "You're already in a clan", de: "Du bist schon in einem Clan", fr: "Tu es déjà dans un clan" },
  "Ya le has invitado a este clan": { en: "You've already invited them to this clan", de: "Du hast diese Person schon eingeladen", fr: "Tu l'as déjà invité dans ce clan" },
  "Ya tienes una carpeta con ese nombre.": { en: "You already have a folder with that name.", de: "Du hast schon einen Ordner mit diesem Namen.", fr: "Tu as déjà un dossier avec ce nom." },
  "Ese juego no está en tu biblioteca.": { en: "That game isn't in your library.", de: "Dieses Spiel ist nicht in deiner Bibliothek.", fr: "Ce jeu n'est pas dans ta bibliothèque." },
  "Un juego añadido a mano no tiene nada que sincronizar.": { en: "A manually added game has nothing to sync.", de: "Ein manuell hinzugefügtes Spiel hat nichts zu synchronisieren.", fr: "Un jeu ajouté à la main n'a rien à synchroniser." },
  "Storage no configurado": { en: "Storage isn't set up", de: "Speicher nicht eingerichtet", fr: "Stockage non configuré" },
  "Formato no admitido": { en: "Format not supported", de: "Format nicht unterstützt", fr: "Format non pris en charge" },
  "El archivo pesa demasiado (máximo 4 MB)": { en: "The file is too big (4 MB max)", de: "Die Datei ist zu groß (max. 4 MB)", fr: "Le fichier est trop lourd (4 Mo max.)" },
  "El archivo no es lo que dice su extensión": { en: "The file isn't what its extension says", de: "Die Datei passt nicht zu ihrer Endung", fr: "Le fichier ne correspond pas à son extension" },
  "No se pudo subir el archivo": { en: "Couldn't upload the file", de: "Datei konnte nicht hochgeladen werden", fr: "Impossible d'envoyer le fichier" },
  "No tienes vinculada esa plataforma.": { en: "You haven't linked that platform.", de: "Diese Plattform ist nicht verknüpft.", fr: "Tu n'as pas associé cette plateforme." },
  // Cuentas de Steam extra (lib/steamExtra.ts, 15 oct 2026).
  "No disponible.": { en: "Not available.", de: "Nicht verfügbar.", fr: "Non disponible." },
  "Vincula primero tu cuenta principal de Steam.": { en: "Link your main Steam account first.", de: "Verknüpfe zuerst dein Haupt-Steam-Konto.", fr: "Associe d'abord ton compte Steam principal." },
  "Esa ya es tu cuenta principal de Steam.": { en: "That's already your main Steam account.", de: "Das ist schon dein Haupt-Steam-Konto.", fr: "C'est déjà ton compte Steam principal." },
  "No se ha podido guardar la cuenta. Inténtalo en un momento.": { en: "Couldn't save the account. Try again in a moment.", de: "Das Konto konnte nicht gespeichert werden. Versuch es gleich noch mal.", fr: "Impossible d'enregistrer le compte. Réessaie dans un instant." },
  // Server actions de la web (lib/mensajesWeb.ts, 13 oct 2026).
  "No se pudo entregar el aviso.": { en: "Couldn't deliver the notification.", de: "Die Benachrichtigung konnte nicht zugestellt werden.", fr: "Impossible de livrer la notification." },
  "No se pudo enviar.": { en: "Couldn't send it.", de: "Konnte nicht gesendet werden.", fr: "Impossible d'envoyer." },
  "No se pudo guardar.": { en: "Couldn't save it.", de: "Konnte nicht gespeichert werden.", fr: "Impossible d'enregistrer." },
  "Avisos por Discord activados.": { en: "Discord alerts turned on.", de: "Discord-Benachrichtigungen aktiviert.", fr: "Alertes Discord activées." },
  "Avisos por Discord desactivados.": { en: "Discord alerts turned off.", de: "Discord-Benachrichtigungen deaktiviert.", fr: "Alertes Discord désactivées." },
  "Carpeta creada.": { en: "Folder created.", de: "Ordner erstellt.", fr: "Dossier créé." },
  "Carpeta renombrada.": { en: "Folder renamed.", de: "Ordner umbenannt.", fr: "Dossier renommé." },
  "Di en qué lo has jugado (Switch, PS1, retro...).": { en: "Say what you played it on (Switch, PS1, retro...).", de: "Gib an, worauf du es gespielt hast (Switch, PS1, Retro...).", fr: "Indique sur quoi tu y as joué (Switch, PS1, rétro...)." },
  "El contador no puede ser negativo.": { en: "The counter can't be negative.", de: "Der Zähler darf nicht negativ sein.", fr: "Le compteur ne peut pas être négatif." },
  "El precio no puede ser negativo.": { en: "The price can't be negative.", de: "Der Preis darf nicht negativ sein.", fr: "Le prix ne peut pas être négatif." },
  "El título tiene que tener entre 2 y 60 caracteres.": { en: "The title must be 2 to 60 characters.", de: "Der Titel muss 2 bis 60 Zeichen haben.", fr: "Le titre doit faire entre 2 et 60 caractères." },
  "Elige al menos un juego.": { en: "Pick at least one game.", de: "Wähle mindestens ein Spiel.", fr: "Choisis au moins un jeu." },
  "Elige un juego de los resultados de búsqueda.": { en: "Pick a game from the search results.", de: "Wähle ein Spiel aus den Suchergebnissen.", fr: "Choisis un jeu dans les résultats de recherche." },
  "Elige una fecha de aquí a 6 meses.": { en: "Pick a date within the next 6 months.", de: "Wähle ein Datum innerhalb der nächsten 6 Monate.", fr: "Choisis une date dans les 6 prochains mois." },
  "Esa guía contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo.": { en: "That guide contains offensive language — change it and try again.", de: "Dieser Guide enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce guide contient des propos offensants — modifie-le et réessaie." },
  "Esa respuesta contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo.": { en: "That reply contains offensive language — change it and try again.", de: "Diese Antwort enthält beleidigende Sprache — ändere sie und versuch es erneut.", fr: "Cette réponse contient des propos offensants — modifie-la et réessaie." },
  "Escribe algo antes de responder.": { en: "Write something before replying.", de: "Schreib etwas, bevor du antwortest.", fr: "Écris quelque chose avant de répondre." },
  "Escribe tu Gamertag de Xbox.": { en: "Enter your Xbox Gamertag.", de: "Gib dein Xbox-Gamertag ein.", fr: "Saisis ton Gamertag Xbox." },
  "Escribe tu ID de PlayStation.": { en: "Enter your PlayStation ID.", de: "Gib deine PlayStation-ID ein.", fr: "Saisis ton ID PlayStation." },
  "Escribe tu usuario de Steam, tu SteamID64 o la URL de tu perfil.": { en: "Enter your Steam username, your SteamID64 or your profile URL.", de: "Gib deinen Steam-Namen, deine SteamID64 oder deine Profil-URL ein.", fr: "Saisis ton nom Steam, ton SteamID64 ou l'URL de ton profil." },
  "Ese juego no lo tenéis los dos a medias.": { en: "You don't both have that game in progress.", de: "Ihr habt dieses Spiel nicht beide angefangen.", fr: "Vous n'avez pas tous les deux ce jeu en cours." },
  "Ese título contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.": { en: "That title contains offensive language — change it and try again.", de: "Dieser Titel enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce titre contient des propos offensants — modifie-le et réessaie." },
  "Esos juegos no están en tu biblioteca.": { en: "Those games aren't in your library.", de: "Diese Spiele sind nicht in deiner Bibliothek.", fr: "Ces jeux ne sont pas dans ta bibliothèque." },
  "Espera un momento antes de crear otra sesión.": { en: "Wait a moment before creating another session.", de: "Warte kurz, bevor du eine weitere Session erstellst.", fr: "Patiente un instant avant de créer une autre session." },
  "Espera un momento antes de proponer otro reto.": { en: "Wait a moment before proposing another challenge.", de: "Warte kurz, bevor du eine weitere Herausforderung vorschlägst.", fr: "Patiente un instant avant de proposer un autre défi." },
  "Espera un momento antes de volver a intentarlo.": { en: "Wait a moment before trying again.", de: "Warte kurz, bevor du es erneut versuchst.", fr: "Patiente un instant avant de réessayer." },
  "Falta el trofeo.": { en: "The trophy is missing.", de: "Die Trophäe fehlt.", fr: "Le trophée manque." },
  "Fecha no válida.": { en: "Invalid date.", de: "Ungültiges Datum.", fr: "Date non valide." },
  "Formato no válido.": { en: "Invalid format.", de: "Ungültiges Format.", fr: "Format non valide." },
  "Guía publicada.": { en: "Guide published.", de: "Guide veröffentlicht.", fr: "Guide publié." },
  "Has publicado mucho seguido. Espera un momento.": { en: "You've posted a lot in a row. Wait a moment.", de: "Du hast viel hintereinander gepostet. Warte kurz.", fr: "Tu as beaucoup publié d'affilée. Patiente un instant." },
  "Has publicado mucho seguido. Espera unos minutos.": { en: "You've posted a lot in a row. Wait a few minutes.", de: "Du hast viel hintereinander gepostet. Warte ein paar Minuten.", fr: "Tu as beaucoup publié d'affilée. Patiente quelques minutes." },
  "Has respondido mucho seguido. Espera un momento.": { en: "You've replied a lot in a row. Wait a moment.", de: "Du hast viel hintereinander geantwortet. Warte kurz.", fr: "Tu as beaucoup répondu d'affilée. Patiente un instant." },
  "Juego no válido.": { en: "Invalid game.", de: "Ungültiges Spiel.", fr: "Jeu non valide." },
  "La meta tiene que ser un número mayor que 0.": { en: "The goal must be a number greater than 0.", de: "Das Ziel muss eine Zahl größer als 0 sein.", fr: "L'objectif doit être un nombre supérieur à 0." },
  "Mensaje de prueba enviado — revisa tus DMs de Discord.": { en: "Test message sent — check your Discord DMs.", de: "Testnachricht gesendet — schau in deine Discord-DMs.", fr: "Message de test envoyé — regarde tes MP Discord." },
  "No se ha podido crear la carpeta.": { en: "Couldn't create the folder.", de: "Ordner konnte nicht erstellt werden.", fr: "Impossible de créer le dossier." },
  "No se ha podido guardar la guía.": { en: "Couldn't save the guide.", de: "Guide konnte nicht gespeichert werden.", fr: "Impossible d'enregistrer le guide." },
  "No se ha podido mover el juego.": { en: "Couldn't move the game.", de: "Spiel konnte nicht verschoben werden.", fr: "Impossible de déplacer le jeu." },
  "No se ha podido renombrar la carpeta.": { en: "Couldn't rename the folder.", de: "Ordner konnte nicht umbenannt werden.", fr: "Impossible de renommer le dossier." },
  "No tienes juegos completados de ese estudio.": { en: "You don't have any completed games from that studio.", de: "Du hast keine abgeschlossenen Spiele von diesem Studio.", fr: "Tu n'as aucun jeu terminé de ce studio." },
  "Pega el enlace a tu perfil de Epic Games (o tu ID de cuenta).": { en: "Paste the link to your Epic Games profile (or your account ID).", de: "Füge den Link zu deinem Epic-Games-Profil ein (oder deine Konto-ID).", fr: "Colle le lien de ton profil Epic Games (ou ton ID de compte)." },
  "Perfil actualizado correctamente.": { en: "Profile updated.", de: "Profil aktualisiert.", fr: "Profil mis à jour." },
  "Plataforma no válida.": { en: "Invalid platform.", de: "Ungültige Plattform.", fr: "Plateforme non valide." },
  "Pon un precio entre 0,01 y 999 €.": { en: "Enter a price between €0.01 and €999.", de: "Gib einen Preis zwischen 0,01 und 999 € ein.", fr: "Indique un prix entre 0,01 et 999 €." },
  "Ponle un título y algo de texto.": { en: "Give it a title and some text.", de: "Gib ihm einen Titel und etwas Text.", fr: "Donne-lui un titre et un peu de texte." },
  "Publicado.": { en: "Posted.", de: "Veröffentlicht.", fr: "Publié." },
  "Sincronizado.": { en: "Synced.", de: "Synchronisiert.", fr: "Synchronisé." },
  "Solo puedes fijar un máximo de 3 trofeos.": { en: "You can pin 3 trophies at most.", de: "Du kannst höchstens 3 Trophäen anheften.", fr: "Tu peux épingler 3 trophées maximum." },
  "Tipo de vitrina no válido.": { en: "Invalid showcase type.", de: "Ungültiger Vitrinentyp.", fr: "Type de vitrine non valide." },
  "Tu cuenta no inició sesión con Discord — sin eso el bot no sabe a quién escribir.": { en: "Your account didn't sign in with Discord — without that the bot doesn't know who to message.", de: "Dein Konto hat sich nicht mit Discord angemeldet — ohne das weiß der Bot nicht, wem er schreiben soll.", fr: "Ton compte ne s'est pas connecté avec Discord — sans ça, le bot ne sait pas à qui écrire." },
  "Ya tenéis un reto abierto con ese juego.": { en: "You already have an open challenge with that game.", de: "Ihr habt schon eine offene Herausforderung mit diesem Spiel.", fr: "Vous avez déjà un défi ouvert sur ce jeu." },
  "Ese texto no se puede publicar — contiene lenguaje ofensivo. Cámbialo e inténtalo de nuevo.": { en: "That text can't be published — it contains offensive language. Change it and try again.", de: "Dieser Text kann nicht veröffentlicht werden — er enthält beleidigende Sprache. Ändere ihn und versuch es erneut.", fr: "Ce texte ne peut pas être publié — il contient des propos offensants. Modifie-le et réessaie." },
  "Falta DISCORD_BOT_TOKEN en el servidor.": { en: "The server is missing DISCORD_BOT_TOKEN.", de: "Auf dem Server fehlt DISCORD_BOT_TOKEN.", fr: "DISCORD_BOT_TOKEN manque sur le serveur." },
  "Fallo de red al hablar con Discord.": { en: "Network error while talking to Discord.", de: "Netzwerkfehler bei der Verbindung mit Discord.", fr: "Erreur réseau en contactant Discord." },
  "Discord no deja escribirte — tenéis que compartir un servidor con el bot y tener los DMs de miembros del servidor activados.": { en: "Discord won't let the bot message you — you need to share a server with it and allow DMs from server members.", de: "Discord lässt den Bot dir nicht schreiben — ihr müsst einen Server teilen und DMs von Servermitgliedern erlauben.", fr: "Discord n'autorise pas le bot à t'écrire — vous devez partager un serveur et autoriser les MP des membres du serveur." },
  "Tu cuenta de Paragon no inició sesión con Discord, así que no hay a quién escribir.": { en: "Your Paragon account didn't sign in with Discord, so there's nobody to message.", de: "Dein Paragon-Konto hat sich nicht mit Discord angemeldet, daher gibt es niemanden zum Anschreiben.", fr: "Ton compte Paragon ne s'est pas connecté avec Discord, donc personne à qui écrire." },
  "Faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en el servidor.": { en: "The server is missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.", de: "Auf dem Server fehlen VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.", fr: "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY manquent sur le serveur." },
  "No hay ninguna suscripción guardada — activa las notificaciones primero.": { en: "There's no saved subscription — turn on notifications first.", de: "Es ist kein Abo gespeichert — aktiviere zuerst die Benachrichtigungen.", fr: "Aucun abonnement enregistré — active d'abord les notifications." },
  "La suscripción ya no es válida (se ha borrado).": { en: "The subscription is no longer valid (it was deleted).", de: "Das Abo ist nicht mehr gültig (wurde gelöscht).", fr: "L'abonnement n'est plus valide (il a été supprimé)." },
  "Error desconocido enviando el push.": { en: "Unknown error sending the notification.", de: "Unbekannter Fehler beim Senden der Benachrichtigung.", fr: "Erreur inconnue lors de l'envoi de la notification." },
};

const PATRONES: { re: RegExp; trad: (m: RegExpMatchArray) => Trad }[] = [
  {
    re: /^Ya estás en \[(.*)\]\. Sal de ese clan para unirte a otro\.$/,
    trad: (m) => ({ en: `You're already in [${m[1]}]. Leave that clan to join another.`, de: `Du bist schon in [${m[1]}]. Verlass diesen Clan, um einem anderen beizutreten.`, fr: `Tu es déjà dans [${m[1]}]. Quitte ce clan pour en rejoindre un autre.` }),
  },
  {
    re: /^PSN no encuentra ningún perfil con el ID "(.*)"\.$/,
    trad: (m) => ({ en: `PSN can't find any profile with the ID "${m[1]}".`, de: `PSN findet kein Profil mit der ID „${m[1]}“.`, fr: `PSN ne trouve aucun profil avec l'ID « ${m[1]} ».` }),
  },
  {
    re: /^Steam no encuentra ningún perfil con "(.*)"\.$/,
    trad: (m) => ({ en: `Steam can't find any profile matching "${m[1]}".`, de: `Steam findet kein Profil zu „${m[1]}“.`, fr: `Steam ne trouve aucun profil correspondant à « ${m[1]} ».` }),
  },
  {
    re: /^Xbox no encuentra ningún gamertag "(.*)"\.$/,
    trad: (m) => ({ en: `Xbox can't find the gamertag "${m[1]}".`, de: `Xbox findet das Gamertag „${m[1]}“ nicht.`, fr: `Xbox ne trouve pas le gamertag « ${m[1]} ».` }),
  },
  {
    re: /^El perfil de Steam de (.*) es privado\./,
    trad: (m) => ({
      en: `${m[1]}'s Steam profile is private. In Steam: Profile → Edit Profile → Privacy, set "My profile" and "Game details" to public.`,
      de: `Das Steam-Profil von ${m[1]} ist privat. In Steam: Profil → Profil bearbeiten → Privatsphäre, stelle „Mein Profil“ und „Spieldetails“ auf öffentlich.`,
      fr: `Le profil Steam de ${m[1]} est privé. Dans Steam : Profil → Modifier le profil → Confidentialité, mets « Mon profil » et « Détails des jeux » en public.`,
    }),
  },
  {
    re: /^Epic Games no encuentra ningún perfil con "(.*)"\./,
    trad: (m) => ({
      en: `Epic Games can't find any profile matching "${m[1]}". Paste the link to your profile (store.epicgames.com/u/...).`,
      de: `Epic Games findet kein Profil zu „${m[1]}“. Füge den Link zu deinem Profil ein (store.epicgames.com/u/...).`,
      fr: `Epic Games ne trouve aucun profil correspondant à « ${m[1]} ». Colle le lien de ton profil (store.epicgames.com/u/...).`,
    }),
  },
  {
    re: /^El perfil de Epic Games de (.*) no es público\./,
    trad: (m) => ({
      en: `${m[1]}'s Epic Games profile isn't public. In the Epic Games Store: your avatar → "Achievements" → "Privacy level" → "Public".`,
      de: `Das Epic-Games-Profil von ${m[1]} ist nicht öffentlich. Im Epic Games Store: dein Avatar → „Erfolge“ → „Datenschutzstufe“ → „Öffentlich“.`,
      fr: `Le profil Epic Games de ${m[1]} n'est pas public. Dans l'Epic Games Store : ton avatar → « Succès » → « Niveau de confidentialité » → « Public ».`,
    }),
  },
  {
    re: /^Esa cuenta de (.*) ya está vinculada a otro usuario de Paragon/,
    trad: (m) => ({
      en: `That ${m[1]} account is already linked to another Paragon user — each real account can only be in one place.`,
      de: `Dieses ${m[1]}-Konto ist schon mit einer anderen Paragon-Person verknüpft — jedes echte Konto kann nur an einer Stelle sein.`,
      fr: `Ce compte ${m[1]} est déjà associé à un autre utilisateur de Paragon — chaque vrai compte ne peut être qu'à un seul endroit.`,
    }),
  },
  {
    re: /^Ahora eres @(.+)\.$/,
    trad: (m) => ({ en: `You're now @${m[1]}.`, de: `Du bist jetzt @${m[1]}.`, fr: `Tu es maintenant @${m[1]}.` }),
  },
  {
    re: /^Vinculado a (.+): (\d+) juegos importados\.$/,
    trad: (m) => ({ en: `Linked to ${m[1]}: ${m[2]} games imported.`, de: `Mit ${m[1]} verknüpft: ${m[2]} Spiele importiert.`, fr: `Associé à ${m[1]} : ${m[2]} jeux importés.` }),
  },
  {
    re: /^Ya se sincronizó hace muy poco — espera (\d+)s\.$/,
    trad: (m) => ({ en: `It synced very recently — wait ${m[1]}s.`, de: `Gerade erst synchronisiert — warte ${m[1]} s.`, fr: `Synchronisé il y a très peu — attends ${m[1]} s.` }),
  },
  {
    re: /^Movido a «(.*)»\.$/,
    trad: (m) => ({ en: `Moved to “${m[1]}”.`, de: `Nach „${m[1]}“ verschoben.`, fr: `Déplacé dans « ${m[1]} ».` }),
  },
  {
    re: /^(.+) añadido a tu biblioteca\.$/,
    trad: (m) => ({ en: `${m[1]} added to your library.`, de: `${m[1]} zu deiner Bibliothek hinzugefügt.`, fr: `${m[1]} ajouté à ta bibliothèque.` }),
  },
  {
    re: /^(.+) añadido a tu lista de deseados\.$/,
    trad: (m) => ({ en: `${m[1]} added to your wishlist.`, de: `${m[1]} zu deiner Wunschliste hinzugefügt.`, fr: `${m[1]} ajouté à ta liste de souhaits.` }),
  },
  {
    re: /^Ya sois amigos: @(.+) te había enviado una solicitud\.$/,
    trad: (m) => ({ en: `You're now friends: @${m[1]} had already sent you a request.`, de: `Ihr seid jetzt befreundet: @${m[1]} hatte dir schon eine Anfrage geschickt.`, fr: `Vous êtes amis : @${m[1]} t'avait déjà envoyé une demande.` }),
  },
  {
    re: /^Solicitud enviada a @(.+)\.$/,
    trad: (m) => ({ en: `Request sent to @${m[1]}.`, de: `Anfrage an @${m[1]} gesendet.`, fr: `Demande envoyée à @${m[1]}.` }),
  },
  {
    re: /^Como mucho (\d+) caracteres de título y (\d+) de texto\.$/,
    trad: (m) => ({ en: `${m[1]} characters for the title and ${m[2]} for the text at most.`, de: `Höchstens ${m[1]} Zeichen für den Titel und ${m[2]} für den Text.`, fr: `${m[1]} caractères pour le titre et ${m[2]} pour le texte maximum.` }),
  },
  {
    re: /^Como mucho (\d+) vitrinas\.$/,
    trad: (m) => ({ en: `${m[1]} showcases at most.`, de: `Höchstens ${m[1]} Vitrinen.`, fr: `${m[1]} vitrines maximum.` }),
  },
  {
    re: /^Discord devolvió (\d+) al (mandar el mensaje|abrir el DM)\.$/,
    trad: (m) => {
      const dm = m[2] === "abrir el DM";
      return {
        en: `Discord returned ${m[1]} when ${dm ? "opening the DM" : "sending the message"}.`,
        de: `Discord hat beim ${dm ? "Öffnen der DM" : "Senden der Nachricht"} ${m[1]} zurückgegeben.`,
        fr: `Discord a renvoyé ${m[1]} en ${dm ? "ouvrant le MP" : "envoyant le message"}.`,
      };
    },
  },
  {
    re: /^Cuenta vinculada a (.+), pero PlayStation no nos deja leer sus trofeos\./,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but PlayStation won't let us read its trophies. It has to be friends on PSN with the server's account, or have its trophies public.`,
      de: `Konto mit ${m[1]} verknüpft, aber PlayStation lässt uns die Trophäen nicht lesen. Es muss auf PSN mit dem Server-Konto befreundet sein oder die Trophäen öffentlich haben.`,
      fr: `Compte associé à ${m[1]}, mais PlayStation ne nous laisse pas lire ses trophées. Il doit être ami sur PSN avec le compte du serveur, ou avoir ses trophées en public.`,
    }),
  },
  {
    re: /^Cuenta vinculada a (.+), pero no podemos leer tu biblioteca\. En Steam/,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but we can't read your library. Steam needs TWO settings set to public — Profile → Edit Profile → Privacy, set "My profile" AND "Game details" to public (the profile can already be public and still block reading if "Game details" isn't).`,
      de: `Konto mit ${m[1]} verknüpft, aber wir können deine Bibliothek nicht lesen. In Steam müssen ZWEI Einstellungen öffentlich sein — Profil → Profil bearbeiten → Privatsphäre, stelle „Mein Profil“ UND „Spieldetails“ auf öffentlich (das Profil kann schon öffentlich sein und das Lesen trotzdem blockieren, wenn „Spieldetails“ es nicht ist).`,
      fr: `Compte associé à ${m[1]}, mais on ne peut pas lire ta bibliothèque. Steam demande DEUX réglages en public — Profil → Modifier le profil → Confidentialité, mets « Mon profil » ET « Détails des jeux » en public (le profil peut déjà être public et bloquer quand même la lecture si « Détails des jeux » ne l'est pas).`,
    }),
  },
  {
    re: /^Cuenta vinculada a (.+), pero no podemos leer su historial de logros/,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but we can't read its achievement history — either the profile isn't public or Xbox can't find it.`,
      de: `Konto mit ${m[1]} verknüpft, aber wir können den Erfolgsverlauf nicht lesen — entweder ist das Profil nicht öffentlich oder Xbox findet es nicht.`,
      fr: `Compte associé à ${m[1]}, mais on ne peut pas lire son historique de succès — soit le profil n'est pas public, soit Xbox ne le trouve pas.`,
    }),
  },
  {
    re: /^Cuenta vinculada a (.+), pero no es público\. En la Epic Games Store/,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but it isn't public. In the Epic Games Store: your avatar → "Achievements" → "Privacy level" → "Public".`,
      de: `Konto mit ${m[1]} verknüpft, aber es ist nicht öffentlich. Im Epic Games Store: dein Avatar → „Erfolge“ → „Datenschutzstufe“ → „Öffentlich“.`,
      fr: `Compte associé à ${m[1]}, mais il n'est pas public. Dans l'Epic Games Store : ton avatar → « Succès » → « Niveau de confidentialité » → « Public ».`,
    }),
  },
  {
    re: /^Como mucho (\d+) cuentas de Steam además de la principal\.$/,
    trad: (m) => ({ en: `${m[1]} Steam accounts at most besides the main one.`, de: `Höchstens ${m[1]} Steam-Konten zusätzlich zum Hauptkonto.`, fr: `${m[1]} comptes Steam maximum en plus du principal.` }),
  },
  {
    re: /^Como mucho (\d+) caracteres\.$/,
    trad: (m) => ({ en: `${m[1]} characters at most.`, de: `Höchstens ${m[1]} Zeichen.`, fr: `${m[1]} caractères maximum.` }),
  },
];

export function traducirMensaje(texto: string, idioma: Idioma): string {
  if (idioma === "es" || !texto) return texto;
  const fijo = FIJOS[texto];
  if (fijo) return fijo[idioma];
  for (const p of PATRONES) {
    const m = texto.match(p.re);
    if (m) return p.trad(m)[idioma];
  }
  return texto;
}

/** `{ error }` con el mensaje en el idioma del teléfono (Accept-Language). */
export function errorMovil(req: Request, mensaje: string, status: number): NextResponse {
  return NextResponse.json({ error: traducirMensaje(mensaje, idiomaDeCabecera(req.headers.get("accept-language"))) }, { status });
}
