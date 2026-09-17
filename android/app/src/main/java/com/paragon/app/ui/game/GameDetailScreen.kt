package com.paragon.app.ui.game

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.appwidget.updateAll
import coil3.compose.AsyncImage
import com.paragon.app.data.local.ParagonDatabase
import com.paragon.app.widget.PinnedGameWidget
import com.paragon.app.data.GameDetailData
import com.paragon.app.data.GameDetailRepository
import com.paragon.app.data.GameDetailResult
import com.paragon.app.data.HitoReservado
import com.paragon.app.data.MilestoneRepository
import com.paragon.app.data.MilestoneResult
import com.paragon.app.data.TrophyGrade
import com.paragon.app.data.TrophyItem
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.collections.AddToCollectionSheet
import com.paragon.app.ui.share.ShareTrophyDialog
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import android.graphics.BitmapFactory
import androidx.palette.graphics.Palette

/**
 * Ficha de juego (plan sección 2.4) — cabecera hero con portada difuminada
 * de fondo, barra de progreso general y trofeos agrupados por rareza
 * (Platino > Oro > Plata > Bronce, mismo orden que la web). Datos reales
 * contra GET /api/mobile/games/{gameId} (GameDetailRepository).
 *
 * Ojo: Panel sigue mandando aquí los ids inventados de sus tarjetas mock
 * (recentGames/nearPlatinum) — hasta que esas dejen de ser mock, tocar una
 * tarjeta del Panel aterriza aquí en el estado de error (404 real del
 * backend, "este juego no existe"), no en un fallo de la pantalla.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun GameDetailScreen(
    gameId: String,
    tokenStore: TokenStore,
    handle: String = "",
    onBack: () -> Unit = {},
    sharedTransitionScope: SharedTransitionScope? = null,
    animatedVisibilityScope: AnimatedVisibilityScope? = null,
) {
    val repository = remember(tokenStore) { GameDetailRepository(tokenStore) }
    val milestoneRepository = remember(tokenStore) { MilestoneRepository(tokenStore) }
    var result by remember { mutableStateOf<GameDetailResult?>(null) }
    var hito by remember { mutableStateOf<HitoReservado?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(gameId, retryCounter.value) {
        result = null
        result = repository.getGameDetail(gameId)
        val milestoneResult = milestoneRepository.getMilestone()
        hito = (milestoneResult as? MilestoneResult.Ok)?.hito
    }

    when (val current = result) {
        null -> Box(
            modifier = Modifier.fillMaxSize().background(Background),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = Accent)
        }
        is GameDetailResult.Error -> Box(
            modifier = Modifier.fillMaxSize().background(Background).padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = current.message, color = Foreground, fontSize = 14.sp)
                Button(
                    onClick = onBack,
                    modifier = Modifier.padding(top = 16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                ) {
                    Text("Volver")
                }
            }
        }
        is GameDetailResult.Ok -> GameDetailContent(
            gameId = gameId,
            game = current.detail,
            hitoInicial = hito,
            tokenStore = tokenStore,
            handle = handle,
            repository = repository,
            onBack = onBack,
            onMilestoneChanged = { retryCounter.value += 1 },
            sharedTransitionScope = sharedTransitionScope,
            animatedVisibilityScope = animatedVisibilityScope,
        )
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun GameDetailContent(
    gameId: String,
    game: GameDetailData,
    hitoInicial: HitoReservado?,
    tokenStore: TokenStore,
    handle: String,
    repository: GameDetailRepository,
    onBack: () -> Unit,
    onMilestoneChanged: () -> Unit,
    sharedTransitionScope: SharedTransitionScope?,
    animatedVisibilityScope: AnimatedVisibilityScope?,
) {
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val libraryDao = remember(context) { ParagonDatabase.getDatabase(context).libraryDao() }
    var pinned by remember(gameId) { mutableStateOf(game.isPinned) }
    var reservado by remember(gameId, hitoInicial) { mutableStateOf(hitoInicial?.gameId == gameId) }
    var showCollections by remember { mutableStateOf(false) }
    var showShare by remember { mutableStateOf(false) }
    var dynamicColor by remember { mutableStateOf(Accent) }
    // "Platino conseguido" real (mismo criterio que el filtro "Platinados"
    // de Biblioteca en HANDOFF.md: earned.platinum > 0, no percent == 100 —
    // un juego sin trofeo de Platino definido nunca debería ofrecer
    // "Compartir Platino" aunque esté al 100%).
    val platinoConseguido = game.trophies.any { it.grade == TrophyGrade.PLATINUM && it.earned }

    LaunchedEffect(game.coverUrl) {
        withContext(Dispatchers.IO) {
            try {
                val url = java.net.URL(game.coverUrl)
                val connection = url.openConnection()
                connection.doInput = true
                connection.connect()
                val input = connection.inputStream
                val bitmap = BitmapFactory.decodeStream(input)
                if (bitmap != null) {
                    val palette = Palette.from(bitmap).generate()
                    val swatch = palette.vibrantSwatch ?: palette.dominantSwatch ?: palette.mutedSwatch
                    if (swatch != null) {
                        dynamicColor = Color(swatch.rgb)
                    }
                }
            } catch (e: Exception) {
                // Ignore, fallback to Accent
            }
        }
    }
    // El número solo se conoce cuando ALGÚN juego está reservado (viene de
    // /api/mobile/milestone) — si no hay nada reservado todavía no hay
    // preview de número, mismo límite que tiene la API móvil.
    val numeroHito = hitoInicial?.numero

    fun togglePin() {
        pinned = !pinned
        coroutineScope.launch {
            val real = repository.togglePin(gameId)
            if (real != null) pinned = real
            // La API ya lo ancló/desancló de verdad — sin esto, la caché
            // local (de la que lee el widget) se queda con el juego
            // anclado ANTERIOR hasta la próxima sincronización completa de
            // la Biblioteca, que puede tardar horas (era el hueco real que
            // dejaba el widget de Antigravity a medio terminar).
            libraryDao.clearPinned()
            if (real == true) libraryDao.setPinned(gameId)
            PinnedGameWidget().updateAll(context)
        }
    }

    fun toggleReserve() {
        reservado = !reservado
        coroutineScope.launch {
            val real = repository.toggleReserve(gameId)
            if (real != null) reservado = real
            onMilestoneChanged()
        }
    }

    LazyColumn(modifier = Modifier.fillMaxSize().background(Background)) {
        item {
            GameDetailHero(
                game = game,
                dynamicColor = dynamicColor,
                onBack = onBack,
                sharedTransitionScope = sharedTransitionScope,
                animatedVisibilityScope = animatedVisibilityScope,
            )
        }

        item {
            GameActionsRow(
                pinned = pinned,
                reservado = reservado,
                numeroHito = numeroHito,
                platinoConseguido = platinoConseguido,
                onTogglePin = { togglePin() },
                onToggleReserve = { toggleReserve() },
                onOpenCollections = { showCollections = true },
                onShare = { showShare = true },
                dynamicColor = dynamicColor,
            )
        }

        item {
            NotesSection(
                initialNotes = game.notes,
                dynamicColor = dynamicColor,
                onSaveNotes = { newNotes ->
                    coroutineScope.launch {
                        repository.saveNotes(gameId, newNotes)
                    }
                }
            )
        }

        val grouped = game.trophies.sortedWith(
            compareByDescending<TrophyItem> { it.grade?.ordinal ?: -1 }.thenBy { it.earned.not() }
        )

        items(grouped) { trophy ->
            TrophyRow(trophy, game = game, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
        }

        item { Spacer(Modifier.height(32.dp)) }
    }

    if (showCollections) {
        AddToCollectionSheet(gameId = gameId, tokenStore = tokenStore, onDismiss = { showCollections = false })
    }

    if (showShare) {
        ShareTrophyDialog(
            coverUrl = game.coverUrl,
            gameTitle = game.title,
            earnedTrophies = game.earnedTrophies,
            totalTrophies = game.totalTrophies,
            handle = handle,
            onDismiss = { showShare = false },
        )
    }
}

/**
 * La carátula pequeña de aquí abajo (no la de fondo difuminado, esa no
 * "vuela" — solo confundiría el ojo con dos copias animando a la vez) usa
 * la MISMA clave `game-cover-${id}` que `StandardGameCard` en
 * `GameCards.kt` — así Compose sabe que son el mismo elemento visual al
 * navegar desde Biblioteca. Si se llega desde cualquier otro sitio (Panel,
 * Comunidad...) `sharedTransitionScope`/`animatedVisibilityScope` siguen
 * sin ser null (todo el NavHost vive dentro del mismo `SharedTransitionLayout`,
 * ver `MainScreen.kt`), pero como no hay ninguna card de origen con esa
 * misma clave en pantalla a la vez, no hay nada que "volar" — se queda en
 * el fundido normal, sin fallar.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun GameDetailHero(
    game: GameDetailData,
    dynamicColor: Color,
    onBack: () -> Unit,
    sharedTransitionScope: SharedTransitionScope?,
    animatedVisibilityScope: AnimatedVisibilityScope?,
) {
    Box(modifier = Modifier.fillMaxWidth().height(320.dp)) {
        AsyncImage(
            model = game.coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
            alpha = 0.35f,
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(colors = listOf(Color.Transparent, Background)))
        )
        IconButton(onClick = onBack, modifier = Modifier.padding(12.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Foreground)
        }
        Row(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            val coverModifier = Modifier
                .width(96.dp)
                .height(136.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Surface)
                .let { base ->
                    if (sharedTransitionScope != null && animatedVisibilityScope != null) {
                        with(sharedTransitionScope) {
                            base.sharedElement(
                                rememberSharedContentState(key = "game-cover-${game.id}"),
                                animatedVisibilityScope = animatedVisibilityScope,
                            )
                        }
                    } else base
                }
            AsyncImage(
                model = game.coverUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = coverModifier,
            )
            Spacer(Modifier.width(20.dp))
            Column {
                Text(
                    text = game.title,
                    color = Foreground,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "${game.earnedTrophies}/${game.totalTrophies} trofeos · ${game.percent}%",
                    color = Muted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 6.dp, bottom = 12.dp),
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .background(Surface2, RoundedCornerShape(4.dp)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(game.percent / 100f)
                            .fillMaxHeight()
                            .background(dynamicColor, RoundedCornerShape(4.dp)),
                    )
                }
                // Total acumulado, no por sesión — la plataforma no da más
                // detalle que eso (ver el comentario de horasPorJuego en
                // lib/profileStats.ts, en el proyecto Next.js). `null` si la
                // plataforma no lo reporta (algunos juegos manuales, o
                // cuentas recién vinculadas sin sincronizar del todo).
                game.playtimeMinutes?.let { minutos ->
                    Text(
                        text = "${minutos / 60}h jugadas",
                        color = Muted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        }
    }
}

private val MilestoneGold = Color(0xFFE2B53E)

/**
 * Anclar (Modo Enfoque), reservar (Cerrojo de Hitos) y meter en una carpeta
 * — las tres acciones nuevas de la ficha de juego, mismo patrón optimista
 * que la web (PinGameButton/ReservarHitoButton: se pinta al momento, sin
 * esperar la respuesta de red).
 */
@Composable
private fun GameActionsRow(
    pinned: Boolean,
    reservado: Boolean,
    numeroHito: Int?,
    platinoConseguido: Boolean,
    onTogglePin: () -> Unit,
    onToggleReserve: () -> Unit,
    onOpenCollections: () -> Unit,
    onShare: () -> Unit,
    dynamicColor: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 12.dp)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        ActionChip(
            label = if (pinned) "Objetivo actual" else "Anclar objetivo",
            active = pinned,
            accentColor = dynamicColor,
            onClick = onTogglePin,
        )
        ActionChip(
            label = when {
                reservado && numeroHito != null -> "Reservado para el #$numeroHito"
                reservado -> "Reservado"
                numeroHito != null -> "Reservar para el #$numeroHito"
                else -> "Reservar hito"
            },
            active = reservado,
            accentColor = MilestoneGold,
            onClick = onToggleReserve,
        )
        ActionChip(
            label = "Carpetas",
            active = false,
            accentColor = dynamicColor,
            onClick = onOpenCollections,
        )
        // Solo con el platino real conseguido (ver `platinoConseguido` en
        // GameDetailContent) — sin esto, compartir un juego a medias no
        // tendría nada que celebrar y confundiría el "efecto Wow" que busca
        // esta función (idea #20 del brainstorm de v1.0).
        if (platinoConseguido) {
            ActionChip(
                label = "Compartir Platino",
                active = true,
                accentColor = Platinum,
                onClick = onShare,
            )
        }
    }
}

@Composable
private fun ActionChip(label: String, active: Boolean, accentColor: Color, onClick: () -> Unit) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (active) accentColor.copy(alpha = 0.16f) else Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (active) accentColor.copy(alpha = 0.6f) else Border),
    ) {
        Text(
            text = label,
            color = if (active) accentColor else Foreground,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
        )
    }
}

@Composable
private fun TrophyRow(trophy: TrophyItem, game: GameDetailData, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val db = remember(context) { ParagonDatabase.getDatabase(context) }
    val dao = remember(db) { db.stuckTrophyDao() }
    val coroutineScope = rememberCoroutineScope()
    var isStuck by remember(trophy.id) { mutableStateOf(false) }

    LaunchedEffect(trophy.id) {
        isStuck = dao.isStuck(trophy.id)
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(gradeColor(trophy.grade).copy(alpha = if (trophy.earned) 1f else 0.25f), RoundedCornerShape(20.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (trophy.earned) {
                Icon(Icons.Default.Check, contentDescription = null, tint = Background)
            }
        }
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = trophy.name,
                color = if (trophy.earned) Foreground else Muted,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = trophy.detail,
                color = Muted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        trophy.rarityPercent?.let {
            Text(text = "${it}%", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        if (!trophy.earned) {
            IconButton(
                onClick = {
                    coroutineScope.launch {
                        if (isStuck) {
                            dao.removeStuckTrophy(trophy.id)
                            isStuck = false
                        } else {
                            dao.addStuckTrophy(
                                com.paragon.app.data.local.StuckTrophyEntity(
                                    trophyId = trophy.id,
                                    gameId = game.id,
                                    gameTitle = game.title,
                                    trophyName = trophy.name,
                                    trophyDetail = trophy.detail,
                                    trophyGrade = trophy.grade?.name,
                                    coverUrl = game.coverUrl
                                )
                            )
                            isStuck = true
                        }
                    }
                },
                modifier = Modifier.padding(start = 4.dp).size(24.dp)
            ) {
                Icon(Icons.Default.Star, contentDescription = "Atascar", tint = if (isStuck) Accent else Muted, modifier = Modifier.size(16.dp))
            }
            IconButton(
                onClick = {
                    val query = android.net.Uri.encode("${game.title} ${trophy.name} trophy guide")
                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://www.youtube.com/results?search_query=$query"))
                    context.startActivity(intent)
                },
                modifier = Modifier.padding(start = 4.dp).size(24.dp)
            ) {
                Icon(Icons.Default.Search, contentDescription = "Buscar Guía", tint = Accent, modifier = Modifier.size(16.dp))
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

@Composable
private fun NotesSection(
    initialNotes: String,
    onSaveNotes: (String) -> Unit,
    dynamicColor: Color
) {
    var notes by remember { mutableStateOf(initialNotes) }
    var isEditing by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("NOTAS PRIVADAS", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            if (isEditing) {
                TextButton(onClick = { 
                    isEditing = false
                    onSaveNotes(notes)
                }) {
                    Text("Guardar", color = dynamicColor, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            } else if (notes.isNotBlank()) {
                TextButton(onClick = { isEditing = true }) {
                    Text("Editar", color = Muted, fontSize = 13.sp)
                }
            }
        }
        
        if (isEditing) {
            androidx.compose.material3.OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                placeholder = { Text("Apuntes, códigos, rutas de farmeo...", color = Muted, fontSize = 14.sp) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 100.dp),
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = dynamicColor,
                    unfocusedBorderColor = Border,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground
                )
            )
        } else {
            if (notes.isBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Surface, RoundedCornerShape(12.dp))
                        .border(1.dp, Border, RoundedCornerShape(12.dp))
                        .clickable { isEditing = true }
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Añadir nota personal...", color = Muted, fontSize = 14.sp)
                }
            } else {
                Text(
                    text = notes,
                    color = Foreground,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Surface, RoundedCornerShape(12.dp))
                        .border(1.dp, Border, RoundedCornerShape(12.dp))
                        .padding(16.dp)
                )
            }
        }
    }
}
