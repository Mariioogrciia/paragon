package com.paragon.app.ui.common

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * Cabecera de las pantallas que se abren encima de una pestaña (diseño v2,
 * 5 oct 2026, maqueta "Paragon app · propuestas v2"): arriba "‹ De dónde
 * vienes" en el acento, como en iPhone, y debajo el título grande. Sustituye
 * a la barra "PARAGON" de la web que salía encima de cada subpantalla y a las
 * flechas sueltas con títulos de distinto tamaño en cada sitio.
 *
 * `atras` es el nombre de la pantalla anterior ("Perfil", "Ajustes"...); sin
 * `onBack` no hay fila de volver (pestañas principales).
 *
 * `compacta` (9 nov 2026, como el título grande de iOS): al bajar, el título
 * grande y el subtítulo se recogen y el título pasa, pequeño y centrado, a la
 * fila de arriba. Antes el título grande se quedaba fijo y el contenido se
 * cortaba de golpe debajo de él ("@fende21" tapando la tarjeta).
 */
@Composable
fun CabeceraNativa(
    titulo: String,
    modifier: Modifier = Modifier,
    atras: String? = null,
    onBack: (() -> Unit)? = null,
    subtitulo: String? = null,
    acciones: @Composable RowScope.() -> Unit = {},
    compacta: Boolean = false,
) {
    Column(modifier.fillMaxWidth()) {
        if (onBack == null) {
            // Pestañas principales: al bajar, una fila fina con el título centrado.
            AnimatedVisibility(visible = compacta, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                Box(Modifier.fillMaxWidth().height(44.dp).padding(horizontal = 16.dp), contentAlignment = Alignment.Center) {
                    TituloPequeno(titulo)
                }
            }
        }
        if (onBack != null) {
            Box(Modifier.fillMaxWidth().height(44.dp), contentAlignment = Alignment.Center) {
            AnimatedVisibility(visible = compacta, enter = fadeIn(), exit = fadeOut()) {
                TituloPequeno(titulo, Modifier.padding(horizontal = 96.dp))
            }
            Row(
                Modifier.fillMaxWidth().height(44.dp).padding(start = 6.dp, end = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    Modifier.premiumClickable(onClick = onBack).padding(end = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = Textos.t(T.comun_atras),
                        tint = Accent,
                        modifier = Modifier.size(32.dp),
                    )
                    Text(
                        atras ?: Textos.t(T.comun_volver),
                        color = Accent,
                        fontSize = 17.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically, content = acciones)
            }
            }
        }
        AnimatedVisibility(visible = !compacta, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
        Column {
        Row(
            Modifier.fillMaxWidth().padding(start = 20.dp, end = 16.dp, top = if (onBack != null) 0.dp else 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                titulo,
                color = Foreground,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 36.sp,
                modifier = Modifier.weight(1f),
            )
            if (onBack == null) Row(verticalAlignment = Alignment.CenterVertically, content = acciones)
        }
        if (subtitulo != null) {
            Text(
                subtitulo,
                color = Muted,
                fontSize = 14.sp,
                lineHeight = 19.sp,
                modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp),
            )
        }
        }
        }
    }
}

/** ¿Ya se ha bajado lo bastante como para recoger la cabecera? Para `compacta`. */
@Composable
fun androidx.compose.foundation.ScrollState.recogida(): Boolean {
    val estado = this
    return androidx.compose.runtime.remember(estado) { androidx.compose.runtime.derivedStateOf { estado.value > 24 } }.value
}

@Composable
fun androidx.compose.foundation.lazy.LazyListState.recogida(): Boolean {
    val estado = this
    return androidx.compose.runtime.remember(estado) {
        androidx.compose.runtime.derivedStateOf { estado.firstVisibleItemIndex > 0 || estado.firstVisibleItemScrollOffset > 24 }
    }.value
}

@Composable
private fun TituloPequeno(titulo: String, modifier: Modifier = Modifier) {
    Text(titulo, color = Foreground, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = modifier)
}
