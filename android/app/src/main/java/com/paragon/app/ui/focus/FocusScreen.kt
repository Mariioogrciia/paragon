package com.paragon.app.ui.focus

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.NoteSaveResult
import com.paragon.app.data.TrophyGrade
import com.paragon.app.data.TrophyItem
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
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
    val coroutineScope = rememberCoroutineScope()

    var pinnedGameId by remember { mutableStateOf<String?>(null) }
    var detailResult by remember { mutableStateOf<GameDetailResult?>(null) }
    var loadingLibrary by remember { mutableStateOf(true) }
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
            pinnedGameId == null -> EmptyFocusState(onBack)
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
                )
            }
        }
    }
}

@Composable
private fun EmptyFocusState(onBack: () -> Unit) {
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
        TextButton(onClick = onBack, modifier = Modifier.padding(top = 24.dp)) {
            Text("Volver", color = Color.White)
        }
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
) {
    var nota by remember(gameId) { mutableStateOf(game.notes) }
    var guardando by remember { mutableStateOf(false) }
    var notaEncolada by remember { mutableStateOf(false) }
    var comprobando by remember { mutableStateOf(false) }
    var aviso by remember { mutableStateOf<String?>(null) }

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

        Spacer(Modifier.height(20.dp))

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
}

@Composable
private fun PendingTrophyCard(trofeo: TrophyItem, destacado: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = if (destacado) 0.09f else 0.04f), RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(if (destacado) 44.dp else 36.dp)
                .background(gradeColor(trofeo.grade).copy(alpha = 0.7f), RoundedCornerShape(if (destacado) 22.dp else 18.dp)),
        )
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

private fun gradeColor(grade: TrophyGrade?): Color = when (grade) {
    TrophyGrade.PLATINUM -> Platinum
    TrophyGrade.GOLD -> Gold
    TrophyGrade.SILVER -> Silver
    TrophyGrade.BRONZE -> Bronze
    null -> Muted
}
