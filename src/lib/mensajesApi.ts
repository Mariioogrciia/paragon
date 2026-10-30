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

type Trad = { en: string; de: string; fr: string; it: string; pt: string };

const FIJOS: Record<string, Trad> = {
  "No autenticado": { en: "Not signed in", de: "Nicht angemeldet", fr: "Non connecté", it: "Non autenticato", pt: "Sem sessão iniciada" },
  "Demasiadas peticiones seguidas. Espera un momento.": { en: "Too many requests in a row. Wait a moment.", de: "Zu viele Anfragen hintereinander. Warte kurz.", fr: "Trop de requêtes d'affilée. Patiente un instant.", it: "Troppe richieste di fila. Aspetta un momento.", pt: "Demasiados pedidos seguidos. Espera um momento." },
  "Perfil sin terminar de configurar": { en: "Profile setup not finished", de: "Profil noch nicht fertig eingerichtet", fr: "Profil pas encore configuré", it: "Profilo non ancora configurato", pt: "Perfil ainda por configurar" },
  "Clan no encontrado": { en: "Clan not found", de: "Clan nicht gefunden", fr: "Clan introuvable", it: "Clan non trovato", pt: "Clã não encontrado" },
  "Escudo no válido": { en: "Invalid crest", de: "Ungültiges Wappen", fr: "Blason non valide", it: "Stemma non valido", pt: "Emblema inválido" },
  "Tu rango en el clan no permite editarlo": { en: "Your clan rank can't edit it", de: "Dein Clan-Rang erlaubt das Bearbeiten nicht", fr: "Ton rang dans le clan ne permet pas de le modifier", it: "Il tuo grado nel clan non permette di modificarlo", pt: "O teu posto no clã não permite editá-lo" },
  "Tu rango en el clan no permite invitar": { en: "Your clan rank can't invite", de: "Dein Clan-Rang erlaubt keine Einladungen", fr: "Ton rang dans le clan ne permet pas d'inviter", it: "Il tuo grado nel clan non permette di invitare", pt: "O teu posto no clã não permite convidar" },
  "Tu rango en el clan no permite ese cambio": { en: "Your clan rank can't make that change", de: "Dein Clan-Rang erlaubt diese Änderung nicht", fr: "Ton rang dans le clan ne permet pas ce changement", it: "Il tuo grado nel clan non permette questa modifica", pt: "O teu posto no clã não permite essa alteração" },
  "Tu rango en el clan no permite expulsar a esa persona": { en: "Your clan rank can't kick that person", de: "Dein Clan-Rang erlaubt nicht, diese Person zu entfernen", fr: "Ton rang dans le clan ne permet pas d'exclure cette personne", it: "Il tuo grado nel clan non permette di espellere quella persona", pt: "O teu posto no clã não permite expulsar essa pessoa" },
  "No puedes cambiar tu propio rango": { en: "You can't change your own rank", de: "Du kannst deinen eigenen Rang nicht ändern", fr: "Tu ne peux pas changer ton propre rang", it: "Non puoi cambiare il tuo grado", pt: "Não podes mudar o teu próprio posto" },
  "Para irte, usa Abandonar clan": { en: "To leave, use Leave clan", de: "Zum Verlassen nutze „Clan verlassen“", fr: "Pour partir, utilise Quitter le clan", it: "Per andartene, usa Abbandona clan", pt: "Para saíres, usa Abandonar clã" },
  "Esa persona no está en el clan": { en: "That person isn't in the clan", de: "Diese Person ist nicht im Clan", fr: "Cette personne n'est pas dans le clan", it: "Quella persona non è nel clan", pt: "Essa pessoa não está no clã" },
  "Rango no válido": { en: "Invalid rank", de: "Ungültiger Rang", fr: "Rang non valide", it: "Grado non valido", pt: "Posto inválido" },
  "Ya estás en un clan. Sal de él para unirte a otro.": { en: "You're already in a clan. Leave it to join another.", de: "Du bist schon in einem Clan. Verlass ihn, um einem anderen beizutreten.", fr: "Tu es déjà dans un clan. Quitte-le pour en rejoindre un autre.", it: "Sei già in un clan. Esci per unirti a un altro.", pt: "Já estás num clã. Sai dele para te juntares a outro." },
  "El nombre debe tener entre 3 y 40 caracteres": { en: "The name must be 3 to 40 characters", de: "Der Name muss 3 bis 40 Zeichen haben", fr: "Le nom doit faire entre 3 et 40 caractères", it: "Il nome deve avere tra 3 e 40 caratteri", pt: "O nome tem de ter entre 3 e 40 caracteres" },
  "La descripción no puede pasar de 200 caracteres": { en: "The description can't exceed 200 characters", de: "Die Beschreibung darf höchstens 200 Zeichen haben", fr: "La description ne peut pas dépasser 200 caractères", it: "La descrizione non può superare i 200 caratteri", pt: "A descrição não pode passar dos 200 caracteres" },
  "Ya existe un clan con ese nombre": { en: "A clan with that name already exists", de: "Es gibt schon einen Clan mit diesem Namen", fr: "Un clan porte déjà ce nom", it: "Esiste già un clan con quel nome", pt: "Já existe um clã com esse nome" },
  "Ya existe un clan con esa abreviatura": { en: "A clan with that tag already exists", de: "Es gibt schon einen Clan mit diesem Tag", fr: "Un clan utilise déjà ce tag", it: "Esiste già un clan con quel tag", pt: "Já existe um clã com essa etiqueta" },
  "No tienes esa plataforma vinculada.": { en: "You don't have that platform linked.", de: "Diese Plattform ist nicht verknüpft.", fr: "Cette plateforme n'est pas liée.", it: "Non hai collegato quella piattaforma.", pt: "Não tens essa plataforma ligada." },
  "Esa plataforma se sincroniza con la extensión del navegador.": { en: "That platform syncs through the browser extension.", de: "Diese Plattform wird über die Browser-Erweiterung synchronisiert.", fr: "Cette plateforme se synchronise via l'extension du navigateur.", it: "Quella piattaforma si sincronizza con l'estensione del browser.", pt: "Essa plataforma sincroniza-se com a extensão do navegador." },
  "Ya se sincronizó hace muy poco. Espera un par de minutos.": { en: "It synced very recently. Wait a couple of minutes.", de: "Gerade erst synchronisiert. Warte ein paar Minuten.", fr: "Synchronisé il y a très peu. Attends quelques minutes.", it: "Si è sincronizzato da pochissimo. Aspetta un paio di minuti.", pt: "Sincronizou há muito pouco. Espera uns minutos." },
  "Plataforma no válida": { en: "Invalid platform", de: "Ungültige Plattform", fr: "Plateforme non valide", it: "Piattaforma non valida", pt: "Plataforma inválida" },
  "No hay ninguna invitación pendiente a esa liga.": { en: "There's no pending invite to that league.", de: "Es gibt keine offene Einladung zu dieser Liga.", fr: "Aucune invitation en attente pour cette ligue.", it: "Non c'è nessun invito in sospeso per quella lega.", pt: "Não há nenhum convite pendente para essa liga." },
  "No existe ese usuario": { en: "That user doesn't exist", de: "Diese Person gibt es nicht", fr: "Cet utilisateur n'existe pas", it: "Quell'utente non esiste", pt: "Esse utilizador não existe" },
  "Ya perteneces a un clan. Abandónalo primero.": { en: "You're already in a clan. Leave it first.", de: "Du bist schon in einem Clan. Verlass ihn zuerst.", fr: "Tu es déjà dans un clan. Quitte-le d'abord.", it: "Fai già parte di un clan. Abbandonalo prima.", pt: "Já pertences a um clã. Abandona-o primeiro." },
  "Trofeo no encontrado": { en: "Trophy not found", de: "Trophäe nicht gefunden", fr: "Trophée introuvable", it: "Trofeo non trovato", pt: "Troféu não encontrado" },
  "Solo puedes invitar a amigos.": { en: "You can only invite friends.", de: "Du kannst nur Freunde einladen.", fr: "Tu ne peux inviter que des amis.", it: "Puoi invitare solo amici.", pt: "Só podes convidar amigos." },
  "Solo el dueño puede invitar.": { en: "Only the owner can invite.", de: "Nur der Besitzer kann einladen.", fr: "Seul le créateur peut inviter.", it: "Solo il proprietario può invitare.", pt: "Só o dono pode convidar." },
  "Solo el dueño puede cambiar el reto.": { en: "Only the owner can change the challenge.", de: "Nur der Besitzer kann die Herausforderung ändern.", fr: "Seul le créateur peut changer le défi.", it: "Solo il proprietario può cambiare la sfida.", pt: "Só o dono pode mudar o desafio." },
  "Ponle un nombre a la liga.": { en: "Give the league a name.", de: "Gib der Liga einen Namen.", fr: "Donne un nom à la ligue.", it: "Dai un nome alla lega.", pt: "Dá um nome à liga." },
  "Perfil no encontrado": { en: "Profile not found", de: "Profil nicht gefunden", fr: "Profil introuvable", it: "Profilo non trovato", pt: "Perfil não encontrado" },
  "Nombre y etiqueta requeridos": { en: "Name and tag are required", de: "Name und Tag sind Pflicht", fr: "Nom et tag obligatoires", it: "Nome e tag obbligatori", pt: "Nome e etiqueta obrigatórios" },
  "No se pudo salir de la liga.": { en: "Couldn't leave the league.", de: "Liga konnte nicht verlassen werden.", fr: "Impossible de quitter la ligue.", it: "Impossibile uscire dalla lega.", pt: "Não foi possível sair da liga." },
  "No se pudo quitar a ese miembro.": { en: "Couldn't remove that member.", de: "Mitglied konnte nicht entfernt werden.", fr: "Impossible de retirer ce membre.", it: "Impossibile rimuovere quel membro.", pt: "Não foi possível remover esse membro." },
  "No se pudo borrar la liga.": { en: "Couldn't delete the league.", de: "Liga konnte nicht gelöscht werden.", fr: "Impossible de supprimer la ligue.", it: "Impossibile eliminare la lega.", pt: "Não foi possível apagar a liga." },
  "No se envió ningún archivo": { en: "No file was sent", de: "Keine Datei gesendet", fr: "Aucun fichier envoyé", it: "Nessun file inviato", pt: "Não foi enviado nenhum ficheiro" },
  "Carpeta no encontrada": { en: "Folder not found", de: "Ordner nicht gefunden", fr: "Dossier introuvable", it: "Cartella non trovata", pt: "Pasta não encontrada" },
  "Solo puedes compararte con tus amigos": { en: "You can only compare yourself with friends", de: "Du kannst dich nur mit Freunden vergleichen", fr: "Tu ne peux te comparer qu'avec tes amis", it: "Puoi confrontarti solo con i tuoi amici", pt: "Só te podes comparar com os teus amigos" },
  "Necesitas ser al menos Nivel 5 de Paragon para crear un clan.": { en: "You need to be at least Paragon level 5 to create a clan.", de: "Du brauchst mindestens Paragon-Stufe 5, um einen Clan zu gründen.", fr: "Il faut être au moins niveau 5 de Paragon pour créer un clan.", it: "Devi essere almeno al livello 5 di Paragon per creare un clan.", pt: "Precisas de ter pelo menos nível 5 do Paragon para criar um clã." },
  "Esta liga ya ha terminado.": { en: "This league has already ended.", de: "Diese Liga ist schon vorbei.", fr: "Cette ligue est déjà terminée.", it: "Questa lega è già finita.", pt: "Esta liga já terminou." },
  // Guerra de clanes (lib/clanWars.ts).
  "Un clan no puede retarse a sí mismo.": { en: "A clan can't challenge itself.", de: "Ein Clan kann sich nicht selbst herausfordern.", fr: "Un clan ne peut pas se défier lui-même.", it: "Un clan non può sfidare se stesso.", pt: "Um clã não se pode desafiar a si próprio." },
  "Solo el líder del clan puede retar a otro.": { en: "Only the clan leader can challenge another clan.", de: "Nur der Clan-Anführer kann einen anderen Clan herausfordern.", fr: "Seul le chef du clan peut défier un autre clan.", it: "Solo il leader del clan può sfidarne un altro.", pt: "Só o líder do clã pode desafiar outro." },
  "Ese clan no existe.": { en: "That clan doesn't exist.", de: "Diesen Clan gibt es nicht.", fr: "Ce clan n'existe pas.", it: "Quel clan non esiste.", pt: "Esse clã não existe." },
  "Tu clan ya tiene una guerra pendiente o en marcha.": { en: "Your clan already has a pending or ongoing war.", de: "Dein Clan hat schon einen offenen oder laufenden Krieg.", fr: "Ton clan a déjà une guerre en attente ou en cours.", it: "Il tuo clan ha già una guerra in sospeso o in corso.", pt: "O teu clã já tem uma guerra pendente ou a decorrer." },
  "Ese clan ya tiene una guerra pendiente o en marcha.": { en: "That clan already has a pending or ongoing war.", de: "Dieser Clan hat schon einen offenen oder laufenden Krieg.", fr: "Ce clan a déjà une guerre en attente ou en cours.", it: "Quel clan ha già una guerra in sospeso o in corso.", pt: "Esse clã já tem uma guerra pendente ou a decorrer." },
  "Ese reto ya no está pendiente.": { en: "That challenge is no longer pending.", de: "Diese Herausforderung ist nicht mehr offen.", fr: "Ce défi n'est plus en attente.", it: "Quella sfida non è più in sospeso.", pt: "Esse desafio já não está pendente." },
  "Solo el líder del clan retado puede responder.": { en: "Only the challenged clan's leader can respond.", de: "Nur der Anführer des herausgeforderten Clans kann antworten.", fr: "Seul le chef du clan défié peut répondre.", it: "Solo il leader del clan sfidato può rispondere.", pt: "Só o líder do clã desafiado pode responder." },
  // Sesiones de trofeos online (lib/sesiones.ts).
  "Sesión no encontrada": { en: "Session not found", de: "Session nicht gefunden", fr: "Session introuvable", it: "Sessione non trovata", pt: "Sessão não encontrada" },
  "Di qué trofeo o logro vais a por él (3-120 caracteres).": { en: "Say which trophy or achievement you're going for (3-120 characters).", de: "Gib an, welche Trophäe oder welchen Erfolg ihr holen wollt (3-120 Zeichen).", fr: "Indique le trophée ou succès visé (3 à 120 caractères).", it: "Indica quale trofeo o obiettivo volete ottenere (3-120 caratteri).", pt: "Diz que troféu ou conquista vão tentar (3-120 caracteres)." },
  "La descripción puede tener como mucho 500 caracteres.": { en: "The description can be 500 characters at most.", de: "Die Beschreibung darf höchstens 500 Zeichen haben.", fr: "La description fait 500 caractères maximum.", it: "La descrizione può avere al massimo 500 caratteri.", pt: "A descrição pode ter no máximo 500 caracteres." },
  "Ese texto contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.": { en: "That text contains offensive language — change it and try again.", de: "Dieser Text enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce texte contient des propos offensants — modifie-le et réessaie.", it: "Quel testo contiene linguaggio offensivo — cambialo e riprova.", pt: "Esse texto contém linguagem ofensiva — muda-o e tenta de novo." },
  "Entre 2 y 16 plazas en total, contándote a ti.": { en: "Between 2 and 16 spots in total, including you.", de: "Zwischen 2 und 16 Plätzen insgesamt, dich eingeschlossen.", fr: "Entre 2 et 16 places au total, toi compris.", it: "Tra 2 e 16 posti in totale, te compreso.", pt: "Entre 2 e 16 lugares no total, contando contigo." },
  "La sesión tiene que ser dentro de al menos 10 minutos.": { en: "The session has to be at least 10 minutes from now.", de: "Die Session muss mindestens 10 Minuten in der Zukunft liegen.", fr: "La session doit commencer dans au moins 10 minutes.", it: "La sessione deve iniziare tra almeno 10 minuti.", pt: "A sessão tem de ser daqui a pelo menos 10 minutos." },
  "Como mucho con 60 días de antelación.": { en: "At most 60 days ahead.", de: "Höchstens 60 Tage im Voraus.", fr: "60 jours à l'avance maximum.", it: "Al massimo con 60 giorni di anticipo.", pt: "No máximo com 60 dias de antecedência." },
  "Solo puedes organizar sesiones de juegos de tu biblioteca.": { en: "You can only set up sessions for games in your library.", de: "Du kannst nur Sessions für Spiele aus deiner Bibliothek organisieren.", fr: "Tu ne peux organiser des sessions que pour des jeux de ta bibliothèque.", it: "Puoi organizzare sessioni solo per giochi della tua libreria.", pt: "Só podes organizar sessões de jogos da tua biblioteca." },
  "Ya tienes ese trofeo: elige uno que te falte.": { en: "You already have that trophy: pick one you're missing.", de: "Diese Trophäe hast du schon: Wähle eine, die dir fehlt.", fr: "Tu as déjà ce trophée : choisis-en un qui te manque.", it: "Hai già quel trofeo: scegline uno che ti manca.", pt: "Já tens esse troféu: escolhe um que te falte." },
  "Ese trofeo no es de este juego.": { en: "That trophy isn't from this game.", de: "Diese Trophäe gehört nicht zu diesem Spiel.", fr: "Ce trophée n'est pas de ce jeu.", it: "Quel trofeo non è di questo gioco.", pt: "Esse troféu não é deste jogo." },
  "Esa sesión ya no está abierta.": { en: "That session isn't open anymore.", de: "Diese Session ist nicht mehr offen.", fr: "Cette session n'est plus ouverte.", it: "Quella sessione non è più aperta.", pt: "Essa sessão já não está aberta." },
  "Es tu propia sesión.": { en: "It's your own session.", de: "Das ist deine eigene Session.", fr: "C'est ta propre session.", it: "È la tua sessione.", pt: "É a tua própria sessão." },
  "Ya no quedan plazas.": { en: "There are no spots left.", de: "Es sind keine Plätze mehr frei.", fr: "Il n'y a plus de places.", it: "Non ci sono più posti.", pt: "Já não há lugares." },
  "Solo quien la organiza puede cancelarla.": { en: "Only the host can cancel it.", de: "Nur wer sie organisiert, kann sie absagen.", fr: "Seul l'organisateur peut l'annuler.", it: "Solo chi la organizza può annullarla.", pt: "Só quem a organiza a pode cancelar." },
  // Amigos (lib/profiles.ts → sendFriendRequest).
  "Escribe el usuario de tu amigo.": { en: "Type your friend's username.", de: "Gib den Benutzernamen deines Freundes ein.", fr: "Écris le nom d'utilisateur de ton ami.", it: "Scrivi il nome utente del tuo amico.", pt: "Escreve o utilizador do teu amigo." },
  "No existe nadie con ese usuario.": { en: "Nobody has that username.", de: "Niemand hat diesen Benutzernamen.", fr: "Personne n'a ce nom d'utilisateur.", it: "Non esiste nessuno con quel nome utente.", pt: "Não existe ninguém com esse utilizador." },
  "Ese eres tú.": { en: "That's you.", de: "Das bist du.", fr: "C'est toi.", it: "Quello sei tu.", pt: "Esse és tu." },
  "Ya sois amigos.": { en: "You're already friends.", de: "Ihr seid schon befreundet.", fr: "Vous êtes déjà amis.", it: "Siete già amici.", pt: "Já são amigos." },
  "Ya le enviaste una solicitud.": { en: "You already sent them a request.", de: "Du hast schon eine Anfrage geschickt.", fr: "Tu lui as déjà envoyé une demande.", it: "Gli hai già inviato una richiesta.", pt: "Já lhe enviaste um pedido." },
  "Liga no encontrada": { en: "League not found", de: "Liga nicht gefunden", fr: "Ligue introuvable", it: "Lega non trovata", pt: "Liga não encontrada" },
  "La etiqueta debe tener 5 caracteres máximo": { en: "The tag can be 5 characters at most", de: "Der Tag darf höchstens 5 Zeichen haben", fr: "Le tag fait 5 caractères maximum", it: "Il tag può avere al massimo 5 caratteri", pt: "A etiqueta pode ter no máximo 5 caracteres" },
  "Juego no encontrado": { en: "Game not found", de: "Spiel nicht gefunden", fr: "Jeu introuvable", it: "Gioco non trovato", pt: "Jogo não encontrado" },
  "Has comprobado este juego muchas veces seguidas. Espera unos minutos.": { en: "You've checked this game many times in a row. Wait a few minutes.", de: "Du hast dieses Spiel oft hintereinander geprüft. Warte ein paar Minuten.", fr: "Tu as vérifié ce jeu trop de fois d'affilée. Patiente quelques minutes.", it: "Hai controllato questo gioco molte volte di fila. Aspetta qualche minuto.", pt: "Verificaste este jogo muitas vezes seguidas. Espera uns minutos." },
  "Falta invitedUserId": { en: "Missing invitedUserId", de: "invitedUserId fehlt", fr: "invitedUserId manquant", it: "Manca invitedUserId", pt: "Falta invitedUserId" },
  "Falta el usuario a añadir": { en: "Missing the user to add", de: "Hinzuzufügende Person fehlt", fr: "Utilisateur à ajouter manquant", it: "Manca l'utente da aggiungere", pt: "Falta o utilizador a adicionar" },
  "Falta el token": { en: "Missing token", de: "Token fehlt", fr: "Jeton manquant", it: "Manca il token", pt: "Falta o token" },
  "Falta el identificador de la cuenta": { en: "Missing the account ID", de: "Konto-ID fehlt", fr: "Identifiant du compte manquant", it: "Manca l'identificativo dell'account", pt: "Falta o identificador da conta" },
  "Ese nombre de usuario ya está cogido.": { en: "That username is already taken.", de: "Dieser Benutzername ist schon vergeben.", fr: "Ce nom d'utilisateur est déjà pris.", it: "Quel nome utente è già preso.", pt: "Esse nome de utilizador já está ocupado." },
  "Entre 3 y 20 caracteres, solo minúsculas, números y guion bajo.": { en: "3 to 20 characters: lowercase letters, numbers and underscores only.", de: "3 bis 20 Zeichen, nur Kleinbuchstaben, Zahlen und Unterstrich.", fr: "Entre 3 et 20 caractères : minuscules, chiffres et tiret bas uniquement.", it: "Tra 3 e 20 caratteri: solo minuscole, numeri e trattino basso.", pt: "Entre 3 e 20 caracteres: só minúsculas, números e underscore." },
  "Elige un juego de los resultados.": { en: "Pick a game from the results.", de: "Wähle ein Spiel aus den Ergebnissen.", fr: "Choisis un jeu dans les résultats.", it: "Scegli un gioco dai risultati.", pt: "Escolhe um jogo dos resultados." },
  "El nombre a mostrar no puede estar vacío.": { en: "The display name can't be empty.", de: "Der Anzeigename darf nicht leer sein.", fr: "Le nom affiché ne peut pas être vide.", it: "Il nome visualizzato non può essere vuoto.", pt: "O nome a mostrar não pode estar vazio." },
  "Demasiados intentos de vincular seguidos. Prueba dentro de unos minutos.": { en: "Too many link attempts in a row. Try again in a few minutes.", de: "Zu viele Verknüpfungsversuche hintereinander. Versuch es in ein paar Minuten.", fr: "Trop de tentatives d'association d'affilée. Réessaie dans quelques minutes.", it: "Troppi tentativi di collegamento di fila. Riprova tra qualche minuto.", pt: "Demasiadas tentativas de ligação seguidas. Tenta daqui a uns minutos." },
  "Demasiadas comprobaciones seguidas. Espera un momento.": { en: "Too many checks in a row. Wait a moment.", de: "Zu viele Prüfungen hintereinander. Warte kurz.", fr: "Trop de vérifications d'affilée. Patiente un instant.", it: "Troppi controlli di fila. Aspetta un momento.", pt: "Demasiadas verificações seguidas. Espera um momento." },
  "Demasiados comentarios seguidos. Espera un momento.": { en: "Too many comments in a row. Wait a moment.", de: "Zu viele Kommentare hintereinander. Warte kurz.", fr: "Trop de commentaires d'affilée. Patiente un instant.", it: "Troppi commenti di fila. Aspetta un momento.", pt: "Demasiados comentários seguidos. Espera um momento." },
  "Demasiadas subidas seguidas. Prueba dentro de unos minutos.": { en: "Too many uploads in a row. Try again in a few minutes.", de: "Zu viele Uploads hintereinander. Versuch es in ein paar Minuten.", fr: "Trop d'envois d'affilée. Réessaie dans quelques minutes.", it: "Troppi caricamenti di fila. Riprova tra qualche minuto.", pt: "Demasiados carregamentos seguidos. Tenta daqui a uns minutos." },
  "Datos no válidos": { en: "Invalid data", de: "Ungültige Daten", fr: "Données non valides", it: "Dati non validi", pt: "Dados inválidos" },
  "Comentario vacío": { en: "Empty comment", de: "Leerer Kommentar", fr: "Commentaire vide", it: "Commento vuoto", pt: "Comentário vazio" },
  "No se ha podido contactar con la plataforma. Inténtalo en un momento.": { en: "Couldn't reach the platform. Try again in a moment.", de: "Die Plattform ist nicht erreichbar. Versuch es gleich noch mal.", fr: "Impossible de joindre la plateforme. Réessaie dans un instant.", it: "Impossibile contattare la piattaforma. Riprova tra un momento.", pt: "Não foi possível contactar a plataforma. Tenta daqui a um momento." },
  "El servidor no tiene configurado el acceso a PSN.": { en: "The server isn't set up to access PSN.", de: "Der Server ist nicht für PSN eingerichtet.", fr: "Le serveur n'est pas configuré pour PSN.", it: "Il server non è configurato per accedere a PSN.", pt: "O servidor não está configurado para aceder à PSN." },
  "El servidor no tiene configurado el acceso a PSN (falta PSN_NPSSO).": { en: "The server isn't set up to access PSN.", de: "Der Server ist nicht für PSN eingerichtet.", fr: "Le serveur n'est pas configuré pour PSN.", it: "Il server non è configurato per accedere a PSN.", pt: "O servidor não está configurado para aceder à PSN." },
  "El servidor no tiene configurado el acceso a Steam (falta STEAM_API_KEY).": { en: "The server isn't set up to access Steam.", de: "Der Server ist nicht für Steam eingerichtet.", fr: "Le serveur n'est pas configuré pour Steam.", it: "Il server non è configurato per accedere a Steam.", pt: "O servidor não está configurado para aceder ao Steam." },
  "El servidor no tiene configurado el acceso a Xbox (falta XBL_API_KEY).": { en: "The server isn't set up to access Xbox.", de: "Der Server ist nicht für Xbox eingerichtet.", fr: "Le serveur n'est pas configuré pour Xbox.", it: "Il server non è configurato per accedere a Xbox.", pt: "O servidor não está configurado para aceder à Xbox." },
  "PSN no aceptó el token NPSSO. Lo más habitual es que haya caducado: vuelve a copiarlo con la sesión de PlayStation abierta.": { en: "PSN didn't accept the server's session. Try again later.", de: "PSN hat die Server-Sitzung nicht akzeptiert. Versuch es später noch mal.", fr: "PSN n'a pas accepté la session du serveur. Réessaie plus tard.", it: "PSN non ha accettato la sessione del server. Riprova più tardi.", pt: "A PSN não aceitou a sessão do servidor. Tenta mais tarde." },
  "PSN no ha aceptado la sesión — vuelve a intentarlo con playstation.com abierto y con la sesión iniciada.": { en: "PSN didn't accept the session — try again with playstation.com open and signed in.", de: "PSN hat die Sitzung nicht akzeptiert — versuch es erneut, während playstation.com geöffnet und angemeldet ist.", fr: "PSN n'a pas accepté la session — réessaie avec playstation.com ouvert et connecté.", it: "PSN non ha accettato la sessione — riprova con playstation.com aperto e l'accesso effettuato.", pt: "A PSN não aceitou a sessão — tenta de novo com playstation.com aberto e a sessão iniciada." },
  "Epic Games está bloqueando ahora mismo las consultas automáticas (su protección antibots), así que no podemos leer tu perfil. Tu enlace está bien: inténtalo más tarde.": { en: "Epic Games is blocking automated requests right now (its anti-bot protection), so we can't read your profile. Your link is fine: try again later.", de: "Epic Games blockiert gerade automatische Anfragen (Bot-Schutz), daher können wir dein Profil nicht lesen. Dein Link ist in Ordnung: versuch es später.", fr: "Epic Games bloque en ce moment les requêtes automatiques (protection anti-bots), donc on ne peut pas lire ton profil. Ton lien est bon : réessaie plus tard.", it: "Epic Games sta bloccando le richieste automatiche in questo momento (la sua protezione anti-bot), quindi non possiamo leggere il tuo profilo. Il tuo link va bene: riprova più tardi.", pt: "A Epic Games está a bloquear os pedidos automáticos neste momento (a proteção anti-bots), por isso não conseguimos ler o teu perfil. A tua ligação está bem: tenta mais tarde." },
  "Esa guía no se puede publicar — contiene lenguaje ofensivo. Cámbiala e inténtalo de nuevo.": { en: "That guide can't be published — it contains offensive language. Change it and try again.", de: "Dieser Guide kann nicht veröffentlicht werden — er enthält beleidigende Sprache. Ändere ihn und versuch es erneut.", fr: "Ce guide ne peut pas être publié — il contient des propos offensants. Modifie-le et réessaie.", it: "Quella guida non si può pubblicare — contiene linguaggio offensivo. Cambiala e riprova.", pt: "Esse guia não pode ser publicado — contém linguagem ofensiva. Muda-o e tenta de novo." },
  "Ese comentario contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.": { en: "That comment contains offensive language — change it and try again.", de: "Dieser Kommentar enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce commentaire contient des propos offensants — modifie-le et réessaie.", it: "Quel commento contiene linguaggio offensivo — cambialo e riprova.", pt: "Esse comentário contém linguagem ofensiva — muda-o e tenta de novo." },
  "Ese nombre contiene lenguaje ofensivo — cámbialo.": { en: "That name contains offensive language — change it.", de: "Dieser Name enthält beleidigende Sprache — ändere ihn.", fr: "Ce nom contient des propos offensants — change-le.", it: "Quel nome contiene linguaggio offensivo — cambialo.", pt: "Esse nome contém linguagem ofensiva — muda-o." },
  "Escribe algo antes de publicar.": { en: "Write something before publishing.", de: "Schreib etwas, bevor du veröffentlichst.", fr: "Écris quelque chose avant de publier.", it: "Scrivi qualcosa prima di pubblicare.", pt: "Escreve alguma coisa antes de publicar." },
  "Esa invitación ya no existe": { en: "That invite no longer exists", de: "Diese Einladung gibt es nicht mehr", fr: "Cette invitation n'existe plus", it: "Quell'invito non esiste più", pt: "Esse convite já não existe" },
  "Esa persona ya está en un clan": { en: "That person is already in a clan", de: "Diese Person ist schon in einem Clan", fr: "Cette personne est déjà dans un clan", it: "Quella persona è già in un clan", pt: "Essa pessoa já está num clã" },
  "El nombre del clan tiene que tener entre 3 y 40 caracteres.": { en: "The clan name must be 3 to 40 characters.", de: "Der Clan-Name muss 3 bis 40 Zeichen haben.", fr: "Le nom du clan doit faire entre 3 et 40 caractères.", it: "Il nome del clan deve avere tra 3 e 40 caratteri.", pt: "O nome do clã tem de ter entre 3 e 40 caracteres." },
  "La descripción puede tener como mucho 300 caracteres.": { en: "The description can be 300 characters at most.", de: "Die Beschreibung darf höchstens 300 Zeichen haben.", fr: "La description fait 300 caractères maximum.", it: "La descrizione può avere al massimo 300 caratteri.", pt: "A descrição pode ter no máximo 300 caracteres." },
  "La etiqueta tiene que tener de 2 a 5 letras o números.": { en: "The tag must be 2 to 5 letters or numbers.", de: "Der Tag muss 2 bis 5 Buchstaben oder Zahlen haben.", fr: "Le tag doit faire 2 à 5 lettres ou chiffres.", it: "Il tag deve avere da 2 a 5 lettere o numeri.", pt: "A etiqueta tem de ter de 2 a 5 letras ou números." },
  "Ponle un nombre a la carpeta.": { en: "Give the folder a name.", de: "Gib dem Ordner einen Namen.", fr: "Donne un nom au dossier.", it: "Dai un nome alla cartella.", pt: "Dá um nome à pasta." },
  "Solo el líder del clan puede invitar": { en: "Only the clan leader can invite", de: "Nur die Clan-Leitung kann einladen", fr: "Seul le chef du clan peut inviter", it: "Solo il leader del clan può invitare", pt: "Só o líder do clã pode convidar" },
  "Solo puedes invitar a amigos tuyos": { en: "You can only invite your friends", de: "Du kannst nur deine Freunde einladen", fr: "Tu ne peux inviter que tes amis", it: "Puoi invitare solo i tuoi amici", pt: "Só podes convidar amigos teus" },
  "Ya estás en un clan": { en: "You're already in a clan", de: "Du bist schon in einem Clan", fr: "Tu es déjà dans un clan", it: "Sei già in un clan", pt: "Já estás num clã" },
  "Ya le has invitado a este clan": { en: "You've already invited them to this clan", de: "Du hast diese Person schon eingeladen", fr: "Tu l'as déjà invité dans ce clan", it: "L'hai già invitato a questo clan", pt: "Já o convidaste para este clã" },
  "Ya tienes una carpeta con ese nombre.": { en: "You already have a folder with that name.", de: "Du hast schon einen Ordner mit diesem Namen.", fr: "Tu as déjà un dossier avec ce nom.", it: "Hai già una cartella con quel nome.", pt: "Já tens uma pasta com esse nome." },
  "Ese juego no está en tu biblioteca.": { en: "That game isn't in your library.", de: "Dieses Spiel ist nicht in deiner Bibliothek.", fr: "Ce jeu n'est pas dans ta bibliothèque.", it: "Quel gioco non è nella tua libreria.", pt: "Esse jogo não está na tua biblioteca." },
  "Un juego añadido a mano no tiene nada que sincronizar.": { en: "A manually added game has nothing to sync.", de: "Ein manuell hinzugefügtes Spiel hat nichts zu synchronisieren.", fr: "Un jeu ajouté à la main n'a rien à synchroniser.", it: "Un gioco aggiunto a mano non ha niente da sincronizzare.", pt: "Um jogo adicionado à mão não tem nada para sincronizar." },
  "Storage no configurado": { en: "Storage isn't set up", de: "Speicher nicht eingerichtet", fr: "Stockage non configuré", it: "Archiviazione non configurata", pt: "Armazenamento não configurado" },
  "Formato no admitido": { en: "Format not supported", de: "Format nicht unterstützt", fr: "Format non pris en charge", it: "Formato non supportato", pt: "Formato não suportado" },
  "El archivo pesa demasiado (máximo 4 MB)": { en: "The file is too big (4 MB max)", de: "Die Datei ist zu groß (max. 4 MB)", fr: "Le fichier est trop lourd (4 Mo max.)", it: "Il file è troppo grande (massimo 4 MB)", pt: "O ficheiro é demasiado grande (máximo 4 MB)" },
  "El archivo no es lo que dice su extensión": { en: "The file isn't what its extension says", de: "Die Datei passt nicht zu ihrer Endung", fr: "Le fichier ne correspond pas à son extension", it: "Il file non corrisponde alla sua estensione", pt: "O ficheiro não é o que diz a extensão" },
  "No se pudo subir el archivo": { en: "Couldn't upload the file", de: "Datei konnte nicht hochgeladen werden", fr: "Impossible d'envoyer le fichier", it: "Impossibile caricare il file", pt: "Não foi possível carregar o ficheiro" },
  "No tienes vinculada esa plataforma.": { en: "You haven't linked that platform.", de: "Diese Plattform ist nicht verknüpft.", fr: "Tu n'as pas associé cette plateforme.", it: "Non hai collegato quella piattaforma.", pt: "Não tens essa plataforma ligada." },
  // Cuentas de Steam extra (lib/steamExtra.ts, 15 oct 2026).
  "No disponible.": { en: "Not available.", de: "Nicht verfügbar.", fr: "Non disponible.", it: "Non disponibile.", pt: "Não disponível." },
  "Vincula primero tu cuenta principal de Steam.": { en: "Link your main Steam account first.", de: "Verknüpfe zuerst dein Haupt-Steam-Konto.", fr: "Associe d'abord ton compte Steam principal.", it: "Collega prima il tuo account Steam principale.", pt: "Liga primeiro a tua conta principal do Steam." },
  "Esa ya es tu cuenta principal de Steam.": { en: "That's already your main Steam account.", de: "Das ist schon dein Haupt-Steam-Konto.", fr: "C'est déjà ton compte Steam principal.", it: "Quello è già il tuo account Steam principale.", pt: "Essa já é a tua conta principal do Steam." },
  "No se ha podido guardar la cuenta. Inténtalo en un momento.": { en: "Couldn't save the account. Try again in a moment.", de: "Das Konto konnte nicht gespeichert werden. Versuch es gleich noch mal.", fr: "Impossible d'enregistrer le compte. Réessaie dans un instant.", it: "Impossibile salvare l'account. Riprova tra un momento.", pt: "Não foi possível guardar a conta. Tenta daqui a um momento." },
  // Server actions de la web (lib/mensajesWeb.ts, 13 oct 2026).
  "No se pudo entregar el aviso.": { en: "Couldn't deliver the notification.", de: "Die Benachrichtigung konnte nicht zugestellt werden.", fr: "Impossible de livrer la notification.", it: "Impossibile consegnare l'avviso.", pt: "Não foi possível entregar o aviso." },
  "No se pudo enviar.": { en: "Couldn't send it.", de: "Konnte nicht gesendet werden.", fr: "Impossible d'envoyer.", it: "Impossibile inviare.", pt: "Não foi possível enviar." },
  "No se pudo guardar.": { en: "Couldn't save it.", de: "Konnte nicht gespeichert werden.", fr: "Impossible d'enregistrer.", it: "Impossibile salvare.", pt: "Não foi possível guardar." },
  "Avisos por Discord activados.": { en: "Discord alerts turned on.", de: "Discord-Benachrichtigungen aktiviert.", fr: "Alertes Discord activées.", it: "Avvisi su Discord attivati.", pt: "Avisos pelo Discord ativados." },
  "Avisos por Discord desactivados.": { en: "Discord alerts turned off.", de: "Discord-Benachrichtigungen deaktiviert.", fr: "Alertes Discord désactivées.", it: "Avvisi su Discord disattivati.", pt: "Avisos pelo Discord desativados." },
  "Carpeta creada.": { en: "Folder created.", de: "Ordner erstellt.", fr: "Dossier créé.", it: "Cartella creata.", pt: "Pasta criada." },
  "Carpeta renombrada.": { en: "Folder renamed.", de: "Ordner umbenannt.", fr: "Dossier renommé.", it: "Cartella rinominata.", pt: "Pasta renomeada." },
  "Di en qué lo has jugado (Switch, PS1, retro...).": { en: "Say what you played it on (Switch, PS1, retro...).", de: "Gib an, worauf du es gespielt hast (Switch, PS1, Retro...).", fr: "Indique sur quoi tu y as joué (Switch, PS1, rétro...).", it: "Indica su cosa ci hai giocato (Switch, PS1, retro...).", pt: "Diz em que jogaste (Switch, PS1, retro...)." },
  "El contador no puede ser negativo.": { en: "The counter can't be negative.", de: "Der Zähler darf nicht negativ sein.", fr: "Le compteur ne peut pas être négatif.", it: "Il contatore non può essere negativo.", pt: "O contador não pode ser negativo." },
  "El precio no puede ser negativo.": { en: "The price can't be negative.", de: "Der Preis darf nicht negativ sein.", fr: "Le prix ne peut pas être négatif.", it: "Il prezzo non può essere negativo.", pt: "O preço não pode ser negativo." },
  "El título tiene que tener entre 2 y 60 caracteres.": { en: "The title must be 2 to 60 characters.", de: "Der Titel muss 2 bis 60 Zeichen haben.", fr: "Le titre doit faire entre 2 et 60 caractères.", it: "Il titolo deve avere tra 2 e 60 caratteri.", pt: "O título tem de ter entre 2 e 60 caracteres." },
  "Elige al menos un juego.": { en: "Pick at least one game.", de: "Wähle mindestens ein Spiel.", fr: "Choisis au moins un jeu.", it: "Scegli almeno un gioco.", pt: "Escolhe pelo menos um jogo." },
  "Elige un juego de los resultados de búsqueda.": { en: "Pick a game from the search results.", de: "Wähle ein Spiel aus den Suchergebnissen.", fr: "Choisis un jeu dans les résultats de recherche.", it: "Scegli un gioco dai risultati di ricerca.", pt: "Escolhe um jogo dos resultados da pesquisa." },
  "Elige una fecha de aquí a 6 meses.": { en: "Pick a date within the next 6 months.", de: "Wähle ein Datum innerhalb der nächsten 6 Monate.", fr: "Choisis une date dans les 6 prochains mois.", it: "Scegli una data entro i prossimi 6 mesi.", pt: "Escolhe uma data nos próximos 6 meses." },
  "Esa guía contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo.": { en: "That guide contains offensive language — change it and try again.", de: "Dieser Guide enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce guide contient des propos offensants — modifie-le et réessaie.", it: "Quella guida contiene linguaggio offensivo — cambiala e riprova.", pt: "Esse guia contém linguagem ofensiva — muda-o e tenta de novo." },
  "Esa respuesta contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo.": { en: "That reply contains offensive language — change it and try again.", de: "Diese Antwort enthält beleidigende Sprache — ändere sie und versuch es erneut.", fr: "Cette réponse contient des propos offensants — modifie-la et réessaie.", it: "Quella risposta contiene linguaggio offensivo — cambiala e riprova.", pt: "Essa resposta contém linguagem ofensiva — muda-a e tenta de novo." },
  "Escribe algo antes de responder.": { en: "Write something before replying.", de: "Schreib etwas, bevor du antwortest.", fr: "Écris quelque chose avant de répondre.", it: "Scrivi qualcosa prima di rispondere.", pt: "Escreve alguma coisa antes de responder." },
  "Escribe tu Gamertag de Xbox.": { en: "Enter your Xbox Gamertag.", de: "Gib dein Xbox-Gamertag ein.", fr: "Saisis ton Gamertag Xbox.", it: "Scrivi il tuo Gamertag Xbox.", pt: "Escreve o teu Gamertag da Xbox." },
  "Escribe tu ID de PlayStation.": { en: "Enter your PlayStation ID.", de: "Gib deine PlayStation-ID ein.", fr: "Saisis ton ID PlayStation.", it: "Scrivi il tuo ID PlayStation.", pt: "Escreve o teu ID da PlayStation." },
  "Escribe tu usuario de Steam, tu SteamID64 o la URL de tu perfil.": { en: "Enter your Steam username, your SteamID64 or your profile URL.", de: "Gib deinen Steam-Namen, deine SteamID64 oder deine Profil-URL ein.", fr: "Saisis ton nom Steam, ton SteamID64 ou l'URL de ton profil.", it: "Scrivi il tuo nome utente Steam, il tuo SteamID64 o l'URL del tuo profilo.", pt: "Escreve o teu utilizador do Steam, o teu SteamID64 ou o URL do teu perfil." },
  "Ese juego no lo tenéis los dos a medias.": { en: "You don't both have that game in progress.", de: "Ihr habt dieses Spiel nicht beide angefangen.", fr: "Vous n'avez pas tous les deux ce jeu en cours.", it: "Non avete entrambi quel gioco in corso.", pt: "Não têm os dois esse jogo a meio." },
  "Ese título contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.": { en: "That title contains offensive language — change it and try again.", de: "Dieser Titel enthält beleidigende Sprache — ändere ihn und versuch es erneut.", fr: "Ce titre contient des propos offensants — modifie-le et réessaie.", it: "Quel titolo contiene linguaggio offensivo — cambialo e riprova.", pt: "Esse título contém linguagem ofensiva — muda-o e tenta de novo." },
  "Esos juegos no están en tu biblioteca.": { en: "Those games aren't in your library.", de: "Diese Spiele sind nicht in deiner Bibliothek.", fr: "Ces jeux ne sont pas dans ta bibliothèque.", it: "Quei giochi non sono nella tua libreria.", pt: "Esses jogos não estão na tua biblioteca." },
  "Espera un momento antes de crear otra sesión.": { en: "Wait a moment before creating another session.", de: "Warte kurz, bevor du eine weitere Session erstellst.", fr: "Patiente un instant avant de créer une autre session.", it: "Aspetta un momento prima di creare un'altra sessione.", pt: "Espera um momento antes de criar outra sessão." },
  "Espera un momento antes de proponer otro reto.": { en: "Wait a moment before proposing another challenge.", de: "Warte kurz, bevor du eine weitere Herausforderung vorschlägst.", fr: "Patiente un instant avant de proposer un autre défi.", it: "Aspetta un momento prima di proporre un'altra sfida.", pt: "Espera um momento antes de propor outro desafio." },
  "Espera un momento antes de volver a intentarlo.": { en: "Wait a moment before trying again.", de: "Warte kurz, bevor du es erneut versuchst.", fr: "Patiente un instant avant de réessayer.", it: "Aspetta un momento prima di riprovare.", pt: "Espera um momento antes de tentares de novo." },
  "Falta el trofeo.": { en: "The trophy is missing.", de: "Die Trophäe fehlt.", fr: "Le trophée manque.", it: "Manca il trofeo.", pt: "Falta o troféu." },
  "Fecha no válida.": { en: "Invalid date.", de: "Ungültiges Datum.", fr: "Date non valide.", it: "Data non valida.", pt: "Data inválida." },
  "Formato no válido.": { en: "Invalid format.", de: "Ungültiges Format.", fr: "Format non valide.", it: "Formato non valido.", pt: "Formato inválido." },
  "Guía publicada.": { en: "Guide published.", de: "Guide veröffentlicht.", fr: "Guide publié.", it: "Guida pubblicata.", pt: "Guia publicado." },
  "Has publicado mucho seguido. Espera un momento.": { en: "You've posted a lot in a row. Wait a moment.", de: "Du hast viel hintereinander gepostet. Warte kurz.", fr: "Tu as beaucoup publié d'affilée. Patiente un instant.", it: "Hai pubblicato molto di fila. Aspetta un momento.", pt: "Publicaste muito seguido. Espera um momento." },
  "Has publicado mucho seguido. Espera unos minutos.": { en: "You've posted a lot in a row. Wait a few minutes.", de: "Du hast viel hintereinander gepostet. Warte ein paar Minuten.", fr: "Tu as beaucoup publié d'affilée. Patiente quelques minutes.", it: "Hai pubblicato molto di fila. Aspetta qualche minuto.", pt: "Publicaste muito seguido. Espera uns minutos." },
  "Has respondido mucho seguido. Espera un momento.": { en: "You've replied a lot in a row. Wait a moment.", de: "Du hast viel hintereinander geantwortet. Warte kurz.", fr: "Tu as beaucoup répondu d'affilée. Patiente un instant.", it: "Hai risposto molto di fila. Aspetta un momento.", pt: "Respondeste muito seguido. Espera um momento." },
  "Juego no válido.": { en: "Invalid game.", de: "Ungültiges Spiel.", fr: "Jeu non valide.", it: "Gioco non valido.", pt: "Jogo inválido." },
  "La meta tiene que ser un número mayor que 0.": { en: "The goal must be a number greater than 0.", de: "Das Ziel muss eine Zahl größer als 0 sein.", fr: "L'objectif doit être un nombre supérieur à 0.", it: "L'obiettivo deve essere un numero maggiore di 0.", pt: "A meta tem de ser um número maior que 0." },
  "Mensaje de prueba enviado — revisa tus DMs de Discord.": { en: "Test message sent — check your Discord DMs.", de: "Testnachricht gesendet — schau in deine Discord-DMs.", fr: "Message de test envoyé — regarde tes MP Discord.", it: "Messaggio di prova inviato — controlla i tuoi DM su Discord.", pt: "Mensagem de teste enviada — vê as tuas DMs do Discord." },
  "No se ha podido crear la carpeta.": { en: "Couldn't create the folder.", de: "Ordner konnte nicht erstellt werden.", fr: "Impossible de créer le dossier.", it: "Impossibile creare la cartella.", pt: "Não foi possível criar a pasta." },
  "No se ha podido guardar la guía.": { en: "Couldn't save the guide.", de: "Guide konnte nicht gespeichert werden.", fr: "Impossible d'enregistrer le guide.", it: "Impossibile salvare la guida.", pt: "Não foi possível guardar o guia." },
  "No se ha podido mover el juego.": { en: "Couldn't move the game.", de: "Spiel konnte nicht verschoben werden.", fr: "Impossible de déplacer le jeu.", it: "Impossibile spostare il gioco.", pt: "Não foi possível mover o jogo." },
  "No se ha podido renombrar la carpeta.": { en: "Couldn't rename the folder.", de: "Ordner konnte nicht umbenannt werden.", fr: "Impossible de renommer le dossier.", it: "Impossibile rinominare la cartella.", pt: "Não foi possível renomear a pasta." },
  "No tienes juegos completados de ese estudio.": { en: "You don't have any completed games from that studio.", de: "Du hast keine abgeschlossenen Spiele von diesem Studio.", fr: "Tu n'as aucun jeu terminé de ce studio.", it: "Non hai giochi completati di quello studio.", pt: "Não tens jogos completos desse estúdio." },
  "Pega el enlace a tu perfil de Epic Games (o tu ID de cuenta).": { en: "Paste the link to your Epic Games profile (or your account ID).", de: "Füge den Link zu deinem Epic-Games-Profil ein (oder deine Konto-ID).", fr: "Colle le lien de ton profil Epic Games (ou ton ID de compte).", it: "Incolla il link al tuo profilo Epic Games (o il tuo ID account).", pt: "Cola a ligação para o teu perfil da Epic Games (ou o teu ID de conta)." },
  "Perfil actualizado correctamente.": { en: "Profile updated.", de: "Profil aktualisiert.", fr: "Profil mis à jour.", it: "Profilo aggiornato.", pt: "Perfil atualizado." },
  "Plataforma no válida.": { en: "Invalid platform.", de: "Ungültige Plattform.", fr: "Plateforme non valide.", it: "Piattaforma non valida.", pt: "Plataforma inválida." },
  "Pon un precio entre 0,01 y 999 €.": { en: "Enter a price between €0.01 and €999.", de: "Gib einen Preis zwischen 0,01 und 999 € ein.", fr: "Indique un prix entre 0,01 et 999 €.", it: "Inserisci un prezzo tra 0,01 e 999 €.", pt: "Indica um preço entre 0,01 e 999 €." },
  "Ponle un título y algo de texto.": { en: "Give it a title and some text.", de: "Gib ihm einen Titel und etwas Text.", fr: "Donne-lui un titre et un peu de texte.", it: "Dagli un titolo e un po' di testo.", pt: "Dá-lhe um título e algum texto." },
  "Publicado.": { en: "Posted.", de: "Veröffentlicht.", fr: "Publié.", it: "Pubblicato.", pt: "Publicado." },
  "Sincronizado.": { en: "Synced.", de: "Synchronisiert.", fr: "Synchronisé.", it: "Sincronizzato.", pt: "Sincronizado." },
  "Solo puedes fijar un máximo de 3 trofeos.": { en: "You can pin 3 trophies at most.", de: "Du kannst höchstens 3 Trophäen anheften.", fr: "Tu peux épingler 3 trophées maximum.", it: "Puoi fissare al massimo 3 trofei.", pt: "Só podes fixar no máximo 3 troféus." },
  "Tipo de vitrina no válido.": { en: "Invalid showcase type.", de: "Ungültiger Vitrinentyp.", fr: "Type de vitrine non valide.", it: "Tipo di vetrina non valido.", pt: "Tipo de vitrina inválido." },
  "Tu cuenta no inició sesión con Discord — sin eso el bot no sabe a quién escribir.": { en: "Your account didn't sign in with Discord — without that the bot doesn't know who to message.", de: "Dein Konto hat sich nicht mit Discord angemeldet — ohne das weiß der Bot nicht, wem er schreiben soll.", fr: "Ton compte ne s'est pas connecté avec Discord — sans ça, le bot ne sait pas à qui écrire.", it: "Il tuo account non ha effettuato l'accesso con Discord — senza questo il bot non sa a chi scrivere.", pt: "A tua conta não iniciou sessão com o Discord — sem isso o bot não sabe a quem escrever." },
  "Ya tenéis un reto abierto con ese juego.": { en: "You already have an open challenge with that game.", de: "Ihr habt schon eine offene Herausforderung mit diesem Spiel.", fr: "Vous avez déjà un défi ouvert sur ce jeu.", it: "Avete già una sfida aperta con quel gioco.", pt: "Já têm um desafio aberto com esse jogo." },
  "Ese texto no se puede publicar — contiene lenguaje ofensivo. Cámbialo e inténtalo de nuevo.": { en: "That text can't be published — it contains offensive language. Change it and try again.", de: "Dieser Text kann nicht veröffentlicht werden — er enthält beleidigende Sprache. Ändere ihn und versuch es erneut.", fr: "Ce texte ne peut pas être publié — il contient des propos offensants. Modifie-le et réessaie.", it: "Quel testo non si può pubblicare — contiene linguaggio offensivo. Cambialo e riprova.", pt: "Esse texto não pode ser publicado — contém linguagem ofensiva. Muda-o e tenta de novo." },
  "Falta DISCORD_BOT_TOKEN en el servidor.": { en: "The server is missing DISCORD_BOT_TOKEN.", de: "Auf dem Server fehlt DISCORD_BOT_TOKEN.", fr: "DISCORD_BOT_TOKEN manque sur le serveur.", it: "Sul server manca DISCORD_BOT_TOKEN.", pt: "Falta DISCORD_BOT_TOKEN no servidor." },
  "Fallo de red al hablar con Discord.": { en: "Network error while talking to Discord.", de: "Netzwerkfehler bei der Verbindung mit Discord.", fr: "Erreur réseau en contactant Discord.", it: "Errore di rete comunicando con Discord.", pt: "Falha de rede ao falar com o Discord." },
  "Discord no deja escribirte — tenéis que compartir un servidor con el bot y tener los DMs de miembros del servidor activados.": { en: "Discord won't let the bot message you — you need to share a server with it and allow DMs from server members.", de: "Discord lässt den Bot dir nicht schreiben — ihr müsst einen Server teilen und DMs von Servermitgliedern erlauben.", fr: "Discord n'autorise pas le bot à t'écrire — vous devez partager un serveur et autoriser les MP des membres du serveur.", it: "Discord non permette al bot di scriverti — dovete condividere un server con il bot e avere attivi i DM dai membri del server.", pt: "O Discord não deixa o bot escrever-te — têm de partilhar um servidor com o bot e ter as DMs de membros do servidor ativadas." },
  "Tu cuenta de Paragon no inició sesión con Discord, así que no hay a quién escribir.": { en: "Your Paragon account didn't sign in with Discord, so there's nobody to message.", de: "Dein Paragon-Konto hat sich nicht mit Discord angemeldet, daher gibt es niemanden zum Anschreiben.", fr: "Ton compte Paragon ne s'est pas connecté avec Discord, donc personne à qui écrire.", it: "Il tuo account Paragon non ha effettuato l'accesso con Discord, quindi non c'è nessuno a cui scrivere.", pt: "A tua conta do Paragon não iniciou sessão com o Discord, por isso não há a quem escrever." },
  "Faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en el servidor.": { en: "The server is missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.", de: "Auf dem Server fehlen VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.", fr: "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY manquent sur le serveur.", it: "Sul server mancano VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.", pt: "Faltam VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no servidor." },
  "No hay ninguna suscripción guardada — activa las notificaciones primero.": { en: "There's no saved subscription — turn on notifications first.", de: "Es ist kein Abo gespeichert — aktiviere zuerst die Benachrichtigungen.", fr: "Aucun abonnement enregistré — active d'abord les notifications.", it: "Non c'è nessuna iscrizione salvata — attiva prima le notifiche.", pt: "Não há nenhuma subscrição guardada — ativa primeiro as notificações." },
  "La suscripción ya no es válida (se ha borrado).": { en: "The subscription is no longer valid (it was deleted).", de: "Das Abo ist nicht mehr gültig (wurde gelöscht).", fr: "L'abonnement n'est plus valide (il a été supprimé).", it: "L'iscrizione non è più valida (è stata eliminata).", pt: "A subscrição já não é válida (foi apagada)." },
  "Error desconocido enviando el push.": { en: "Unknown error sending the notification.", de: "Unbekannter Fehler beim Senden der Benachrichtigung.", fr: "Erreur inconnue lors de l'envoi de la notification.", it: "Errore sconosciuto durante l'invio della notifica.", pt: "Erro desconhecido ao enviar a notificação." },
};

const PATRONES: { re: RegExp; trad: (m: RegExpMatchArray) => Trad }[] = [
  {
    re: /^Ya estás en \[(.*)\]\. Sal de ese clan para unirte a otro\.$/,
    trad: (m) => ({ en: `You're already in [${m[1]}]. Leave that clan to join another.`, de: `Du bist schon in [${m[1]}]. Verlass diesen Clan, um einem anderen beizutreten.`, fr: `Tu es déjà dans [${m[1]}]. Quitte ce clan pour en rejoindre un autre.`, it: `Sei già in [${m[1]}]. Esci da quel clan per unirti a un altro.`, pt: `Já estás em [${m[1]}]. Sai desse clã para te juntares a outro.` }),
  },
  {
    re: /^PSN no encuentra ningún perfil con el ID "(.*)"\.$/,
    trad: (m) => ({ en: `PSN can't find any profile with the ID "${m[1]}".`, de: `PSN findet kein Profil mit der ID „${m[1]}“.`, fr: `PSN ne trouve aucun profil avec l'ID « ${m[1]} ».`, it: `PSN non trova nessun profilo con l'ID "${m[1]}".`, pt: `A PSN não encontra nenhum perfil com o ID "${m[1]}".` }),
  },
  {
    re: /^Steam no encuentra ningún perfil con "(.*)"\.$/,
    trad: (m) => ({ en: `Steam can't find any profile matching "${m[1]}".`, de: `Steam findet kein Profil zu „${m[1]}“.`, fr: `Steam ne trouve aucun profil correspondant à « ${m[1]} ».`, it: `Steam non trova nessun profilo con "${m[1]}".`, pt: `O Steam não encontra nenhum perfil com "${m[1]}".` }),
  },
  {
    re: /^Xbox no encuentra ningún gamertag "(.*)"\.$/,
    trad: (m) => ({ en: `Xbox can't find the gamertag "${m[1]}".`, de: `Xbox findet das Gamertag „${m[1]}“ nicht.`, fr: `Xbox ne trouve pas le gamertag « ${m[1]} ».`, it: `Xbox non trova il gamertag "${m[1]}".`, pt: `A Xbox não encontra o gamertag "${m[1]}".` }),
  },
  {
    re: /^El perfil de Steam de (.*) es privado\./,
    trad: (m) => ({
      en: `${m[1]}'s Steam profile is private. In Steam: Profile → Edit Profile → Privacy, set "My profile" and "Game details" to public.`,
      de: `Das Steam-Profil von ${m[1]} ist privat. In Steam: Profil → Profil bearbeiten → Privatsphäre, stelle „Mein Profil“ und „Spieldetails“ auf öffentlich.`,
      fr: `Le profil Steam de ${m[1]} est privé. Dans Steam : Profil → Modifier le profil → Confidentialité, mets « Mon profil » et « Détails des jeux » en public.`, it: `Il profilo Steam di ${m[1]} è privato. In Steam: Profilo → Modifica profilo → Privacy, imposta "Il mio profilo" e "Dettagli di gioco" su pubblico.`, pt: `O perfil do Steam de ${m[1]} é privado. No Steam: Perfil → Editar perfil → Privacidade, põe "O meu perfil" e "Detalhes dos jogos" em público.`,
    }),
  },
  {
    re: /^Epic Games no encuentra ningún perfil con "(.*)"\./,
    trad: (m) => ({
      en: `Epic Games can't find any profile matching "${m[1]}". Paste the link to your profile (store.epicgames.com/u/...).`,
      de: `Epic Games findet kein Profil zu „${m[1]}“. Füge den Link zu deinem Profil ein (store.epicgames.com/u/...).`,
      fr: `Epic Games ne trouve aucun profil correspondant à « ${m[1]} ». Colle le lien de ton profil (store.epicgames.com/u/...).`, it: `Epic Games non trova nessun profilo con "${m[1]}". Incolla il link al tuo profilo (store.epicgames.com/u/...).`, pt: `A Epic Games não encontra nenhum perfil com "${m[1]}". Cola a ligação para o teu perfil (store.epicgames.com/u/...).`,
    }),
  },
  {
    re: /^El perfil de Epic Games de (.*) no es público\./,
    trad: (m) => ({
      en: `${m[1]}'s Epic Games profile isn't public. In the Epic Games Store: your avatar → "Achievements" → "Privacy level" → "Public".`,
      de: `Das Epic-Games-Profil von ${m[1]} ist nicht öffentlich. Im Epic Games Store: dein Avatar → „Erfolge“ → „Datenschutzstufe“ → „Öffentlich“.`,
      fr: `Le profil Epic Games de ${m[1]} n'est pas public. Dans l'Epic Games Store : ton avatar → « Succès » → « Niveau de confidentialité » → « Public ».`, it: `Il profilo Epic Games di ${m[1]} non è pubblico. Nell'Epic Games Store: il tuo avatar → "Obiettivi" → "Livello di privacy" → "Pubblico".`, pt: `O perfil da Epic Games de ${m[1]} não é público. Na Epic Games Store: o teu avatar → "Conquistas" → "Nível de privacidade" → "Público".`,
    }),
  },
  {
    re: /^Esa cuenta de (.*) ya está vinculada a otro usuario de Paragon/,
    trad: (m) => ({
      en: `That ${m[1]} account is already linked to another Paragon user — each real account can only be in one place.`,
      de: `Dieses ${m[1]}-Konto ist schon mit einer anderen Paragon-Person verknüpft — jedes echte Konto kann nur an einer Stelle sein.`,
      fr: `Ce compte ${m[1]} est déjà associé à un autre utilisateur de Paragon — chaque vrai compte ne peut être qu'à un seul endroit.`, it: `Quell'account ${m[1]} è già collegato a un altro utente di Paragon — ogni account reale può stare in un solo posto.`, pt: `Essa conta de ${m[1]} já está ligada a outro utilizador do Paragon — cada conta real só pode estar num sítio.`,
    }),
  },
  {
    re: /^Ahora eres @(.+)\.$/,
    trad: (m) => ({ en: `You're now @${m[1]}.`, de: `Du bist jetzt @${m[1]}.`, fr: `Tu es maintenant @${m[1]}.`, it: `Ora sei @${m[1]}.`, pt: `Agora és @${m[1]}.` }),
  },
  {
    re: /^Vinculado a (.+): (\d+) juegos importados\.$/,
    trad: (m) => ({ en: `Linked to ${m[1]}: ${m[2]} games imported.`, de: `Mit ${m[1]} verknüpft: ${m[2]} Spiele importiert.`, fr: `Associé à ${m[1]} : ${m[2]} jeux importés.`, it: `Collegato a ${m[1]}: ${m[2]} giochi importati.`, pt: `Ligado a ${m[1]}: ${m[2]} jogos importados.` }),
  },
  {
    re: /^Ya se sincronizó hace muy poco — espera (\d+)s\.$/,
    trad: (m) => ({ en: `It synced very recently — wait ${m[1]}s.`, de: `Gerade erst synchronisiert — warte ${m[1]} s.`, fr: `Synchronisé il y a très peu — attends ${m[1]} s.`, it: `Si è sincronizzato da pochissimo — aspetta ${m[1]} s.`, pt: `Sincronizou há muito pouco — espera ${m[1]} s.` }),
  },
  {
    re: /^Movido a «(.*)»\.$/,
    trad: (m) => ({ en: `Moved to “${m[1]}”.`, de: `Nach „${m[1]}“ verschoben.`, fr: `Déplacé dans « ${m[1]} ».`, it: `Spostato in «${m[1]}».`, pt: `Movido para «${m[1]}».` }),
  },
  {
    re: /^(.+) añadido a tu biblioteca\.$/,
    trad: (m) => ({ en: `${m[1]} added to your library.`, de: `${m[1]} zu deiner Bibliothek hinzugefügt.`, fr: `${m[1]} ajouté à ta bibliothèque.`, it: `${m[1]} aggiunto alla tua libreria.`, pt: `${m[1]} adicionado à tua biblioteca.` }),
  },
  {
    re: /^(.+) añadido a tu lista de deseados\.$/,
    trad: (m) => ({ en: `${m[1]} added to your wishlist.`, de: `${m[1]} zu deiner Wunschliste hinzugefügt.`, fr: `${m[1]} ajouté à ta liste de souhaits.`, it: `${m[1]} aggiunto alla tua lista dei desideri.`, pt: `${m[1]} adicionado à tua lista de desejos.` }),
  },
  {
    re: /^Ya sois amigos: @(.+) te había enviado una solicitud\.$/,
    trad: (m) => ({ en: `You're now friends: @${m[1]} had already sent you a request.`, de: `Ihr seid jetzt befreundet: @${m[1]} hatte dir schon eine Anfrage geschickt.`, fr: `Vous êtes amis : @${m[1]} t'avait déjà envoyé une demande.`, it: `Ora siete amici: @${m[1]} ti aveva già inviato una richiesta.`, pt: `Já são amigos: @${m[1]} já te tinha enviado um pedido.` }),
  },
  {
    re: /^Solicitud enviada a @(.+)\.$/,
    trad: (m) => ({ en: `Request sent to @${m[1]}.`, de: `Anfrage an @${m[1]} gesendet.`, fr: `Demande envoyée à @${m[1]}.`, it: `Richiesta inviata a @${m[1]}.`, pt: `Pedido enviado a @${m[1]}.` }),
  },
  {
    re: /^Como mucho (\d+) caracteres de título y (\d+) de texto\.$/,
    trad: (m) => ({ en: `${m[1]} characters for the title and ${m[2]} for the text at most.`, de: `Höchstens ${m[1]} Zeichen für den Titel und ${m[2]} für den Text.`, fr: `${m[1]} caractères pour le titre et ${m[2]} pour le texte maximum.`, it: `Al massimo ${m[1]} caratteri per il titolo e ${m[2]} per il testo.`, pt: `No máximo ${m[1]} caracteres de título e ${m[2]} de texto.` }),
  },
  {
    re: /^Como mucho (\d+) vitrinas\.$/,
    trad: (m) => ({ en: `${m[1]} showcases at most.`, de: `Höchstens ${m[1]} Vitrinen.`, fr: `${m[1]} vitrines maximum.`, it: `Al massimo ${m[1]} vetrine.`, pt: `No máximo ${m[1]} vitrinas.` }),
  },
  {
    re: /^Discord devolvió (\d+) al (mandar el mensaje|abrir el DM)\.$/,
    trad: (m) => {
      const dm = m[2] === "abrir el DM";
      return {
        en: `Discord returned ${m[1]} when ${dm ? "opening the DM" : "sending the message"}.`,
        de: `Discord hat beim ${dm ? "Öffnen der DM" : "Senden der Nachricht"} ${m[1]} zurückgegeben.`,
        fr: `Discord a renvoyé ${m[1]} en ${dm ? "ouvrant le MP" : "envoyant le message"}.`, it: `Discord ha restituito ${m[1]} ${dm ? "aprendo il DM" : "inviando il messaggio"}.`, pt: `O Discord devolveu ${m[1]} ao ${dm ? "abrir a DM" : "enviar a mensagem"}.`,
      };
    },
  },
  {
    re: /^Cuenta vinculada a (.+), pero PlayStation no nos deja leer sus trofeos\./,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but PlayStation won't let us read its trophies. It has to be friends on PSN with the server's account, or have its trophies public.`,
      de: `Konto mit ${m[1]} verknüpft, aber PlayStation lässt uns die Trophäen nicht lesen. Es muss auf PSN mit dem Server-Konto befreundet sein oder die Trophäen öffentlich haben.`,
      fr: `Compte associé à ${m[1]}, mais PlayStation ne nous laisse pas lire ses trophées. Il doit être ami sur PSN avec le compte du serveur, ou avoir ses trophées en public.`, it: `Account collegato a ${m[1]}, ma PlayStation non ci permette di leggere i suoi trofei. Deve essere amico su PSN dell'account del server o avere i trofei pubblici.`, pt: `Conta ligada a ${m[1]}, mas a PlayStation não nos deixa ler os troféus. Tem de ser amiga na PSN da conta do servidor, ou ter os troféus públicos.`,
    }),
  },
  {
    re: /^Cuenta vinculada a (.+), pero no podemos leer tu biblioteca\. En Steam/,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but we can't read your library. Steam needs TWO settings set to public — Profile → Edit Profile → Privacy, set "My profile" AND "Game details" to public (the profile can already be public and still block reading if "Game details" isn't).`,
      de: `Konto mit ${m[1]} verknüpft, aber wir können deine Bibliothek nicht lesen. In Steam müssen ZWEI Einstellungen öffentlich sein — Profil → Profil bearbeiten → Privatsphäre, stelle „Mein Profil“ UND „Spieldetails“ auf öffentlich (das Profil kann schon öffentlich sein und das Lesen trotzdem blockieren, wenn „Spieldetails“ es nicht ist).`,
      fr: `Compte associé à ${m[1]}, mais on ne peut pas lire ta bibliothèque. Steam demande DEUX réglages en public — Profil → Modifier le profil → Confidentialité, mets « Mon profil » ET « Détails des jeux » en public (le profil peut déjà être public et bloquer quand même la lecture si « Détails des jeux » ne l'est pas).`, it: `Account collegato a ${m[1]}, ma non possiamo leggere la tua libreria. Su Steam servono DUE impostazioni pubbliche — Profilo → Modifica profilo → Privacy, imposta "Il mio profilo" E "Dettagli di gioco" su pubblico (il profilo può essere già pubblico e bloccare comunque la lettura se "Dettagli di gioco" non lo è).`, pt: `Conta ligada a ${m[1]}, mas não conseguimos ler a tua biblioteca. No Steam são precisas DUAS definições em público — Perfil → Editar perfil → Privacidade, põe "O meu perfil" E "Detalhes dos jogos" em público (o perfil pode já estar público e mesmo assim bloquear a leitura se "Detalhes dos jogos" não estiver).`,
    }),
  },
  {
    re: /^Cuenta vinculada a (.+), pero no podemos leer su historial de logros/,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but we can't read its achievement history — either the profile isn't public or Xbox can't find it.`,
      de: `Konto mit ${m[1]} verknüpft, aber wir können den Erfolgsverlauf nicht lesen — entweder ist das Profil nicht öffentlich oder Xbox findet es nicht.`,
      fr: `Compte associé à ${m[1]}, mais on ne peut pas lire son historique de succès — soit le profil n'est pas public, soit Xbox ne le trouve pas.`, it: `Account collegato a ${m[1]}, ma non possiamo leggere la cronologia degli obiettivi — o il profilo non è pubblico, o Xbox non lo trova.`, pt: `Conta ligada a ${m[1]}, mas não conseguimos ler o histórico de conquistas — ou o perfil não é público, ou a Xbox não o encontra.`,
    }),
  },
  {
    re: /^Cuenta vinculada a (.+), pero no es público\. En la Epic Games Store/,
    trad: (m) => ({
      en: `Account linked to ${m[1]}, but it isn't public. In the Epic Games Store: your avatar → "Achievements" → "Privacy level" → "Public".`,
      de: `Konto mit ${m[1]} verknüpft, aber es ist nicht öffentlich. Im Epic Games Store: dein Avatar → „Erfolge“ → „Datenschutzstufe“ → „Öffentlich“.`,
      fr: `Compte associé à ${m[1]}, mais il n'est pas public. Dans l'Epic Games Store : ton avatar → « Succès » → « Niveau de confidentialité » → « Public ».`, it: `Account collegato a ${m[1]}, ma non è pubblico. Nell'Epic Games Store: il tuo avatar → "Obiettivi" → "Livello di privacy" → "Pubblico".`, pt: `Conta ligada a ${m[1]}, mas não é pública. Na Epic Games Store: o teu avatar → "Conquistas" → "Nível de privacidade" → "Público".`,
    }),
  },
  {
    re: /^Como mucho (\d+) cuentas de Steam además de la principal\.$/,
    trad: (m) => ({ en: `${m[1]} Steam accounts at most besides the main one.`, de: `Höchstens ${m[1]} Steam-Konten zusätzlich zum Hauptkonto.`, fr: `${m[1]} comptes Steam maximum en plus du principal.`, it: `Al massimo ${m[1]} account Steam oltre a quello principale.`, pt: `No máximo ${m[1]} contas do Steam além da principal.` }),
  },
  {
    re: /^Como mucho (\d+) caracteres\.$/,
    trad: (m) => ({ en: `${m[1]} characters at most.`, de: `Höchstens ${m[1]} Zeichen.`, fr: `${m[1]} caractères maximum.`, it: `Al massimo ${m[1]} caratteri.`, pt: `No máximo ${m[1]} caracteres.` }),
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
