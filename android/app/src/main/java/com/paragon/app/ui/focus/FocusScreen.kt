package com.paragon.app.ui.focus

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.ConnectivityObserver
import com.paragon.app.data.GameDetailData
import com.paragon.app.data.GameDetailRepository
import com.paragon.app.data.GameDetailResult
import com.paragon.app.data.GameSession
import com.paragon.app.data.GameSessionRepository
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.NoteSaveResult
import com.paragon.app.data.PlatinoNuevo
import com.paragon.app.data.TrophyGrade
import com.paragon.app.data.TrophyItem
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.GameSessionEntity
import com.paragon.app.ui.common.gradeColor
import com.paragon.app.ui.theme.*
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val FocoNegro = Color(0xFF000000)

/**
 * Modo Enfoque: el móvil como segunda pantalla mientras se juega en la
 * tele — negro puro (ahorra batería OLED y se mira de reojo), trofeos
 * pendientes del juego ANCLADO (ver PinGameButton en GameDetailScreen),
 * nota privada con autoguardado y "¿ya lo tengo?" contra
 * POST /api/mobile/games/{id}/resync.
 *
 * Como la API móvil no tiene un endpoint "dame el juego anclado" aparte
 * (ver API-CONTRACT.md), primero se mira la Biblioteca (isPinned) y luego
 * se pide la ficha completa de ese juego — dos llamadas, pero evita
 * duplicar toda la lógica de progreso/trofeos que ya vive en
 * GET /api/mobile/games/{id}.
 */
@Composable
fun FocusScreen(tokenStore: TokenStore, onBack: () -> Unit = {}) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val db = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context) }
    val libraryRepository = remember(tokenStore, db) { LibraryRepository(tokenStore, db.libraryDao(), context) }
    val gameRepository = remember(tokenStore, db) { GameDetailRepository(tokenStore, db.gameDetailDao()) }
    val sessionRepository = remember(db) { GameSessionRepository(db.gameSessionDao()) }
    val coroutineScope = rememberCoroutineScope()

    var pinnedGameId by remember { mutableStateOf<String?>(null) }
    var detailResult by remember { mutableStateOf<GameDetailResult?>(null) }
    var loadingLibrary by remember { mutableStateOf(true) }
    var activeSession by remember { mutableStateOf<GameSessionEntity?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(retryCounter.value) {
        loadingLibrary = true
        pinnedGameId = null
        detailResult = null

        val pinnedId = libraryRepository.findPinnedGameId()
        pinnedGameId = pinnedId
        if (pinnedId != null) {
            detailResult = gameRepository.getGameDetail(pinnedId)
        }
        activeSession = sessionRepository.getActiveSession()
        loadingLibrary = false
    }

    // En cuanto vuelve la red, se manda cualquier nota escrita sin conexión
    // (ver `saveNotes`/`flushPendingNotes` en GameDetailRepository) — sin
    // esto, quedaría encolada hasta la próxima vez que alguien reabriera
    // Modo Enfoque a mano.
    LaunchedEffect(Unit) {
        var wasOffline = false
        ConnectivityObserver.observe(context).collect { online ->
            if (online && wasOffline) {
                gameRepository.flushPendingNotes()
                retryCounter.value += 1
            }
            wasOffline = !online
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(FocoNegro)) {
        when {
            loadingLibrary -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color.White)
            }
            pinnedGameId == null -> EmptyFocusState(onBack, sessionRepository)
            else -> when (val current = detailResult) {
                null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color.White)
                }
                is GameDetailResult.Error -> Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Color.White, fontSize = 14.sp)
                        TextButton(onClick = { retryCounter.value += 1 }) {
                            Text("Reintentar", color = Color.White)
                        }
                    }
                }
                is GameDetailResult.Ok -> FocusContent(
                    gameId = pinnedGameId!!,
                    game = current.detail,
                    fromCache = current.fromCache,
                    onBack = onBack,
                    coroutineScope = coroutineScope,
                    gameRepository = gameRepository,
                    sessionRepository = sessionRepository,
                    activeSession = activeSession,
                    onActiveSessionChanged = { activeSession = it },
                )
            }
        }
    }
}

@Composable
private fun EmptyFocusState(onBack: () -> Unit, sessionRepository: GameSessionRepository) {
    var mostrarDiario by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "MODO ENFOQUE",
            color = Color.White.copy(alpha = 0.4f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.sp,
        )
        Text(
            text = "Ancla un juego para verlo aquí.",
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 12.dp, bottom = 6.dp),
        )
        Text(
            text = "Abre la ficha de un juego y toca el icono de anclar — se convierte en tu objetivo actual.",
            color = Color.White.copy(alpha = 0.6f),
            fontSize = 13.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        TextButton(onClick = { mostrarDiario = true }, modifier = Modifier.padding(top = 24.dp)) {
            Text("Ver tu diario de sesiones", color = Color.White.copy(alpha = 0.6f))
        }
        TextButton(onClick = onBack) {
            Text("Volver", color = Color.White)
        }
    }

    if (mostrarDiario) {
        DiarioDialog(sessionRepository = sessionRepository, onDismiss = { mostrarDiario = false })
    }
}

@Composable
private fun FocusContent(
    gameId: String,
    game: GameDetailData,
    fromCache: Boolean,
    onBack: () -> Unit,
    coroutineScope: kotlinx.coroutines.CoroutineScope,
    gameRepository: GameDetailRepository,
    sessionRepository: GameSessionRepository,
    activeSession: GameSessionEntity?,
    onActiveSessionChanged: (GameSessionEntity?) -> Unit,
) {
    var nota by remember(gameId) { mutableStateOf(game.notes) }
    var guardando by remember { mutableStateOf(false) }
    var notaEncolada by remember { mutableStateOf(false) }
    var comprobando by remember { mutableStateOf(false) }
    var aviso by remember { mutableStateOf<String?>(null) }
    var celebracion by remember { mutableStateOf<PlatinoNuevo?>(null) }
    var mostrarDiario by remember { mutableStateOf(false) }
    var ultimaSesion by remember { mutableStateOf<GameSession?>(null) }

    // Segundero puramente visual mientras la pantalla está abierta — la
    // fuente de verdad es `activeSession.startMillis`, guardado en Room, así
    // que si Android mata el proceso mientras se juega al juego DE VERDAD,
    // la duración real no se pierde: se recalcula sola al volver.
    var elapsedMillis by remember(activeSession?.id) { mutableLongStateOf(0L) }
    LaunchedEffect(activeSession?.id) {
        val inicio = activeSession?.startMillis ?: return@LaunchedEffect
        while (true) {
            elapsedMillis = System.currentTimeMillis() - inicio
            delay(1000)
        }
    }

    // Autoguardado con debounce (800ms), igual que la web — se cancela solo
    // si el usuario sigue escribiendo antes de que pase el tiempo. Sin
    // conexión, `saveNotes` la encola sola (ver GameDetailRepository) — aquí
    // solo se refleja el resultado, sin tratarlo como un error.
    LaunchedEffect(nota) {
        if (nota == game.notes) return@LaunchedEffect
        delay(800)
        guardando = true
        val resultado = gameRepository.saveNotes(gameId, nota)
        notaEncolada = resultado == NoteSaveResult.Queued
        guardando = false
    }

    val pendientes = game.trophies
        .filter { !it.earned }
        .sortedByDescending { it.rarityPercent ?: 0.0 }
        .take(3)

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 16.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "MODO ENFOQUE",
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                )
                Text(
                    text = game.title.uppercase(),
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    modifier = Modifier.padding(top = 2.dp),
                )
                if (fromCache) {
                    Text(
                        text = "Sin conexión — mostrando la última copia guardada",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            TextButton(onClick = { mostrarDiario = true }) {
                Text("Diario", color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp)
            }
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Salir del modo enfoque", tint = Color.White)
            }
        }

        Spacer(Modifier.height(12.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.weight(1f).height(6.dp).background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(3.dp))) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(game.percent / 100f)
                        .fillMaxHeight()
                        .background(Color.White.copy(alpha = 0.85f), RoundedCornerShape(3.dp)),
                )
            }
            Spacer(Modifier.width(10.dp))
            Text(text = "${game.earnedTrophies}/${game.totalTrophies}", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.height(16.dp))

        SessionTimerCard(
            enSesion = activeSession?.gameId == gameId,
            hayOtraSesionActiva = activeSession != null && activeSession.gameId != gameId,
            otraSesionTitulo = activeSession?.gameTitle,
            elapsedMillis = elapsedMillis,
            ultimaSesion = ultimaSesion,
            onIniciar = {
                coroutineScope.launch {
                    sessionRepository.startSession(gameId, game.title, game.earnedTrophies)
                    onActiveSessionChanged(sessionRepository.getActiveSession())
                    ultimaSesion = null
                }
            },
            onDetener = {
                coroutineScope.launch {
                    // Si la sesión activa es de OTRO juego (cambiaste de
                    // anclado a medio jugar), no hay una ficha cargada con la
                    // que medir trofeos nuevos de ese juego — se cierra con
                    // 0 nuevos en vez de adivinar, más honesto que inventar
                    // un número.
                    val trofeosActuales = if (activeSession?.gameId == gameId) game.earnedTrophies else (activeSession?.trophiesAtStart ?: 0)
                    ultimaSesion = sessionRepository.stopActiveSession(trofeosActuales)
                    onActiveSessionChanged(null)
                }
            },
        )

        Spacer(Modifier.height(16.dp))

        if (pendientes.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Text(text = "No queda ningún trofeo pendiente aquí. Está hecho.", color = Color.White.copy(alpha = 0.6f), fontSize = 15.sp)
            }
        } else {
            Column(modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                pendientes.forEachIndexed { index, trofeo -> PendingTrophyCard(trofeo, destacado = index == 0) }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Scratchpad — nota privada.
        OutlinedTextField(
            value = nota,
            onValueChange = { if (it.length <= 500) nota = it },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
            maxLines = 3,
            placeholder = { Text("Nota privada (código de una taquilla, dónde te quedaste...)", color = Color.White.copy(alpha = 0.35f), fontSize = 13.sp) },
            textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 14.sp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color.White.copy(alpha = 0.3f),
                unfocusedBorderColor = Color.White.copy(alpha = 0.16f),
                cursorColor = Color.White,
            ),
            trailingIcon = {
                if (guardando) Text("...", color = Color.White.copy(alpha = 0.4f), fontSize = 11.sp)
            },
        )
        if (notaEncolada) {
            Text(
                text = "Guardada en el móvil — se sincronizará cuando vuelva la conexión",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 11.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
        }

        Spacer(Modifier.height(12.dp))

        aviso?.let {
            Text(text = it, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp))
        }

        ultimaSesion?.let { sesion ->
            Text(
                text = "Sesión guardada: ${formatearDuracion(sesion.endMillis - sesion.startMillis)}" +
                    if (sesion.trofeosConseguidos > 0) " — ${sesion.trofeosConseguidos} ${if (sesion.trofeosConseguidos == 1) "trofeo" else "trofeos"} nuevos" else "",
                color = Color.White.copy(alpha = 0.6f),
                fontSize = 12.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            )
        }

        Button(
            onClick = {
                comprobando = true
                aviso = null
                coroutineScope.launch {
                    val outcome = gameRepository.resync(gameId)
                    comprobando = false
                    aviso = when {
                        outcome.error != null -> outcome.error
                        outcome.nuevos > 0 -> "¡${outcome.nuevos} ${if (outcome.nuevos == 1) "trofeo nuevo" else "trofeos nuevos"}!"
                        else -> "Nada nuevo todavía"
                    }
                    // Celebración EN EL MOMENTO, no solo el aviso de arriba —
                    // solo cuando de verdad se acaba de descubrir un platino
                    // nuevo (nunca en la primera sincronización de un juego).
                    if (outcome.platinoNuevo != null) {
                        celebracion = outcome.platinoNuevo
                    }
                }
            },
            enabled = !comprobando,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black, disabledContainerColor = Color.White.copy(alpha = 0.6f)),
        ) {
            Text(text = if (comprobando) "Comprobando…" else "¿Ya lo tengo?", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }

    if (mostrarDiario) {
        DiarioDialog(sessionRepository = sessionRepository, onDismiss = { mostrarDiario = false })
    }

    // Se cierra sola a los 2.2s — mismo criterio que la versión web
    // (comprobar() en FocusMode.tsx).
    LaunchedEffect(celebracion) {
        if (celebracion != null) {
            delay(2200)
            celebracion = null
        }
    }

    celebracion?.let { PlatinoCelebracion(it) }
}

/**
 * Celebración EN EL MOMENTO de un platino nuevo — colores de metal (mismo
 * Platinum de siempre), nada de acento ni tema, igual que el resto del
 * Modo Enfoque. Breve a propósito (2.2s, ver `FocusContent`): si cada
 * trofeo montara esta fiesta se volvería cansino, esto solo pasa con un
 * platino real.
 */
@Composable
private fun PlatinoCelebracion(platino: PlatinoNuevo) {
    val escala by androidx.compose.animation.core.animateFloatAsState(
        targetValue = 1f,
        animationSpec = androidx.compose.animation.core.tween(400, easing = androidx.compose.animation.core.LinearOutSlowInEasing),
        label = "escalaPlatino",
    )
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.7f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .border(3.dp, Platinum, CircleShape)
                    .background(Color.White.copy(alpha = 0.06f))
                    .graphicsLayer { scaleX = escala; scaleY = escala },
                contentAlignment = Alignment.Center,
            ) {
                if (platino.iconUrl != null) {
                    AsyncImage(
                        model = platino.iconUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                    )
                } else {
                    Text("🏆", fontSize = 36.sp)
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = "PLATINO DESBLOQUEADO",
                color = Platinum,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
            )
            Text(
                text = platino.nombre,
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@Composable
private fun PendingTrophyCard(trofeo: TrophyItem, destacado: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = if (destacado) 0.09f else 0.04f), RoundedCornerShape(16.dp))
            .then(if (destacado) Modifier.border(1.dp, Color.White.copy(alpha = 0.18f), RoundedCornerShape(16.dp)) else Modifier)
            .padding(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        // Foto real del trofeo cuando la hay — antes esto era siempre un
        // cuadrado de color por metal, ni siquiera de respaldo (mismo
        // hueco que se arregló en la Lista de la Ficha de juego).
        val tam = if (destacado) 44.dp else 36.dp
        Box(
            modifier = Modifier
                .size(tam)
                .clip(RoundedCornerShape(if (destacado) 14.dp else 12.dp))
                .background(gradeColor(trofeo.grade).copy(alpha = 0.7f)),
        ) {
            if (trofeo.iconUrl != null) {
                AsyncImage(
                    model = trofeo.iconUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = trofeo.name,
                color = Color.White,
                fontSize = if (destacado) 17.sp else 15.sp,
                fontWeight = FontWeight.Bold,
            )
            if (trofeo.detail.isNotBlank()) {
                Text(text = trofeo.detail, color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
            }
            trofeo.rarityPercent?.let {
                Text(text = "${it}% de jugadores lo tienen", color = Color.White.copy(alpha = 0.5f), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

/**
 * "Iniciar sesión" te sientas a jugar de verdad → "Detener sesión" cuando
 * paras, y queda anotado en el Diario. Un solo botón según haya o no una
 * sesión activa — nunca los dos a la vez, no hace falta un tercer estado.
 */
@Composable
private fun SessionTimerCard(
    enSesion: Boolean,
    hayOtraSesionActiva: Boolean,
    otraSesionTitulo: String?,
    elapsedMillis: Long,
    ultimaSesion: GameSession?,
    onIniciar: () -> Unit,
    onDetener: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = 0.06f), RoundedCornerShape(16.dp))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (enSesion) {
            Text(
                text = formatearCronometro(elapsedMillis),
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = onDetener,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.9f), contentColor = Color.Black),
            ) {
                Text("Detener sesión", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        } else {
            if (hayOtraSesionActiva) {
                Text(
                    text = "Tienes una sesión activa en $otraSesionTitulo",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.padding(bottom = 10.dp),
                )
                OutlinedButton(
                    onClick = onDetener,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                ) {
                    Text("Detener esa sesión", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = onIniciar,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.9f), contentColor = Color.Black),
                ) {
                    // "Iniciar sesión" se confundía con iniciar sesión de
                    // cuenta; "Empezar a jugar" sonaba a que Paragon
                    // arrancaba el juego de verdad, que no puede — esto
                    // solo arranca el cronómetro de seguimiento mientras
                    // juegas en la consola/PC de verdad.
                    Text("⏱️ Iniciar seguimiento", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun DiarioDialog(sessionRepository: GameSessionRepository, onDismiss: () -> Unit) {
    var sesiones by remember { mutableStateOf<List<GameSession>?>(null) }
    LaunchedEffect(Unit) { sesiones = sessionRepository.getDiario() }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 480.dp)
                .background(Color(0xFF111111), RoundedCornerShape(20.dp))
                .padding(20.dp),
        ) {
            Text("TU DIARIO", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(
                "Cuánto tiempo de verdad le dedicas a cada platino",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 2.dp, bottom = 16.dp),
            )
            val current = sesiones
            when {
                current == null -> Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color.White)
                }
                current.isEmpty() -> Text(
                    "Sin sesiones registradas todavía — inicia una desde Modo Enfoque.",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 13.sp,
                )
                else -> Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    current.forEach { sesion ->
                        Column {
                            Text(
                                text = formatearFechaDiario(sesion.startMillis),
                                color = Color.White.copy(alpha = 0.45f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = "${formatearDuracion(sesion.endMillis - sesion.startMillis)} jugando a ${sesion.gameTitle}" +
                                    if (sesion.trofeosConseguidos > 0) ". Conseguidos ${sesion.trofeosConseguidos} ${if (sesion.trofeosConseguidos == 1) "trofeo" else "trofeos"}." else ".",
                                color = Color.White,
                                fontSize = 14.sp,
                            )
                        }
                    }
                }
            }
            TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End).padding(top = 12.dp)) {
                Text("Cerrar", color = Color.White.copy(alpha = 0.7f))
            }
        }
    }
}

private fun formatearCronometro(millis: Long): String {
    val totalSegundos = millis / 1000
    val horas = totalSegundos / 3600
    val minutos = (totalSegundos % 3600) / 60
    val segundos = totalSegundos % 60
    return if (horas > 0) {
        "%d:%02d:%02d".format(horas, minutos, segundos)
    } else {
        "%d:%02d".format(minutos, segundos)
    }
}

/** "2h 30m" o "45m" si no llega a la hora — mismo formato que pide el diario, no el reloj HH:MM:SS del cronómetro en vivo. */
private fun formatearDuracion(millis: Long): String {
    val totalMinutos = (millis / 60_000).coerceAtLeast(1)
    val horas = totalMinutos / 60
    val minutos = totalMinutos % 60
    return if (horas > 0) "${horas}h ${minutos}m" else "${minutos}m"
}

private val FORMATO_FECHA_DIARIO = java.text.SimpleDateFormat("EEEE d 'de' MMMM", java.util.Locale("es", "ES"))

private fun formatearFechaDiario(millis: Long): String {
    val texto = FORMATO_FECHA_DIARIO.format(java.util.Date(millis))
    return texto.replaceFirstChar { it.uppercase() }
}
