package com.paragon.app.ui.game

import androidx.compose.ui.draw.clipToBounds
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import com.paragon.app.util.fechaConPatron

import com.paragon.app.util.fechaConEstilo

import com.paragon.app.util.claveDia

import com.paragon.app.util.EstiloFecha

import com.paragon.app.data.isoAMillis

import io.ktor.http.encodeURLQueryComponent

import com.paragon.shared.i18n.stringResource

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
import androidx.compose.material.icons.automirrored.filled.MenuBook
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import com.paragon.shared.contextoPlataforma
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.local.ParagonDatabase
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
import com.paragon.app.ui.common.gradeColor
import com.paragon.app.ui.common.gradeLabelEs
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos


/**
 * Ficha de juego (plan sección 2.4) — cabecera hero con portada difuminada
 * de fondo, barra de progreso general y trofeos agrupados por rareza
 * (Platino > Oro > Plata > Bronce, mismo orden que la web). Datos reales
 * contra GET /api/mobile/games/{gameId} (GameDetailRepository).
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun GameDetailScreen(
    gameId: String,
    tokenStore: TokenStore,
    handle: String = "",
    onBack: () -> Unit = {},
    onModoEnfoque: () -> Unit = {},
    sharedTransitionScope: SharedTransitionScope? = null,
    animatedVisibilityScope: AnimatedVisibilityScope? = null,
) {
    val repository = remember(tokenStore) { GameDetailRepository(tokenStore) }
    val milestoneRepository = remember(tokenStore) { MilestoneRepository(tokenStore) }
    var result by remember { mutableStateOf<GameDetailResult?>(null) }
    var hito by remember { mutableStateOf<HitoReservado?>(null) }
    var proximoHito by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(gameId, retryCounter.value) {
        result = null
        result = repository.getGameDetail(gameId)
        val milestoneResult = milestoneRepository.getMilestone()
        hito = (milestoneResult as? MilestoneResult.Ok)?.hito
        (milestoneResult as? MilestoneResult.Ok)?.let { ok ->
            val numero = ok.proximoNumero
            val faltan = ok.faltan
            if (numero != null && faltan != null) proximoHito = numero to faltan
        }
    }

    when (val current = result) {
        null -> com.paragon.app.ui.common.EsqueletoFicha(Modifier.fillMaxSize().background(Background))
        is GameDetailResult.Error -> Box(
            modifier = Modifier.fillMaxSize().background(Background).padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = current.message, color = Foreground, fontSize = 14.sp)
                Row(modifier = Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    // El `retryCounter` que dispara el `LaunchedEffect` de
                    // arriba ya existía — solo faltaba un botón que lo
                    // usara. Sin esto, un corte de red momentáneo dejaba
                    // "Volver" como única salida, obligando a salir y
                    // volver a entrar desde el origen para reintentar.
                    Button(
                        onClick = { retryCounter.value += 1 },
                        colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    ) {
                        Text(Textos.t(T.comun_reintentar))
                    }
                    TextButton(onClick = onBack) {
                        Text(Textos.t(T.comun_volver), color = Foreground)
                    }
                }
            }
        }
        is GameDetailResult.Ok -> GameDetailContent(
            gameId = gameId,
            game = current.detail,
            fromCache = current.fromCache,
            hitoInicial = hito,
            proximoHito = proximoHito,
            tokenStore = tokenStore,
            handle = handle,
            repository = repository,
            onBack = onBack,
            onModoEnfoque = onModoEnfoque,
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
    proximoHito: Pair<Int, Int>?,
    tokenStore: TokenStore,
    handle: String,
    repository: GameDetailRepository,
    onBack: () -> Unit,
    onModoEnfoque: () -> Unit,
    onMilestoneChanged: () -> Unit,
    sharedTransitionScope: SharedTransitionScope?,
    animatedVisibilityScope: AnimatedVisibilityScope?,
) {
    val coroutineScope = rememberCoroutineScope()
    val context = contextoPlataforma()
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
    // Antes se ordenaba dentro del propio LazyColumn (en cada recomposición
    // del contenido, p. ej. al tocar el chip de racha de la cabecera) —
    // ahora solo se recalcula si `game.trophies` cambia de verdad.
    // "Solo los que me faltan": se recuerda mientras la app está abierta.
    // Filtros de la lista (5 oct 2026, como en la web): estado (todos /
    // pendientes / conseguidos) y DLC. Sin filtro de DLC, la lista va
    // agrupada por juego base y cada DLC, con su progreso.
    var estadoTrofeos by remember { mutableStateOf(0) } // 0 todos, 1 me faltan, 2 conseguidos
    var grupoElegido by remember(gameId) { mutableStateOf<String?>(null) }
    val nombreBase = Textos.t(T.ficha_juego_base)
    val grupos = remember(game.trophies) {
        game.trophies.groupBy { it.groupId }.toList()
            .sortedWith(compareBy<Pair<String, List<TrophyItem>>> { it.first != "default" }.thenBy { it.second.firstOrNull()?.groupName ?: it.first })
    }
    fun nombreGrupo(id: String, lista: List<TrophyItem>) =
        if (id == "default") nombreBase else lista.firstOrNull()?.groupName ?: Textos.t(T.ficha_expansion)
    val trofeosOrdenados = remember(game.trophies, estadoTrofeos, grupoElegido) {
        game.trophies
            .filter { grupoElegido == null || it.groupId == grupoElegido }
            .filter { when (estadoTrofeos) { 1 -> !it.earned; 2 -> it.earned; else -> true } }
            .sortedWith(compareByDescending<TrophyItem> { it.grade?.ordinal ?: -1 }.thenBy { it.earned.not() })
    }
    // Los grupos que se pintan: todos (con cabecera) si hay DLC y no se ha elegido uno.
    val gruposVisibles = remember(trofeosOrdenados, grupos, grupoElegido) {
        if (grupos.size <= 1 || grupoElegido != null) listOf(null to trofeosOrdenados)
        else grupos.map { (id, _) -> id to trofeosOrdenados.filter { it.groupId == id } }.filter { it.second.isNotEmpty() }
    }

    val coverAura = com.paragon.app.ui.common.rememberCoverAuraColor(game.coverUrl)
    androidx.compose.runtime.LaunchedEffect(coverAura) {
        if (coverAura != null) dynamicColor = coverAura
    }
    // El número solo se conoce cuando ALGÚN juego está reservado (viene de
    // /api/mobile/milestone) — si no hay nada reservado todavía no hay
    // preview de número, mismo límite que tiene la API móvil.
    // (número, platinos que faltan): siempre el del próximo hito, haya o no otro juego reservado.
    val numeroHito = proximoHito?.first ?: hitoInicial?.numero
    val faltanHito = proximoHito?.second

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
            com.paragon.app.data.notifyWidgetUpdate(context)
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

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 0f

    Box(Modifier.fillMaxSize()) {
    LazyColumn(state = listState, modifier = Modifier.fillMaxSize().background(Background)) {
        item {
            GameDetailHero(
                game = game,
                fromCache = fromCache,
                prediccion = prediccion,
                dynamicColor = dynamicColor,
                onBack = onBack,
                sharedTransitionScope = sharedTransitionScope,
                animatedVisibilityScope = animatedVisibilityScope,
                scrollOffset = scrollOffset,
            )
        }

        item {
            GameActionsRow(
                pinned = pinned,
                reservado = reservado,
                numeroHito = numeroHito,
                faltanHito = faltanHito,
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

        // "El Diario del Platino", como en la web: solo con el platino y fechas.
        game.diario?.let { diario ->
            item {
                com.paragon.app.ui.trofeos.DiarioPlatinoCard(diario, game.title, Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
            }
        }

        // Filtros: estado (segmentado) y, si hay DLC, una fila de pastillas por grupo.
        item {
            Column(Modifier.padding(top = 12.dp)) {
                Row(modifier = Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    com.paragon.app.ui.common.ControlSegmentado(
                        opciones = listOf(
                            Textos.t(T.ficha_filtro_todos),
                            Textos.t(T.ficha_filtro_faltan, game.trophies.count { !it.earned }),
                            Textos.t(T.ficha_filtro_conseguidos),
                        ),
                        seleccion = estadoTrofeos,
                        onCambio = { estadoTrofeos = it },
                        modifier = Modifier.weight(1f),
                    )
                }
                // DLC: el mismo desplegable que el resto de la app (ui/common/Selector),
                // con el progreso de cada grupo a la derecha.
                if (grupos.size > 1) {
                    com.paragon.app.ui.common.Selector(
                        valor = grupoElegido ?: "",
                        opciones = listOf(
                            com.paragon.app.ui.common.OpcionSelector("", Textos.t(T.ficha_filtro_todo_dlc), detalle = "${game.trophies.count { it.earned }}/${game.trophies.size}"),
                        ) + grupos.map { (id, lista) ->
                            com.paragon.app.ui.common.OpcionSelector(id, nombreGrupo(id, lista), detalle = "${lista.count { it.earned }}/${lista.size}")
                        },
                        onElegir = { grupoElegido = it.ifEmpty { null } },
                        modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 10.dp),
                    )
                }
                Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(Textos.t(T.ritmo_n_trofeos, trofeosOrdenados.size), color = Muted, fontSize = 13.sp, modifier = Modifier.weight(1f))
                    com.paragon.app.ui.trofeos.SelectorVistaTrofeos()
                }
            }
        }

        val vista = com.paragon.app.ui.trofeos.vistaTrofeosActual
        if (vista == com.paragon.app.ui.trofeos.VistaTrofeos.CRONOLOGIA) {
            item {
                TrophyRarityChart(trophies = trofeosOrdenados, modifier = Modifier.padding(horizontal = 24.dp))
            }
        } else gruposVisibles.forEach { (grupoId, lista) ->
            if (grupoId != null) {
                item(key = "grupo-$grupoId") {
                    val todos = grupos.firstOrNull { it.first == grupoId }?.second.orEmpty()
                    CabeceraGrupoTrofeos(
                        nombre = nombreGrupo(grupoId, todos),
                        conseguidos = todos.count { it.earned },
                        total = todos.size,
                        esDlc = grupoId != "default",
                    )
                }
            }
            if (vista == com.paragon.app.ui.trofeos.VistaTrofeos.CUADRICULA) {
                items(lista.chunked(4)) { fila ->
                    com.paragon.app.ui.trofeos.FilaCuadricula(fila, columnas = 4, modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp))
                }
            } else {
                items(lista, key = { "${grupoId}-${it.id}" }) { trophy ->
                    TrophyRow(
                        trophy,
                        game = game,
                        repository = repository,
                        tokenStore = tokenStore,
                        isStuck = trophy.id in stuckIds,
                        onStuckChange = { nuevo ->
                            stuckIds = if (nuevo) stuckIds + trophy.id else stuckIds - trophy.id
                        },
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                    )
                }
            }
        }
        if (trofeosOrdenados.isEmpty()) {
            item {
                Text(Textos.t(T.ficha_sin_trofeos_filtro), color = Muted, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 24.dp, vertical = 24.dp))
            }
        }

        // Hueco para el botón de abajo (no tapar el último trofeo).
        item { Spacer(Modifier.height(104.dp)) }
    }

    // "Modo Enfoque" en la zona del pulgar (maqueta "3 · Ficha"): ancla el
    // juego si no lo estaba (el Enfoque trabaja con el anclado) y lo abre.
    androidx.compose.material3.Button(
        onClick = {
            if (!pinned) togglePin()
            onModoEnfoque()
        },
        colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Accent, contentColor = com.paragon.app.ui.theme.OnAccent),
        shape = RoundedCornerShape(radio(28)),
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = 16.dp, vertical = 16.dp)
            .fillMaxWidth()
            .height(56.dp),
    ) {
        Text(Textos.t(T.nav_enfoque), fontSize = 16.sp, fontWeight = FontWeight.Bold)
    }
    // Volver siempre a mano (diseño v2): fijo arriba aunque se baje por la ficha.
    IconButton(
        onClick = onBack,
        modifier = Modifier.align(Alignment.TopStart).padding(12.dp).size(44.dp).clip(RoundedCornerShape(50)).background(Background.copy(alpha = 0.7f)),
    ) {
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = Textos.t(T.comun_volver), tint = Foreground, modifier = Modifier.size(30.dp))
    }
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
    scrollOffset: Float = 0f,
) {
    // Rediseño del 5 oct 2026 (maqueta "3 · Ficha del juego"): la portada a
    // todo lo ancho con un velo del color de fondo del tema, el título grande
    // abajo y, debajo de la portada, tres cifras (el valor por delante de la
    // etiqueta) y la barra de progreso.
    Column {
        // clipToBounds: con el efecto parallax la carátula bajaba por debajo
        // de la cabecera y se veía detrás de las cifras (captura del 6 oct).
        Box(modifier = Modifier.fillMaxWidth().height(300.dp).clipToBounds()) {
            val coverModifier = Modifier.fillMaxSize().graphicsLayer { translationY = scrollOffset * 0.4f }.let { base ->
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
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Brush.verticalGradient(colors = listOf(Background.copy(alpha = 0.35f), Color.Transparent, Background)))
            )
            Column(Modifier.align(Alignment.BottomStart).padding(horizontal = 24.dp, vertical = 16.dp)) {
                if (fromCache) {
                    Text(text = Textos.t(T.comun_sin_conexion_copia), color = Muted, fontSize = 11.sp)
                }
                if (game.id.startsWith("epic-")) {
                    // Mismo aviso que MarcaDeclarado en la web: Epic solo se lee
                    // desde la extensión del navegador y no se puede comprobar.
                    Text(text = Textos.t(T.ficha_declarado), color = Muted, fontSize = 12.sp)
                }
                Text(
                    text = game.title,
                    color = Foreground,
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 32.sp,
                    maxLines = 3,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CifraFicha("${game.percent}%", Textos.t(T.ficha_cifra_progreso), Modifier.weight(1f), color = dynamicColor)
            CifraFicha("${game.earnedTrophies}/${game.totalTrophies}", Textos.t(T.comun_trofeos), Modifier.weight(1f))
            when {
                prediccion != null -> CifraFicha(fechaConPatron(prediccion.fechaMillis, "dMMM"), Textos.t(T.ficha_cifra_platino), Modifier.weight(1f))
                game.playtimeMinutes != null -> CifraFicha("${game.playtimeMinutes / 60} h", Textos.t(T.ficha_cifra_horas), Modifier.weight(1f))
                else -> Spacer(Modifier.weight(1f))
            }
        }
        Box(
            modifier = Modifier
                .padding(start = 24.dp, end = 24.dp, top = 16.dp, bottom = 8.dp)
                .fillMaxWidth()
                .height(8.dp)
                .background(Surface2, RoundedCornerShape(radio(4))),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(game.percent / 100f)
                    .fillMaxHeight()
                    .background(dynamicColor, RoundedCornerShape(radio(4))),
            )
        }
    }
}

@Composable
private fun CifraFicha(valor: String, etiqueta: String, modifier: Modifier, color: Color = Foreground) {
    Column(modifier) {
        Text(
            valor,
            color = color,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
            maxLines = 1,
        )
        Text(etiqueta, color = Muted, fontSize = 12.sp, maxLines = 1)
    }
}

// Formatos de fecha del idioma del teléfono (antes fijos en español).


/** "23 jun 2026" a partir del ISO real de earnedAt — para la fecha de cada fila de la Cronología. */
private fun fechaCortaTimeline(iso: String): String =
    isoAMillis(iso)?.let { fechaConEstilo(it, EstiloFecha.MEDIA) } ?: ""

/** Margen a los cuatro lados del área de puntos — sin esto, un trofeo con
 * 0%/100% de rareza exacto, o del primer/último día, queda con el centro
 * justo en el borde. Mismo criterio que MARKER_PADDING_PX en TrophyTimeline.tsx. */
private const val MARKER_PADDING_DP = 16


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
    faltanHito: Int?,
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
            .padding(vertical = 12.dp)
            // El scroll antes del margen: así las pastillas llegan al borde
            // al deslizar en vez de cortarse a 24 dp de él.
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        ActionChip(
            label = if (pinned) Textos.t(T.ficha_objetivo_actual) else Textos.t(T.ficha_anclar),
            active = pinned,
            accentColor = dynamicColor,
            onClick = onTogglePin,
        )
        ActionChip(
            label = when {
                reservado && numeroHito != null -> Textos.t(T.ficha_reservado_n, numeroHito)
                reservado -> Textos.t(T.ficha_reservado)
                numeroHito != null && faltanHito != null -> stringResource(if (faltanHito == 1) T.ficha_reservar_faltan_1 else T.ficha_reservar_faltan_n, numeroHito, faltanHito)
                numeroHito != null -> Textos.t(T.ficha_reservar_n, numeroHito)
                else -> Textos.t(T.ficha_reservar)
            },
            active = reservado,
            accentColor = Gold,
            onClick = onToggleReserve,
        )
        ActionChip(
            label = Textos.t(T.nav_carpetas),
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
                label = Textos.t(T.ficha_compartir_platino),
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
        shape = RoundedCornerShape(radio(20)),
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
internal fun TrophyRarityChart(trophies: List<TrophyItem>, modifier: Modifier = Modifier) {
    val puntos = remember(trophies) {
        trophies
            .filter { it.earned && it.earnedAt != null && it.rarityPercent != null }
            .mapNotNull { t ->
                val millis = isoAMillis(t.earnedAt)
                millis?.let { PuntoRareza(t, it) }
            }
            .sortedBy { it.fechaMillis }
    }

    if (puntos.size < 2) {
        Text(
            text = Textos.t(T.ficha_grafica_vacia),
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
            val dia = claveDia(p.fechaMillis)
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
            val texto = isoAMillis(dia + "T00:00:00.000Z")?.let { fechaConPatron(it, "MMMyy") } ?: dia
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
                    .background(Surface, RoundedCornerShape(radio(14)))
                    .padding(14.dp),
            ) {
                Text(text = p.trofeo.name, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (p.trofeo.detail.isNotBlank()) {
                    Text(text = p.trofeo.detail, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                }
                Text(
                    text = Textos.t(T.ficha_fecha_rareza, fechaCortaTimeline(p.trofeo.earnedAt!!), p.trofeo.rarityPercent ?: "?"),
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
                    text = Textos.t(T.ficha_fecha_trofeos, fechaCortaTimeline(grupoPopup.first().trofeo.earnedAt!!), grupoPopup.size),
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
                                .background(Surface2, RoundedCornerShape(radio(12)))
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
                                Text(p.trofeo.name, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(
                                    Textos.t(T.ficha_grado_rareza, gradeLabelEs(p.trofeo.grade), p.trofeo.rarityPercent ?: "?"),
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
                    Text(Textos.t(T.comun_cerrar), color = Accent, fontWeight = FontWeight.Bold)
                }
            },
        )
    }
}

@Composable
private fun TrophyRow(
    trophy: TrophyItem,
    game: GameDetailData,
    repository: GameDetailRepository,
    tokenStore: TokenStore,
    isStuck: Boolean,
    onStuckChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
    val context = contextoPlataforma()
    val dao = remember(context) { ParagonDatabase.getDatabase(context).stuckTrophyDao() }
    val coroutineScope = rememberCoroutineScope()
    var buscandoGuia by remember(trophy.id) { mutableStateOf(false) }
    var showGuiasEscritas by remember(trophy.id) { mutableStateOf(false) }

    // Antes todo iba en UNA fila (foto, texto, %, ⭐, 🔍, 📖): en un móvil
    // los botones se comían el ancho y el texto quedaba en una columna de
    // cuatro letras, ilegible. Ahora el texto ocupa todo el ancho y las
    // acciones bajan a su propia línea.
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(16)))
            .padding(16.dp),
    ) {
    Row(verticalAlignment = Alignment.Top) {
        // Foto real del trofeo cuando la hay (mismo criterio que TrophyPhoto
        // en la web) — el cuadrado de color por metal es el respaldo para
        // cuando de verdad no hay icono, no la primera opción. Antes esta
        // fila SIEMPRE mostraba el cuadrado genérico con un check, aunque
        // `trophy.iconUrl` ya viniera con la foto real desde hace sesiones
        // (usada en la Cronología, pero nunca aquí en la Lista).
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(radio(11)))
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
            Spacer(Modifier.width(8.dp))
            Text(text = "${com.paragon.app.util.numeroLocal(it, 1)} %", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        }
    }
        if (!trophy.earned) Row(
            modifier = Modifier.fillMaxWidth().padding(start = 56.dp, top = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
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
                modifier = Modifier.size(40.dp)
            ) {
                Icon(Icons.Default.Star, contentDescription = Textos.t(T.ficha_atascar), tint = if (isStuck) Accent else Muted, modifier = Modifier.size(16.dp))
            }
            IconButton(
                enabled = !buscandoGuia,
                onClick = {
                    buscandoGuia = true
                    coroutineScope.launch {
                        // Mismo vídeo cacheado que la web (game_trophy.guideVideoId,
                        // ver GameDetailRepository.getTrophyGuide) — antes esto
                        // abría una búsqueda genérica en el navegador sin más,
                        // sin usar la guía real que la web ya encuentra y guarda.
                        val videoId = repository.getTrophyGuide(game.id, trophy.id)
                        buscandoGuia = false
                        uriHandler.openUri(urlGuiaYoutube(videoId, game.title, trophy.name))
                    }
                },
                modifier = Modifier.size(40.dp)
            ) {
                if (buscandoGuia) {
                    CircularProgressIndicator(color = Accent, strokeWidth = 2.dp, modifier = Modifier.size(14.dp))
                } else {
                    Icon(Icons.Default.Search, contentDescription = Textos.t(T.ficha_buscar_guia), tint = Accent, modifier = Modifier.size(16.dp))
                }
            }
            IconButton(
                onClick = { showGuiasEscritas = true },
                modifier = Modifier.size(40.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = Textos.t(T.ficha_guias_escritas), tint = Muted, modifier = Modifier.size(16.dp))
            }
        }
    }

    if (showGuiasEscritas) {
        TrophyGuidesSheet(
            gameId = game.id,
            trophyId = trophy.id,
            trophyName = trophy.name,
            tokenStore = tokenStore,
            onDismiss = { showGuiasEscritas = false },
        )
    }
}

/**
 * Abre la app de YouTube directamente en el vídeo de guía (`vnd...`/paquete
 * `com.google.android.youtube` a propósito, no solo una URL genérica) — si
 * no está instalada, cae al navegador con la misma URL. Sin `videoId` (no
 * se encontró guía cacheada ni en vivo, mismo caso que "Sin vídeo todavía"
 * en la web), se cae a una búsqueda en la propia app/web de YouTube: mejor
 * eso que no hacer nada al tocar el botón.
 */
/**
 * La guía en vídeo del trofeo: el vídeo concreto si la web ya encontró uno, o
 * una búsqueda en YouTube. El sistema la abre en la app de YouTube si está
 * instalada (Android e iOS), si no en el navegador.
 */
private fun urlGuiaYoutube(videoId: String?, gameTitle: String, trophyName: String): String =
    if (videoId != null) {
        "https://www.youtube.com/watch?v=$videoId"
    } else {
        "https://www.youtube.com/results?search_query=" +
            Textos.t(T.guia_busqueda_video, gameTitle, trophyName).encodeURLQueryComponent()
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
            Text(Textos.t(T.ficha_notas), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            if (isEditing) {
                TextButton(onClick = { 
                    isEditing = false
                    onSaveNotes(notes)
                }) {
                    Text(Textos.t(T.comun_guardar), color = dynamicColor, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            } else if (notes.isNotBlank()) {
                TextButton(onClick = { isEditing = true }) {
                    Text(Textos.t(T.comun_editar), color = Muted, fontSize = 13.sp)
                }
            }
        }
        
        if (isEditing) {
            androidx.compose.material3.OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                placeholder = { Text(Textos.t(T.ficha_notas_ph), color = Muted, fontSize = 14.sp) },
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
                        .background(Surface, RoundedCornerShape(radio(12)))
                        .border(1.dp, Border, RoundedCornerShape(radio(12)))
                        .clickable { isEditing = true }
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(Textos.t(T.ficha_notas_anadir), color = Muted, fontSize = 14.sp)
                }
            } else {
                Text(
                    text = notes,
                    color = Foreground,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Surface, RoundedCornerShape(radio(12)))
                        .border(1.dp, Border, RoundedCornerShape(radio(12)))
                        .padding(16.dp)
                )
            }
        }
    }
}

/** Cabecera de un grupo de trofeos (juego base o un DLC) con su progreso. */
@Composable
private fun CabeceraGrupoTrofeos(nombre: String, conseguidos: Int, total: Int, esDlc: Boolean) {
    Column(Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (esDlc) {
                Text(
                    "DLC",
                    color = Accent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(com.paragon.app.ui.theme.AccentSoft).padding(horizontal = 7.dp, vertical = 2.dp),
                )
                Spacer(Modifier.width(8.dp))
            }
            Text(nombre, color = Foreground, fontSize = 17.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Text("$conseguidos/$total", color = Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
        }
        Box(Modifier.padding(top = 8.dp).fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)).background(com.paragon.app.ui.theme.Border)) {
            Box(Modifier.fillMaxWidth(if (total > 0) conseguidos / total.toFloat() else 0f).height(4.dp).background(Accent))
        }
    }
}
