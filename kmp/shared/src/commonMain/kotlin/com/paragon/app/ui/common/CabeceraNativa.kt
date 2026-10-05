package com.paragon.app.ui.common

import androidx.compose.foundation.layout.Arrangement
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
 */
@Composable
fun CabeceraNativa(
    titulo: String,
    modifier: Modifier = Modifier,
    atras: String? = null,
    onBack: (() -> Unit)? = null,
    subtitulo: String? = null,
    acciones: @Composable RowScope.() -> Unit = {},
) {
    Column(modifier.fillMaxWidth()) {
        if (onBack != null) {
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
