package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.palette.graphics.Palette
import coil3.BitmapImage
import coil3.compose.AsyncImage
import coil3.imageLoader
import coil3.request.ImageRequest
import coil3.request.SuccessResult
import coil3.request.allowHardware
import com.paragon.app.data.GlobalStats
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.PanelResult
import com.paragon.app.data.UserProfileRepository
import com.paragon.app.data.UserProfileResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.UserProfileDto
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.app.R
import androidx.compose.ui.res.stringResource
import com.paragon.app.util.Textos

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileBottomSheet(
    handle: String,
    tokenStore: TokenStore,
    themeStore: com.paragon.app.data.theme.ThemeStore,
    onDismiss: () -> Unit,
    onCompareClick: (String) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current
    val panelDao = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context).panelDao() }
    val repository = remember(tokenStore) { UserProfileRepository(tokenStore) }
    // Solo para el bloque "Rivalidad" (tú vs. ellos) — mismo repositorio que
    // ya usa el Panel, con su propia caché, así que esto no dispara una
    // llamada de red visible: cada pantalla se trae sus propios datos en
    // esta app, no se pasan las stats propias por props de un lado a otro.
    val myPanelRepository = remember(tokenStore, panelDao) { PanelRepository(tokenStore, panelDao) }
    var result by remember { mutableStateOf<UserProfileResult?>(null) }
    var myStats by remember { mutableStateOf<GlobalStats?>(null) }
    var dominantColor by remember { mutableStateOf<Color?>(null) }
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(handle) {
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        result = null
        dominantColor = null
        result = repository.getProfile(handle)

        val currentResult = result
        if (currentResult is UserProfileResult.Ok && !currentResult.profile.image.isNullOrBlank()) {
            val request = ImageRequest.Builder(context)
                .data(currentResult.profile.image)
                .allowHardware(false)
                .build()
            val imageResult = context.imageLoader.execute(request)
            val image = (imageResult as? SuccessResult)?.image
            // `allowHardware(false)` de arriba fuerza a coil3 a devolver un
            // BitmapImage normal en vez de uno respaldado por hardware —
            // Palette necesita leer los píxeles uno a uno, cosa que un
            // bitmap "hardware" no permite.
            if (image is BitmapImage) {
                Palette.from(image.bitmap).generate { palette ->
                    palette?.dominantSwatch?.rgb?.let { colorInt ->
                        dominantColor = Color(colorInt)
                    }
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        val panel = myPanelRepository.getPanel()
        if (panel is PanelResult.Ok) myStats = panel.stats
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Surface,
        dragHandle = null // Custom header
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
        ) {
            when (val current = result) {
                null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Accent)
                    }
                }
                is UserProfileResult.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(current.message, color = Foreground)
                    }
                }
                is UserProfileResult.Ok -> {
                    val profile = current.profile
                    ProfileContent(
                        profile = profile,
                        dominantColor = dominantColor,
                        myStats = myStats,
                        themeStore = themeStore,
                        onCompareClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onCompareClick(profile.handle)
                            onDismiss()
                        },
                        onDismiss = onDismiss,
                    )
                }
            }
        }
    }
}

/** Anillo del avatar por nivel — antes siempre el mismo borde neutro, sin comunicar nada del propio rango del jugador. */
private fun ringColorForLevel(level: Int): Color = when {
    level >= 50 -> Platinum
    level >= 25 -> Color(0xFF9B59F6)
    level >= 10 -> Accent
    else -> Border
}

private fun archetypeForLevel(level: Int): String = when {
    level >= 50 -> Textos.t(R.string.arquetipo_elite)
    level >= 25 -> Textos.t(R.string.arquetipo_veterano)
    level >= 10 -> Textos.t(R.string.arquetipo_cazador)
    else -> Textos.t(R.string.arquetipo_explorador)
}

@Composable
private fun ProfileContent(
    profile: UserProfileDto,
    dominantColor: Color?,
    myStats: GlobalStats?,
    themeStore: com.paragon.app.data.theme.ThemeStore,
    onCompareClick: () -> Unit,
    onDismiss: () -> Unit
) {
    val bgBrush = if (dominantColor != null) {
        Brush.verticalGradient(
            colors = listOf(dominantColor.copy(alpha = 0.22f), Surface, Surface),
            startY = 0f,
            endY = 600f
        )
    } else {
        Brush.verticalGradient(colors = listOf(Surface, Surface))
    }
    val ringColor = ringColorForLevel(profile.level)
    val isRival = themeStore.rivalHandle == profile.handle

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bgBrush)
            .verticalScroll(rememberScrollState())
    ) {
        // Cabecera: antes solo una X pegada a la esquina, sin ningún
        // contexto de qué es esta pantalla.
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(stringResource(R.string.perfil_titulo), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.size(40.dp).background(Background.copy(alpha = 0.5f), CircleShape)
            ) {
                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.comun_cerrar), tint = Foreground)
            }
        }

        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .background(Background, CircleShape)
                    .border(3.dp, ringColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (!profile.image.isNullOrBlank()) {
                    AsyncImage(
                        model = profile.image,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(100.dp).clip(CircleShape)
                    )
                } else {
                    Text(profile.name.take(1).uppercase(), color = Accent, fontSize = 40.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(profile.name, color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text("@${profile.handle}", color = Muted, fontSize = 14.sp)
            Text(
                stringResource(R.string.perfil_nivel_arquetipo, profile.level, archetypeForLevel(profile.level)),
                color = ringColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp),
            )

            if (profile.accounts.isNotEmpty()) {
                Text(
                    text = stringResource(if (profile.accounts.size > 1) R.string.perfil_conectado_n else R.string.perfil_conectado_1, profile.accounts.joinToString(" · ") { it.platform.uppercase() }),
                    color = Muted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            Spacer(modifier = Modifier.height(22.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(stringResource(R.string.comun_nivel), profile.level.toString())
                StatItem(stringResource(R.string.comun_platinos), profile.platinos.toString())
                StatItem(stringResource(R.string.comun_trofeos), profile.trofeos.toString())
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Botón principal: antes blanco/color dominante puro, con
            // demasiada presencia visual para lo que es — degradado de
            // acento en vez de un blanco genérico.
            Button(
                onClick = onCompareClick,
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(radio(14)),
                contentPadding = PaddingValues(0.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Brush.linearGradient(listOf(Accent, dominantColor ?: Color(0xFF7657FF))), RoundedCornerShape(radio(14))),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(stringResource(R.string.perfil_comparar), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = textoSobre(Accent))
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedButton(
                onClick = {
                    if (isRival) themeStore.setRivalHandle(null)
                    else themeStore.setRivalHandle(profile.handle)
                },
                modifier = Modifier.fillMaxWidth().height(46.dp),
                shape = RoundedCornerShape(radio(14)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = if (isRival) Platinum else Foreground),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (isRival) Platinum.copy(alpha = 0.5f) else Border)
            ) {
                if (isRival) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = Platinum, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(6.dp))
                }
                Text(if (isRival) stringResource(R.string.perfil_rival) else stringResource(R.string.perfil_fijar_rival), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }

            Spacer(modifier = Modifier.height(28.dp))

            if (myStats != null) {
                RivalryCard(myStats = myStats, their = profile)
                Spacer(modifier = Modifier.height(28.dp))
            }

            if (profile.recentGames.isNotEmpty()) {
                Text(
                    stringResource(R.string.perfil_recientes),
                    color = Muted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    modifier = Modifier.align(Alignment.Start).padding(bottom = 10.dp)
                )
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 28.dp),
                ) {
                    items(profile.recentGames, key = { it.id }) { game ->
                        RecentGameCard(game)
                    }
                }
            }
        }
    }
}

/**
 * Tú vs. ellos — antes el perfil terminaba justo después de las stats
 * básicas, sin ninguna lectura competitiva ("esto es lo que tengo que
 * superar"). Usa las stats propias ya cacheadas (Panel), no inventa datos.
 */
@Composable
private fun RivalryCard(myStats: GlobalStats, their: UserProfileDto) {
    val filas = listOf(
        Triple(stringResource(R.string.comun_platinos), myStats.platinums, their.platinos),
        Triple(stringResource(R.string.comun_trofeos), myStats.trophies, their.trofeos),
    )
    val voyGanando = filas.count { (_, yo, ellos) -> yo > ellos }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(radio(16)))
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .padding(18.dp)
    ) {
        Text(stringResource(R.string.perfil_rivalidad), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.perfil_ventaja, voyGanando, filas.size) + if (voyGanando == filas.size) stringResource(R.string.perfil_ventaja_todo) else ".",
            color = if (voyGanando > filas.size / 2) Good else Muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(14.dp))
        filas.forEach { (label, yo, ellos) ->
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(label, color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(70.dp))
                Text(stringResource(R.string.perfil_tu, yo), color = if (yo >= ellos) Good else Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(stringResource(R.string.perfil_ellos, ellos), color = if (ellos > yo) Danger else Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/**
 * Tarjeta horizontal con imagen aparte del texto — antes el texto iba
 * encima de la carátula con una capa oscura semitransparente, legible pero
 * apretado y sin más dato que el %.
 */
@Composable
private fun RecentGameCard(game: com.paragon.app.data.network.RecentGameDto) {
    Row(
        modifier = Modifier
            .width(220.dp)
            .background(Surface2, RoundedCornerShape(radio(12)))
            .clip(RoundedCornerShape(radio(12))),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.size(64.dp).background(Background)) {
            if (game.coverUrl.isNotBlank()) {
                AsyncImage(
                    model = game.coverUrl,
                    contentDescription = game.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        Column(modifier = Modifier.padding(horizontal = 10.dp)) {
            Text(game.title, color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 2)
            Text(stringResource(R.string.comun_completado, game.percent), color = Platinum, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(label, color = Muted, fontSize = 12.sp)
    }
}
