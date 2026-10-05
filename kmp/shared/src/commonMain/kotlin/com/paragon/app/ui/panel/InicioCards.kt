package com.paragon.app.ui.panel

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GameProgress
import com.paragon.app.data.NextTrophy
import com.paragon.app.data.RachaGlobal
import com.paragon.app.data.UserProfile
import com.paragon.app.data.ahoraMillis
import com.paragon.app.data.isoAMillis
import com.paragon.app.ui.common.AvatarPersona
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.common.urlImagenSegura
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.OnAccent
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.app.util.fechaConPatron
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.SesionDto

/*
 * Piezas del Inicio rediseñado (5 oct 2026, maqueta aprobada "1 · Inicio").
 * Solo colores y radios del tema: Accent/Surface/Border... cambian con
 * Apariencia (modo, acento, estilo), así que nada de hex fijos aquí.
 */

private val METAL = mapOf("platinum" to "🏆", "gold" to "🥇", "silver" to "🥈", "bronze" to "🥉")

/** Fecha de hoy, "Hola, Mario", la racha y tu avatar (que lleva a Perfil). */
@Composable
fun CabeceraInicio(profile: UserProfile, racha: RachaGlobal, onRacha: () -> Unit, onPerfil: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(
                fechaConPatron(ahoraMillis(), "EEEEdMMMM").replaceFirstChar { it.uppercase() },
                color = Muted,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
            )
            Text(
                Textos.t(T.inicio_hola, profile.name.trim().split(" ").first()),
                color = Foreground,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Row(
            Modifier.height(36.dp).clip(RoundedCornerShape(50)).background(Surface).border(1.dp, Border, RoundedCornerShape(50))
                .premiumClickable(onClick = onRacha).padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.Whatshot, contentDescription = null, tint = Accent, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(4.dp))
            Text("${racha.actual}", color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        }
        Spacer(Modifier.width(8.dp))
        Box(Modifier.size(44.dp).clip(CircleShape).background(Accent).padding(2.dp).premiumClickable(onClick = onPerfil)) {
            AvatarPersona(profile.image, profile.name, size = 40.dp)
        }
    }
}

/** Anillo de progreso con el porcentaje dentro, en el acento del tema. */
@Composable
fun AnilloProgreso(porcentaje: Int, tam: Int = 64, fondo: androidx.compose.ui.graphics.Color = Surface2) {
    Box(Modifier.size(tam.dp), contentAlignment = Alignment.Center) {
        val acento = Accent
        Canvas(Modifier.fillMaxSize()) {
            val grosor = size.minDimension * 0.11f
            drawArc(fondo, 0f, 360f, false, style = Stroke(grosor))
            drawArc(acento, -90f, 360f * porcentaje.coerceIn(0, 100) / 100f, false, style = Stroke(grosor, cap = StrokeCap.Round))
        }
        Text("$porcentaje%", color = Foreground, fontSize = (tam / 4.3f).sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
    }
}

/**
 * "Tu objetivo": el juego anclado (o el más cercano al platino) con su
 * portada, el anillo de progreso y, debajo, el siguiente trofeo a por el
 * que ir con un botón en la zona del pulgar.
 */
@Composable
fun ObjetivoCard(
    game: GameProgress,
    etiqueta: String,
    siguiente: NextTrophy?,
    onAbrir: () -> Unit,
) {
    val forma = RoundedCornerShape(radio(24))
    val restantes = (game.totalTrophies - game.earnedTrophies).coerceAtLeast(0)
    Column(
        Modifier.fillMaxWidth()
            .shadow(16.dp, forma, ambientColor = Accent.copy(alpha = 0.2f), spotColor = Accent.copy(alpha = 0.2f))
            .clip(forma)
            .background(Surface)
            .border(1.dp, Border, forma)
            .premiumClickable(onClick = onAbrir),
    ) {
        Box(Modifier.fillMaxWidth().height(160.dp).background(Surface2)) {
            urlImagenSegura(game.coverUrl)?.let {
                AsyncImage(model = it, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
            // Velo del color del fondo del tema para que el texto se lea sobre cualquier portada.
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Background.copy(alpha = 0.15f), Background.copy(alpha = 0.92f)))))
            Text(
                etiqueta.uppercase(),
                color = Accent,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp,
                modifier = Modifier.align(Alignment.TopStart).padding(16.dp),
            )
            Box(Modifier.align(Alignment.TopEnd).padding(12.dp)) { AnilloProgreso(game.percent, fondo = Background.copy(alpha = 0.6f)) }
            Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
                Text(game.title, color = Foreground, fontSize = 24.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 26.sp)
                Text(Textos.t(T.inicio_faltan, restantes), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
        if (siguiente != null) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).clip(RoundedCornerShape(radio(12))).background(Surface2), contentAlignment = Alignment.Center) {
                    urlImagenSegura(siguiente.iconUrl)?.let {
                        AsyncImage(model = it, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    } ?: Text(siguiente.grade?.let { METAL[it] } ?: "🎯", fontSize = 18.sp)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(Textos.t(T.panel_siguiente).uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text(siguiente.trophyName, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.width(8.dp))
                Box(
                    Modifier.height(44.dp).clip(RoundedCornerShape(50)).background(Accent).padding(horizontal = 18.dp),
                    contentAlignment = Alignment.Center,
                ) { Text(Textos.t(T.inicio_ir), color = OnAccent, fontSize = 14.sp, fontWeight = FontWeight.Bold) }
            }
        }
    }
}

/** Tres cifras grandes: el valor por delante de la etiqueta. */
@Composable
fun CifrasInicio(nivel: Int, platinos: Int, trofeos: Int, onPlatinos: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Cifra("$nivel", Textos.t(T.comun_nivel), Modifier.weight(1f))
        Cifra(com.paragon.app.util.cifra(platinos), Textos.t(T.comun_platinos), Modifier.weight(1f), destacada = true, onClick = onPlatinos)
        Cifra(com.paragon.app.util.cifra(trofeos), Textos.t(T.comun_trofeos), Modifier.weight(1f))
    }
}

@Composable
private fun Cifra(valor: String, etiqueta: String, modifier: Modifier, destacada: Boolean = false, onClick: (() -> Unit)? = null) {
    Column(
        modifier.clip(RoundedCornerShape(radio(16))).background(Surface).border(1.dp, Border, RoundedCornerShape(radio(16)))
            .then(if (onClick != null) Modifier.premiumClickable(onClick = onClick) else Modifier)
            .padding(12.dp),
    ) {
        Text(valor, color = if (destacada) Accent else Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, maxLines = 1)
        Text(etiqueta, color = Muted, fontSize = 12.sp, maxLines = 1)
    }
}

/** Título de sección con un enlace opcional a la derecha ("Ver todas"). */
@Composable
fun TituloSeccion(texto: String, accion: String? = null, onAccion: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, top = 24.dp, bottom = 8.dp), verticalAlignment = Alignment.Bottom) {
        Text(texto, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        if (accion != null && onAccion != null) {
            Text(accion, color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.premiumClickable(onClick = onAccion).padding(4.dp))
        }
    }
}

/** Tu próxima sesión de trofeos: día grande a la izquierda y las plazas a la derecha. */
@Composable
fun ProximaSesionCard(s: SesionDto, onClick: () -> Unit) {
    val millis = isoAMillis(s.fechaHora)
    Row(
        Modifier.padding(horizontal = 24.dp).fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(radio(16)))
            .premiumClickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            Modifier.width(52.dp).clip(RoundedCornerShape(radio(12))).background(AccentSoft).padding(vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(millis?.let { fechaConPatron(it, "EEE").uppercase() } ?: "", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text(millis?.let { fechaConPatron(it, "d") } ?: "", color = Foreground, fontSize = 18.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                s.trofeo + (millis?.let { " · " + fechaConPatron(it, "HHmm") } ?: ""),
                color = Foreground,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text("${s.juego.titulo} · ${s.juego.deviceLabel}", color = Muted, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text("${s.ocupadas}/${s.plazasTotales}", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
    }
}

/**
 * "Sigue jugando" de Inicio (diseño v2): carátula grande con la plataforma
 * arriba y, abajo, título, barra y lo que falta. La carátula vuela a la Ficha
 * al abrirla (misma clave de transición que la Biblioteca).
 */
@OptIn(androidx.compose.animation.ExperimentalSharedTransitionApi::class)
@Composable
fun TarjetaSigueJugando(
    game: GameProgress,
    onClick: () -> Unit,
    sharedTransitionScope: androidx.compose.animation.SharedTransitionScope? = null,
    animatedVisibilityScope: androidx.compose.animation.AnimatedVisibilityScope? = null,
) {
    val faltan = (game.totalTrophies - game.earnedTrophies).coerceAtLeast(0)
    Box(
        Modifier.width(232.dp).height(296.dp).clip(RoundedCornerShape(radio(22))).background(Surface2)
            .premiumClickable(onClick = onClick),
    ) {
        val portada = Modifier.fillMaxSize().let { base ->
            if (sharedTransitionScope != null && animatedVisibilityScope != null) {
                with(sharedTransitionScope) {
                    base.sharedElement(rememberSharedContentState(key = "game-cover-${game.id}"), animatedVisibilityScope = animatedVisibilityScope)
                }
            } else base
        }
        GameCover(coverUrl = game.coverUrl, title = game.title, modifier = portada)
        Column(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Background.copy(alpha = 0.86f)).padding(horizontal = 16.dp, vertical = 14.dp),
        ) {
            Text(game.title, color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Box(Modifier.padding(top = 8.dp).fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(Border)) {
                Box(Modifier.fillMaxWidth(game.percent.coerceIn(0, 100) / 100f).height(6.dp).background(Accent))
            }
            Text(
                if (faltan == 0) "${game.percent}%" else Textos.t(T.biblio_pct_restantes, game.percent, faltan),
                color = Muted,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                modifier = Modifier.padding(top = 6.dp),
            )
        }
    }
}
