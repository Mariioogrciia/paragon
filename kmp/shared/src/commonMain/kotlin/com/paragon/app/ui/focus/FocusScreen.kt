package com.paragon.app.ui.focus

import androidx.compose.material.icons.filled.Close
import com.paragon.app.util.fechaConPatron

import com.paragon.app.data.ahoraMillis

import com.paragon.shared.i18n.stringResource

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
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos


private val FocoNegro = Color(0xFF000000)

// Modo Enfoque es siempre oscuro, con el acento del tema (maqueta v2): mismos
// tonos que la maqueta para tarjetas, pista del anillo y texto secundario.
private val FocoSuperficie = Color(0xFF121A26)
private val FocoTarjeta = Color(0xFF10151F)
private val FocoPista = Color(0xFF1A2230)
private val FocoTenue = Color(0xFFA7B0C0)

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
fun FocusScreen(
    tokenStore: TokenStore,
    onBack: () -> Unit = {},
    /** "Ver guía": la ficha del juego, bajando hasta ese trofeo (ahí están las guías). */
    onAbrirTrofeo: (gameId: String, trophyId: String) -> Unit = { _, _ -> },
) {
    val context = com.paragon.shared.contextoPlataforma()
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
                            Text(Textos.t(T.comun_reintentar), color = Color.White)
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
                    onAbrirTrofeo = onAbrirTrofeo,
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
            text = Textos.t(T.enfoque_titulo),
            color = Color.White.copy(alpha = 0.4f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.sp,
        )
        Text(
            text = Textos.t(T.enfoque_vacio),
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 12.dp, bottom = 6.dp),
        )
        Text(
            text = Textos.t(T.enfoque_vacio_sub),
            color = Color.White.copy(alpha = 0.6f),
            fontSize = 13.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        TextButton(onClick = { mostrarDiario = true }, modifier = Modifier.padding(top = 24.dp)) {
            Text(Textos.t(T.enfoque_ver_diario), color = Color.White.copy(alpha = 0.6f))
        }
        TextButton(onClick = onBack) {
            Text(Textos.t(T.comun_volver), color = Color.White)
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
    onAbrirTrofeo: (gameId: String, trophyId: String) -> Unit,
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
            elapsedMillis = ahoraMillis() - inicio
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

    // Los que faltan, del más fácil (más gente lo tiene) al más difícil.
    // "Saltar" pasa al siguiente sin perder el orden.
    val pendientes = remember(game.trophies) {
        game.trophies.filter { !it.earned }.sortedByDescending { it.rarityPercent ?: 0.0 }
    }
    var saltados by remember(gameId) { mutableIntStateOf(0) }
    val ahora = pendientes.getOrNull(if (pendientes.isEmpty()) 0 else saltados % pendientes.size)
    val despues = if (pendientes.size <= 1) emptyList() else
        (1..minOf(2, pendientes.size - 1)).map { pendientes[(saltados + it) % pendientes.size] }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
    ) {
        // Diseño v2: salir a la izquierda, juego y lo que falta en el centro, Diario a la derecha.
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.size(40.dp).clip(CircleShape).background(FocoSuperficie),
            ) {
                Icon(Icons.Default.Close, contentDescription = Textos.t(T.enfoque_salir), tint = Color.White, modifier = Modifier.size(18.dp))
            }
            Text(
                text = Textos.t(T.enfoque_por_hacer, game.title.uppercase(), pendientes.size),
                color = FocoTenue,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
            )
            TextButton(onClick = { mostrarDiario = true }) {
                Text(Textos.t(T.enfoque_diario), color = FocoTenue, fontSize = 12.sp)
            }
        }
        if (fromCache) {
            Text(
                text = Textos.t(T.comun_sin_conexion_copia),
                color = FocoTenue,
                fontSize = 11.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
            )
        }

        Spacer(Modifier.height(24.dp))
        AnilloPlatino(porcentaje = game.percent, modifier = Modifier.align(Alignment.CenterHorizontally))
        Text(
            text = "${game.earnedTrophies}/${game.totalTrophies}",
            color = FocoTenue,
            fontSize = 13.sp,
            modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 8.dp),
        )
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

        if (ahora == null) {
            Text(
                text = Textos.t(T.enfoque_hecho),
                color = FocoTenue,
                fontSize = 15.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
            )
        } else {
            EtiquetaFoco(Textos.t(T.enfoque_ahora))
            TrofeoAhora(ahora)
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { onAbrirTrofeo(gameId, ahora.id) },
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(radio(16)),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = textoSobre(Accent)),
                ) {
                    Text(Textos.t(T.enfoque_ver_guia), fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { saltados++ },
                    enabled = pendientes.size > 1,
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(radio(16)),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = FocoSuperficie,
                        contentColor = Color.White,
                        disabledContainerColor = FocoSuperficie,
                        disabledContentColor = FocoTenue,
                    ),
                ) {
                    Text(Textos.t(T.enfoque_saltar), fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
            }
            if (despues.isNotEmpty()) {
                EtiquetaFoco(Textos.t(T.enfoque_despues))
                Column(Modifier.graphicsLayer { alpha = 0.7f }, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    despues.forEach { FilaDespues(it) }
                }
            }
        }
        Spacer(Modifier.height(24.dp))

        // Scratchpad — nota privada.
        OutlinedTextField(
            value = nota,
            onValueChange = { if (it.length <= 500) nota = it },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
            maxLines = 3,
            placeholder = { Text(Textos.t(T.enfoque_nota_ph), color = Color.White.copy(alpha = 0.35f), fontSize = 13.sp) },
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
                text = Textos.t(T.enfoque_nota_offline),
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
                text = Textos.t(T.enfoque_sesion_guardada, formatearDuracion(sesion.endMillis - sesion.startMillis)) +
                    if (sesion.trofeosConseguidos > 0) stringResource(if (sesion.trofeosConseguidos == 1) T.enfoque_nuevos_1 else T.enfoque_nuevos_n, sesion.trofeosConseguidos) else "",
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
                        outcome.nuevos > 0 -> Textos.t(if (outcome.nuevos == 1) T.enfoque_aviso_1 else T.enfoque_aviso_n, outcome.nuevos)
                        else -> Textos.t(T.enfoque_nada_nuevo)
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
            shape = RoundedCornerShape(radio(16)),
            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black, disabledContainerColor = Color.White.copy(alpha = 0.6f)),
        ) {
            Text(text = if (comprobando) Textos.t(T.enfoque_comprobando) else Textos.t(T.enfoque_ya_lo_tengo), fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        // Que la barra flotante de abajo no tape el botón al final del todo.
        Spacer(Modifier.height(com.paragon.app.ui.common.huecoBarra()))
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
                text = Textos.t(T.enfoque_platino),
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

/** El progreso hacia el platino, en grande y con el acento (diseño v2). */
@Composable
private fun AnilloPlatino(porcentaje: Int, modifier: Modifier = Modifier) {
    val acento = Accent
    Box(modifier.size(200.dp), contentAlignment = Alignment.Center) {
        androidx.compose.foundation.Canvas(Modifier.fillMaxSize()) {
            val grosor = 10.dp.toPx()
            val trazo = androidx.compose.ui.graphics.drawscope.Stroke(width = grosor, cap = androidx.compose.ui.graphics.StrokeCap.Round)
            val margen = grosor / 2
            val tam = androidx.compose.ui.geometry.Size(size.width - grosor, size.height - grosor)
            val origen = androidx.compose.ui.geometry.Offset(margen, margen)
            drawArc(FocoPista, 0f, 360f, useCenter = false, topLeft = origen, size = tam, style = trazo)
            if (porcentaje > 0) {
                drawArc(acento, -90f, 360f * porcentaje.coerceIn(0, 100) / 100f, useCenter = false, topLeft = origen, size = tam, style = trazo)
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "$porcentaje%",
                color = Color.White,
                fontSize = 44.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
            )
            Text(text = Textos.t(T.enfoque_al_platino), color = FocoTenue, fontSize = 13.sp)
        }
    }
}

@Composable
private fun EtiquetaFoco(texto: String) {
    Text(
        text = texto,
        color = FocoTenue,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(top = 26.dp, bottom = 8.dp),
    )
}

/** Icono del trofeo con el borde de su metal (la foto real cuando la hay). */
@Composable
private fun IconoTrofeoFoco(trofeo: TrophyItem, tam: androidx.compose.ui.unit.Dp, esquina: Int) {
    val forma = RoundedCornerShape(radio(esquina))
    Box(
        Modifier
            .size(tam)
            .clip(forma)
            .background(FocoPista)
            .border(2.dp, gradeColor(trofeo.grade), forma),
    ) {
        if (trofeo.iconUrl != null) {
            AsyncImage(
                model = trofeo.iconUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().padding(2.dp).clip(forma),
            )
        }
    }
}

/** El trofeo a por el que vas ahora: borde del acento, como en la maqueta v2. */
@Composable
private fun TrofeoAhora(trofeo: TrophyItem) {
    val forma = RoundedCornerShape(radio(22))
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(forma)
            .background(FocoTarjeta)
            .border(1.dp, Accent, forma)
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        IconoTrofeoFoco(trofeo, 60.dp, 14)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(text = trofeo.name, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            if (trofeo.detail.isNotBlank()) {
                Text(text = trofeo.detail, color = FocoTenue, fontSize = 13.sp, lineHeight = 18.sp)
            }
            trofeo.rarityPercent?.let {
                Text(text = Textos.t(T.enfoque_rareza, it), color = FocoTenue, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun FilaDespues(trofeo: TrophyItem) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        IconoTrofeoFoco(trofeo, 32.dp, 9)
        Text(
            text = trofeo.name,
            color = Color.White,
            fontSize = 14.sp,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        trofeo.rarityPercent?.let {
            Text(
                text = "${com.paragon.app.util.formatDecimal(it, if (it < 10) 1 else 0)} %",
                color = FocoTenue,
                fontSize = 12.sp,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
            )
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
            .background(Color.White.copy(alpha = 0.06f), RoundedCornerShape(radio(16)))
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
                shape = RoundedCornerShape(radio(14)),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.9f), contentColor = Color.Black),
            ) {
                Text(Textos.t(T.enfoque_detener), fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        } else {
            if (hayOtraSesionActiva) {
                Text(
                    text = Textos.t(T.enfoque_otra_sesion, otraSesionTitulo ?: ""),
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.padding(bottom = 10.dp),
                )
                OutlinedButton(
                    onClick = onDetener,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(radio(14)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                ) {
                    Text(Textos.t(T.enfoque_detener_esa), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = onIniciar,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(radio(14)),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.9f), contentColor = Color.Black),
                ) {
                    // "Iniciar sesión" se confundía con iniciar sesión de
                    // cuenta; "Empezar a jugar" sonaba a que Paragon
                    // arrancaba el juego de verdad, que no puede — esto
                    // solo arranca el cronómetro de seguimiento mientras
                    // juegas en la consola/PC de verdad.
                    Text(Textos.t(T.enfoque_iniciar), fontSize = 14.sp, fontWeight = FontWeight.Bold)
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
                .background(Color(0xFF111111), RoundedCornerShape(radio(20)))
                .padding(20.dp),
        ) {
            Text(Textos.t(T.enfoque_tu_diario), color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(
                Textos.t(T.enfoque_diario_sub),
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
                    Textos.t(T.enfoque_diario_vacio),
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
                                text = Textos.t(T.enfoque_diario_linea, formatearDuracion(sesion.endMillis - sesion.startMillis), sesion.gameTitle) +
                                    if (sesion.trofeosConseguidos > 0) stringResource(if (sesion.trofeosConseguidos == 1) T.enfoque_diario_conseguidos_1 else T.enfoque_diario_conseguidos_n, sesion.trofeosConseguidos) else ".",
                                color = Color.White,
                                fontSize = 14.sp,
                            )
                        }
                    }
                }
            }
            TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End).padding(top = 12.dp)) {
                Text(Textos.t(T.comun_cerrar), color = Color.White.copy(alpha = 0.7f))
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
        "$horas:${dosCifras(minutos)}:${dosCifras(segundos)}"
    } else {
        "$minutos:${dosCifras(segundos)}"
    }
}

/** "2h 30m" o "45m" si no llega a la hora — mismo formato que pide el diario, no el reloj HH:MM:SS del cronómetro en vivo. */
private fun dosCifras(n: Number): String = n.toString().padStart(2, '0')

private fun formatearDuracion(millis: Long): String {
    val totalMinutos = (millis / 60_000).coerceAtLeast(1)
    val horas = totalMinutos / 60
    val minutos = totalMinutos % 60
    return if (horas > 0) "${horas}h ${minutos}m" else "${minutos}m"
}


private fun formatearFechaDiario(millis: Long): String {
    val texto = fechaConPatron(millis, "EEEEdMMMM")
    return texto.replaceFirstChar { it.uppercase() }
}
