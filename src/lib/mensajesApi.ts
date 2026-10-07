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
