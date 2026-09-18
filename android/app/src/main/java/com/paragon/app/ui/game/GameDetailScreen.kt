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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import androidx.compose.ui.draw.alpha
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
import com.paragon.app.data.PlatinumPrediction
import com.paragon.app.data.TrophyGrade
import com.paragon.app.data.TrophyItem
import com.paragon.app.data.predecirPlatino
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.collections.AddToCollectionSheet
import com.paragon.app.ui.share.ShareTrophyDialog
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

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
            fromCache = current.fromCache,
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
    fromCache: Boolean,
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
    val stuckTrophyDao = remember(context) { ParagonDatabase.getDatabase(context).stuckTrophyDao() }
    // Una sola consulta para TODOS los trofeos de la pantalla, en vez de una
    // por fila (ver el comentario de `getAllStuckIds` en StuckTrophyDao) —
    // `TrophyRow` la recibe ya resuelta y solo actualiza este mismo Set al
    // marcar/desmarcar, sin volver a leer Room por cada toque.
    var stuckIds by remember(gameId) { mutableStateOf<Set<String>>(emptySet()) }
    LaunchedEffect(gameId) { stuckIds = stuckTrophyDao.getAllStuckIds().toSet() }
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
    val prediccion = remember(game.trophies) { predecirPlatino(game.trophies) }
    var vistaCronologica by remember { mutableStateOf(false) }
    // Antes se ordenaba dentro del propio LazyColumn (en cada recomposición
    // del contenido, p. ej. al tocar el chip de racha de la cabecera) —
    // ahora solo se recalcula si `game.trophies` cambia de verdad.
    val trofeosOrdenados = remember(game.trophies) {
        game.trophies.sortedWith(
            compareByDescending<TrophyItem> { it.grade?.ordinal ?: -1 }.thenBy { it.earned.not() }
        )
    }

    val coverAura = com.paragon.app.ui.common.rememberCoverAuraColor(game.coverUrl)
    androidx.compose.runtime.LaunchedEffect(coverAura) {
        if (coverAura != null) dynamicColor = coverAura
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
                fromCache = fromCache,
                prediccion = prediccion,
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

        item {
            Row(
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(selected = vistaCronologica == false, onClick = { vistaCronologica = false }, label = { Text("Lista") })
                FilterChip(selected = vistaCronologica == true, onClick = { vistaCronologica = true }, label = { Text("Cronología") })
            }
        }

        if (vistaCronologica) {
            item {
                TrophyRarityChart(trophies = game.trophies, modifier = Modifier.padding(horizontal = 24.dp))
            }
        } else {
            items(trofeosOrdenados, key = { it.id }) { trophy ->
                TrophyRow(
                    trophy,
                    game = game,
                    isStuck = trophy.id in stuckIds,
                    onStuckChange = { nuevo ->
                        stuckIds = if (nuevo) stuckIds + trophy.id else stuckIds - trophy.id
                    },
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                )
            }
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
    fromCache: Boolean,
    prediccion: PlatinumPrediction?,
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
                if (fromCache) {
                    Text(
                        text = "Sin conexión — mostrando la última copia guardada",
                        color = Muted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
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
                prediccion?.let {
                    Text(
                        text = "🔮 A este ritmo, lo tienes el ${fechaPrediccion(it.fechaMillis)}",
                        color = Muted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }
    }
}

private val FECHA_PREDICCION_FORMAT = java.text.SimpleDateFormat("EEEE d 'de' MMMM", java.util.Locale("es", "ES"))

private fun fechaPrediccion(millis: Long): String = FECHA_PREDICCION_FORMAT.format(java.util.Date(millis))

private val FECHA_ISO_GAME_DETAIL = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
    timeZone = java.util.TimeZone.getTimeZone("UTC")
}
private val FECHA_CORTA_TIMELINE = java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale("es", "ES"))
private val FECHA_DIA_KEY = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
    timeZone = java.util.TimeZone.getTimeZone("UTC")
}

/** "23 jun 2026" a partir del ISO real de earnedAt — para la fecha de cada fila de la Cronología. */
private fun fechaCortaTimeline(iso: String): String =
    try { FECHA_CORTA_TIMELINE.format(FECHA_ISO_GAME_DETAIL.parse(iso)!!) } catch (e: Exception) { "" }

/** Margen a los cuatro lados del área de puntos — sin esto, un trofeo con
 * 0%/100% de rareza exacto, o del primer/último día, queda con el centro
 * justo en el borde. Mismo criterio que MARKER_PADDING_PX en TrophyTimeline.tsx. */
private const val MARKER_PADDING_DP = 16

private val FECHA_MES_CORTO = java.text.SimpleDateFormat("MMM yy", java.util.Locale("es", "ES"))

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

private data class PuntoRareza(val trofeo: TrophyItem, val fechaMillis: Long)

/** Un marcador por día en el modo Resumen — mismo criterio que `resumenPorDia` en TrophyTimeline.tsx (web). */
private data class ResumenDia(
    val dia: String,
    val grupo: List<PuntoRareza>,
    val rarezaMedia: Float,
    val gradoDominante: TrophyGrade?,
    val xFrac: Float,
)

private val GRADOS_EN_ORDEN = listOf(TrophyGrade.PLATINUM, TrophyGrade.GOLD, TrophyGrade.SILVER, TrophyGrade.BRONZE)

private fun gradeLabelEs(grade: TrophyGrade?): String = when (grade) {
    TrophyGrade.PLATINUM -> "Platino"
    TrophyGrade.GOLD -> "Oro"
    TrophyGrade.SILVER -> "Plata"
    TrophyGrade.BRONZE -> "Bronce"
    null -> "?"
}

/**
 * Vista "Cronología": cuándo cayó cada trofeo (eje X) y lo raro que es (eje
 * Y, el % real — 0% arriba del todo, más raro, 100% abajo), con la foto
 * real del trofeo, no un icono genérico. Mismo cálculo que TrophyTimeline.tsx
 * en la web — solo cuenta lo que tiene `earnedAt` Y `rarityPercent` reales.
 */
/** Columna de "0%"..."100%" del eje Y — idéntica en Resumen y Detalle, fuera
 * del área con scroll (en Detalle) para quedarse fija a la izquierda. */
@Composable
private fun EjeYRareza() {
    Column(
        modifier = Modifier.width(30.dp).height(260.dp).padding(vertical = MARKER_PADDING_DP.dp),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.End,
    ) {
        listOf("0%", "25%", "50%", "75%", "100%").forEach { Text(it, color = Muted, fontSize = 9.sp) }
    }
}

@Composable
private fun TrophyRarityChart(trophies: List<TrophyItem>, modifier: Modifier = Modifier) {
    val puntos = remember(trophies) {
        trophies
            .filter { it.earned && it.earnedAt != null && it.rarityPercent != null }
            .mapNotNull { t ->
                val millis = try { FECHA_ISO_GAME_DETAIL.parse(t.earnedAt!!)?.time } catch (e: Exception) { null }
                millis?.let { PuntoRareza(t, it) }
            }
            .sortedBy { it.fechaMillis }
    }

    if (puntos.size < 2) {
        Text(
            text = "Hacen falta al menos dos trofeos con fecha y rareza registradas para dibujar la gráfica.",
            color = Muted,
            fontSize = 13.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = modifier.fillMaxWidth().padding(vertical = 24.dp),
        )
        return
    }

    val gradosPresentes = GRADOS_EN_ORDEN.filter { g -> puntos.any { it.trofeo.grade == g } }
    var seleccionado by remember { mutableStateOf<PuntoRareza?>(null) }
    var diaPopup by remember { mutableStateOf<String?>(null) }

    // Un marcador por DÍA (no por trofeo): nunca hay scroll, ni horizontal
    // ni vertical. El eje X usa raíz cuadrada de los días transcurridos
    // desde el primer trofeo (no el índice del día ni el tiempo lineal) —
    // mismo criterio que TrophyTimeline.tsx en la web: así sí se aprecia
    // qué días están cerca en el tiempo real y cuáles lejos (antes cada
    // día se llevaba un hueco idéntico, sin ninguna información de
    // distancia), pero una racha de días seguidos después de meses de
    // silencio no se aplasta del todo como pasaría con una escala lineal
    // pura. Un día con varios trofeos abre un popup con la lista al
    // tocarlo, en vez de una gráfica con scroll.
    val (diasOrdenados, resumenPorDia) = remember(puntos) {
        val porDia = LinkedHashMap<String, MutableList<PuntoRareza>>()
        puntos.forEach { p ->
            val dia = FECHA_DIA_KEY.format(java.util.Date(p.fechaMillis))
            porDia.getOrPut(dia) { mutableListOf() }.add(p)
        }
        val dias = porDia.keys.toList()
        val primerDiaMillis = porDia[dias.first()]!!.minOf { it.fechaMillis }
        val ultimoDiaMillis = porDia[dias.last()]!!.minOf { it.fechaMillis }
        val rangoTotalDias = maxOf(1f, (ultimoDiaMillis - primerDiaMillis) / 86_400_000f)
        val raizRangoTotal = kotlin.math.sqrt(rangoTotalDias)
        val resumen = dias.map { dia ->
            val grupo = porDia[dia]!!
            val rarezaMedia = grupo.map { (it.trofeo.rarityPercent ?: 0.0).toFloat() }.average().toFloat()
            val gradoDominante = GRADOS_EN_ORDEN.firstOrNull { g -> grupo.any { it.trofeo.grade == g } }
            val xFrac = if (dias.size == 1) 0.5f else {
                val diasDesdeElPrimero = (grupo.minOf { it.fechaMillis } - primerDiaMillis) / 86_400_000f
                kotlin.math.sqrt(diasDesdeElPrimero) / raizRangoTotal
            }
            ResumenDia(dia, grupo, rarezaMedia, gradoDominante, xFrac)
        }
        dias to resumen
    }

    // Una etiqueta por cada mes nuevo, en el día donde empieza — sin esto,
    // al no ser el eje proporcional al tiempo lineal, no hay forma de saber
    // cuánto tiempo real representa la distancia entre dos burbujas.
    // Separación mínima entre dos etiquetas, en fracción del ancho total —
    // con la escala de raíz cuadrada, varios meses pueden apretarse en muy
    // poco espacio (un trofeo suelto cada mes, por ejemplo) y las
    // etiquetas se solapan sin esto. Mismo criterio y mismo valor que
    // GAP_MIN_ETIQUETA_FRAC en TrophyTimeline.tsx (web).
    val etiquetasMes = remember(diasOrdenados, resumenPorDia) {
        val lista = mutableListOf<Pair<Float, String>>()
        var mesAnterior = ""
        var fracUltimaEtiqueta = Float.NEGATIVE_INFINITY
        diasOrdenados.forEachIndexed { i, dia ->
            val mesKey = dia.substring(0, 7)
            if (mesKey == mesAnterior) return@forEachIndexed
            val frac = resumenPorDia[i].xFrac
            if (frac - fracUltimaEtiqueta < 0.06f) return@forEachIndexed
            mesAnterior = mesKey
            fracUltimaEtiqueta = frac
            val texto = try { FECHA_MES_CORTO.format(FECHA_DIA_KEY.parse(dia)!!) } catch (e: Exception) { dia }
            lista.add(frac to texto)
        }
        lista
    }

    Column(modifier = modifier) {
        if (gradosPresentes.size > 1) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(bottom = 14.dp)) {
                gradosPresentes.forEach { g ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).background(gradeColor(g), CircleShape))
                        Spacer(Modifier.width(4.dp))
                        Text(gradeLabelEs(g), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        Row {
            EjeYRareza()
            Spacer(Modifier.width(6.dp))

            BoxWithConstraints(
                modifier = Modifier
                    .weight(1f)
                    .height(260.dp)
                    .border(1.dp, Border.copy(alpha = 0.5f)),
            ) {
                val xInset = maxWidth - MARKER_PADDING_DP.dp * 2
                val yInset = maxHeight - MARKER_PADDING_DP.dp * 2
                fun xPara(frac: Float) = MARKER_PADDING_DP.dp + xInset * frac
                fun yPara(frac: Float) = MARKER_PADDING_DP.dp + yInset * frac

                listOf(0f, 25f, 50f, 75f, 100f).forEach { r ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .offset(y = yPara(r / 100f))
                            .background(Border.copy(alpha = 0.4f)),
                    )
                }

                resumenPorDia.forEach { d ->
                    val single = d.grupo.singleOrNull()
                    val tam = if (single != null) 30.dp else minOf(24 + d.grupo.size * 3, 44).dp
                    Box(
                        modifier = Modifier
                            .offset(x = xPara(d.xFrac) - tam / 2, y = yPara(d.rarezaMedia / 100f) - tam / 2)
                            .size(tam)
                            .clip(CircleShape)
                            .background(Surface2)
                            .border(2.dp, gradeColor(d.gradoDominante), CircleShape)
                            .clickable {
                                if (single != null) {
                                    seleccionado = if (seleccionado == single) null else single
                                } else {
                                    diaPopup = d.dia
                                }
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (single?.trofeo?.iconUrl != null) {
                            AsyncImage(
                                model = single.trofeo.iconUrl,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                            )
                        } else if (single == null) {
                            Text(
                                text = d.grupo.size.toString(),
                                color = Foreground,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        } else {
                            Text(
                                text = gradeLabelEs(single.trofeo.grade).take(1),
                                color = gradeColor(single.trofeo.grade),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }
        }

        Box(modifier = Modifier.height(20.dp).padding(start = 36.dp)) {
            BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                etiquetasMes.forEach { (x, texto) ->
                    Text(
                        text = texto,
                        color = Muted,
                        fontSize = 9.sp,
                        modifier = Modifier.offset(x = maxWidth * x - 14.dp, y = 2.dp),
                    )
                }
            }
        }

        seleccionado?.let { p ->
            Column(
                modifier = Modifier
                    .padding(top = 12.dp)
                    .fillMaxWidth()
                    .background(Surface, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Text(text = p.trofeo.name, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                if (p.trofeo.detail.isNotBlank()) {
                    Text(text = p.trofeo.detail, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                }
                Text(
                    text = "${fechaCortaTimeline(p.trofeo.earnedAt!!)} · ${p.trofeo.rarityPercent}%",
                    color = Muted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }

    val grupoPopup = diaPopup?.let { dia -> resumenPorDia.find { it.dia == dia }?.grupo }
    if (grupoPopup != null) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { diaPopup = null },
            containerColor = Surface,
            title = {
                Text(
                    text = "${fechaCortaTimeline(grupoPopup.first().trofeo.earnedAt!!)} · ${grupoPopup.size} trofeos",
                    color = Foreground,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            },
            text = {
                // Lista vertical normal (con scroll solo si hace falta,
                // como cualquier lista) — nada de la gráfica ancha con
                // scroll horizontal que se ve mal en una ventana pequeña.
                androidx.compose.foundation.lazy.LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(max = 360.dp),
                ) {
                    items(grupoPopup, key = { it.trofeo.id }) { p ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Surface2, RoundedCornerShape(12.dp))
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(Surface)
                                    .border(2.dp, gradeColor(p.trofeo.grade), CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (p.trofeo.iconUrl != null) {
                                    AsyncImage(
                                        model = p.trofeo.iconUrl,
                                        contentDescription = null,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                                    )
                                } else {
                                    Text(gradeLabelEs(p.trofeo.grade).take(1), color = gradeColor(p.trofeo.grade), fontWeight = FontWeight.Bold)
                                }
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(p.trofeo.name, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${gradeLabelEs(p.trofeo.grade)} · ${p.trofeo.rarityPercent}%",
                                    color = Muted,
                                    fontSize = 11.sp,
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { diaPopup = null }) {
                    Text("Cerrar", color = Accent, fontWeight = FontWeight.Bold)
                }
            },
        )
    }
}

@Composable
private fun TrophyRow(
    trophy: TrophyItem,
    game: GameDetailData,
    isStuck: Boolean,
    onStuckChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val dao = remember(context) { ParagonDatabase.getDatabase(context).stuckTrophyDao() }
    val coroutineScope = rememberCoroutineScope()

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Foto real del trofeo cuando la hay (mismo criterio que TrophyPhoto
        // en la web) — el cuadrado de color por metal es el respaldo para
        // cuando de verdad no hay icono, no la primera opción. Antes esta
        // fila SIEMPRE mostraba el cuadrado genérico con un check, aunque
        // `trophy.iconUrl` ya viniera con la foto real desde hace sesiones
        // (usada en la Cronología, pero nunca aquí en la Lista).
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(11.dp))
                .background(gradeColor(trophy.grade).copy(alpha = if (trophy.earned) 1f else 0.25f))
                .alpha(if (trophy.earned) 1f else 0.42f),
            contentAlignment = Alignment.Center,
        ) {
            if (trophy.iconUrl != null) {
                AsyncImage(
                    model = trophy.iconUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else if (trophy.earned) {
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
                            onStuckChange(false)
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
                            onStuckChange(true)
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
