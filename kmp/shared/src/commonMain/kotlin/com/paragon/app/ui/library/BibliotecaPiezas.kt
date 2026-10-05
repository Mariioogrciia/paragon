@file:OptIn(ExperimentalSharedTransitionApi::class)

package com.paragon.app.ui.library

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.LibraryGame
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.panel.GameCover
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.OnAccent
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/*
 * Piezas de la Biblioteca rediseñada (5 oct 2026, maqueta "2 · Biblioteca").
 * Solo colores y radios del tema.
 */

private val PLATAFORMA_CORTA = mapOf("psn" to "PS", "steam" to "Steam", "xbox" to "Xbox", "epic" to "Epic", "ubisoft" to "Ubisoft", "google" to "Play")

/** Buscador dentro de la pantalla (antes era la lupa de la barra de arriba). */
@Composable
fun BuscadorBiblioteca(valor: String, onCambio: (String) -> Unit, modifier: Modifier = Modifier) {
    val forma = RoundedCornerShape(radio(12))
    Row(
        modifier.fillMaxWidth().height(44.dp).clip(forma).background(Surface).border(1.dp, Border, forma).padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Default.Search, contentDescription = null, tint = Muted, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value = valor,
            onValueChange = onCambio,
            singleLine = true,
            textStyle = TextStyle(color = Foreground, fontSize = 15.sp),
            cursorBrush = SolidColor(Accent),
            modifier = Modifier.weight(1f),
            decorationBox = { campo ->
                Box {
                    if (valor.isEmpty()) Text(Textos.t(T.biblio_buscar), color = Muted, fontSize = 15.sp)
                    campo()
                }
            },
        )
        if (valor.isNotEmpty()) {
            Icon(
                Icons.Default.Close,
                contentDescription = Textos.t(T.main_cerrar_busqueda),
                tint = Muted,
                modifier = Modifier.size(20.dp).premiumClickable { onCambio("") },
            )
        }
    }
}

/** Filtro rápido en forma de pastilla; la elegida, en el acento con su número. */
@Composable
fun PastillaFiltro(texto: String, activa: Boolean, cuantos: Int?, onClick: () -> Unit) {
    val forma = RoundedCornerShape(50)
    Box(
        Modifier.height(32.dp).clip(forma)
            .background(if (activa) Accent else Surface)
            .then(if (activa) Modifier else Modifier.border(1.dp, Border, forma))
            .premiumClickable(onClick = onClick)
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (activa && cuantos != null) "$texto · $cuantos" else texto,
            color = if (activa) OnAccent else Foreground,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
        )
    }
}

/** La tarjeta de un juego: portada grande con la plataforma y la barra de progreso; debajo, título y cifras. */
@Composable
fun TarjetaBiblioteca(
    game: LibraryGame,
    onClick: () -> Unit,
    sharedTransitionScope: SharedTransitionScope?,
    animatedVisibilityScope: AnimatedVisibilityScope?,
) {
    val restantes = (game.definedTotal - game.earnedTotal).coerceAtLeast(0)
    Column(Modifier.fillMaxWidth().premiumClickable(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().height(196.dp).clip(RoundedCornerShape(radio(20))).background(Surface2)) {
            val portada = Modifier.fillMaxSize().let { base ->
                if (sharedTransitionScope != null && animatedVisibilityScope != null) {
                    with(sharedTransitionScope) {
                        base.sharedElement(rememberSharedContentState(key = "game-cover-${game.id}"), animatedVisibilityScope = animatedVisibilityScope)
                    }
                } else base
            }
            GameCover(coverUrl = game.coverUrl, title = game.title, modifier = portada)
            PLATAFORMA_CORTA[game.platform]?.let {
                Text(
                    it,
                    color = Foreground,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.align(Alignment.TopStart).padding(10.dp)
                        .clip(RoundedCornerShape(50)).background(Background.copy(alpha = 0.75f)).padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            if (game.isPlatinado) {
                Text(
                    "🏆",
                    fontSize = 13.sp,
                    modifier = Modifier.align(Alignment.TopEnd).padding(10.dp)
                        .clip(RoundedCornerShape(50)).background(Background.copy(alpha = 0.75f)).padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }
            Box(Modifier.align(Alignment.BottomStart).fillMaxWidth().height(6.dp).background(Background.copy(alpha = 0.6f))) {
                Box(Modifier.fillMaxWidth(game.progressPercent.coerceIn(0, 100) / 100f).height(6.dp).background(Accent))
            }
        }
        Text(
            game.title,
            color = Foreground,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 8.dp),
        )
        Text(
            if (restantes == 0) "${game.progressPercent}%" else Textos.t(T.biblio_pct_restantes, game.progressPercent, restantes),
            color = Muted,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
            maxLines = 1,
        )
    }
}
