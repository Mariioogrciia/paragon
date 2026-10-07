package com.paragon.app.ui.social

import com.paragon.app.ui.common.premiumClickable

import com.paragon.shared.red.paragonErrorMessage
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Check
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
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GlobalStats
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.PanelResult
import com.paragon.app.data.UserProfileRepository
import com.paragon.app.data.UserProfileResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.shared.red.UserProfileDto
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T
import com.paragon.app.ui.common.extractAuraColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileBottomSheet(
    handle: String,
    tokenStore: TokenStore,
    database: com.paragon.app.data.local.ParagonDatabase,
    themeStore: com.paragon.app.data.theme.ThemeStore,
    onDismiss: () -> Unit,
    onCompareClick: (String) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val repository = remember(tokenStore) { UserProfileRepository(tokenStore) }
    // Solo para el bloque "Rivalidad" (tú vs. ellos) — mismo repositorio que
    // ya usa el Panel, con su propia caché, así que esto no dispara una
    // llamada de red visible: cada pantalla se trae sus propios datos en
    // esta app, no se pasan las stats propias por props de un lado a otro.
    val myPanelRepository = remember(tokenStore, database) { PanelRepository(tokenStore, database.panelDao()) }
    var result by remember { mutableStateOf<UserProfileResult?>(null) }
    var myStats by remember { mutableStateOf<GlobalStats?>(null) }
    var dominantColor by remember { mutableStateOf<Color?>(null) }
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(handle) {
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        result = null
        dominantColor = null
        result = repository.getProfile(handle)
    }
    // Color del fondo del perfil sacado de su foto (misma caché de Coil que la carátula).
    val auraPerfil = com.paragon.app.ui.common.rememberCoverAuraColor((result as? UserProfileResult.Ok)?.profile?.image)
    LaunchedEffect(auraPerfil) { if (auraPerfil != null) dominantColor = auraPerfil }

    LaunchedEffect(Unit) {
        val panel = myPanelRepository.getPanel()
        if (panel is PanelResult.Ok) myStats = panel.stats
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = com.paragon.app.ui.theme.SurfaceSolida,
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
                        tokenStore = tokenStore,
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
    level >= 50 -> Textos.t(T.arquetipo_elite)
    level >= 25 -> Textos.t(T.arquetipo_veterano)
    level >= 10 -> Textos.t(T.arquetipo_cazador)
    else -> Textos.t(T.arquetipo_explorador)
}

@Composable
private fun ProfileContent(
    profile: UserProfileDto,
    dominantColor: Color?,
    myStats: GlobalStats?,
    themeStore: com.paragon.app.data.theme.ThemeStore,
    tokenStore: TokenStore,
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
            Text(Textos.t(T.perfil_titulo), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.size(40.dp).background(Background.copy(alpha = 0.5f), CircleShape)
            ) {
                Icon(Icons.Default.Close, contentDescription = Textos.t(T.comun_cerrar), tint = Foreground)
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
                com.paragon.app.ui.common.AvatarPersona(profile.image, profile.name, size = 100.dp, colorInicial = Accent, fondo = Background)
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(profile.name, color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("@${profile.handle}", color = Muted, fontSize = 14.sp)
            Text(
                Textos.t(T.perfil_nivel_arquetipo, profile.level, archetypeForLevel(profile.level)),
                color = ringColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp),
            )

            if (profile.accounts.isNotEmpty()) {
                Text(
                    text = Textos.t(if (profile.accounts.size > 1) T.perfil_conectado_n else T.perfil_conectado_1, profile.accounts.joinToString(" · ") { it.platform.uppercase() }),
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
                StatItem(Textos.t(T.comun_nivel), profile.level.toString())
                StatItem(Textos.t(T.comun_platinos), profile.platinos.toString())
                StatItem(Textos.t(T.comun_trofeos), profile.trofeos.toString())
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Amistad (6 oct 2026, como el botón del perfil en la web): enviar,
            // aceptar si te la había mandado, o "Amigos ✓" si ya lo sois.
            if (profile.amistad != "yo") {
                BotonAmistad(profile, tokenStore)
                Spacer(modifier = Modifier.height(12.dp))
            }

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
                    Text(Textos.t(T.perfil_comparar), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = textoSobre(Accent))
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
                Text(if (isRival) Textos.t(T.perfil_rival) else Textos.t(T.perfil_fijar_rival), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }

            Spacer(modifier = Modifier.height(28.dp))

            if (myStats != null) {
                RivalryCard(myStats = myStats, their = profile)
                Spacer(modifier = Modifier.height(28.dp))
            }

            if (profile.recentGames.isNotEmpty()) {
                Text(
                    Textos.t(T.perfil_recientes),
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
                        // Su ficha de ese juego (sus trofeos), no la tuya.
                        val abrirJuegoDe = com.paragon.app.ui.navigation.LocalAbrirJuegoDe.current
                        RecentGameCard(game, onClick = { onDismiss(); abrirJuegoDe(profile.handle, game.id) })
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
        Triple(Textos.t(T.comun_platinos), myStats.platinums, their.platinos),
        Triple(Textos.t(T.comun_trofeos), myStats.trophies, their.trofeos),
    )
    val voyGanando = filas.count { (_, yo, ellos) -> yo > ellos }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(radio(16)))
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .padding(18.dp)
    ) {
        Text(Textos.t(T.perfil_rivalidad), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(4.dp))
        Text(
            text = Textos.t(T.perfil_ventaja, voyGanando, filas.size) + if (voyGanando == filas.size) Textos.t(T.perfil_ventaja_todo) else ".",
            color = if (voyGanando > filas.size / 2) Good else Muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(14.dp))
        filas.forEach { (label, yo, ellos) ->
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(label, color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(70.dp))
                Text(Textos.t(T.perfil_tu, yo), color = if (yo >= ellos) Good else Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(Textos.t(T.perfil_ellos, ellos), color = if (ellos > yo) Danger else Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
private fun RecentGameCard(game: com.paragon.shared.red.RecentGameDto, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .width(220.dp)
            .background(Surface2, RoundedCornerShape(radio(12)))
            .clip(RoundedCornerShape(radio(12)))
            .premiumClickable(onClick = onClick),
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
            Text(Textos.t(T.comun_completado, game.percent), color = Platinum, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
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





@Composable
private fun BotonAmistad(profile: UserProfileDto, tokenStore: TokenStore) {
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current
    var estado by remember(profile.handle) { mutableStateOf(profile.amistad) }
    var trabajando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val forma = RoundedCornerShape(com.paragon.app.ui.theme.radio(16))
    val relleno = estado == "ninguna" || estado == "solicitudRecibida"
    val texto = when (estado) {
        "amigos" -> Textos.t(T.amistad_amigos)
        "solicitudEnviada" -> Textos.t(T.amistad_enviada)
        "solicitudRecibida" -> Textos.t(T.amistad_aceptar)
        else -> Textos.t(T.amistad_anadir)
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
                .clip(forma)
                .background(if (relleno) Accent else Background.copy(alpha = 0.4f))
                .border(1.dp, if (relleno) Accent else Border, forma)
                .clickable(enabled = relleno && !trabajando) {
                    trabajando = true
                    error = null
                    scope.launch {
                        try {
                            val api = com.paragon.app.data.network.ApiClient.amigosApi(tokenStore)
                            if (estado == "solicitudRecibida") {
                                api.aceptar(profile.userId)
                                estado = "amigos"
                            } else {
                                val r = api.enviar(profile.handle)
                                estado = if (r.amigos) "amigos" else "solicitudEnviada"
                            }
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        } catch (e: com.paragon.shared.red.HttpException) {
                            error = e.paragonErrorMessage() ?: Textos.t(T.error_conexion)
                        } catch (e: Exception) {
                            error = Textos.t(T.error_conexion)
                        }
                        trabajando = false
                    }
                },
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                when (estado) {
                    "amigos" -> Icons.Default.Check
                    "solicitudEnviada" -> Icons.Default.Schedule
                    else -> Icons.Default.PersonAdd
                },
                contentDescription = null,
                tint = if (relleno) com.paragon.app.ui.theme.OnAccent else Muted,
                modifier = Modifier.size(20.dp),
            )
            Text(
                if (trabajando) "…" else texto,
                color = if (relleno) com.paragon.app.ui.theme.OnAccent else Muted,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
        error?.let { Text(it, color = com.paragon.app.ui.theme.Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp)) }
    }
}
