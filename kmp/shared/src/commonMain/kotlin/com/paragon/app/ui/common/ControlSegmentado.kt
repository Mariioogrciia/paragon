package com.paragon.app.ui.common

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.radio

/**
 * Selector de secciones de una pantalla, como el "segmented control" de
 * iPhone (diseño v2, 5 oct 2026): una cápsula con las opciones y la elegida
 * resaltada en el acento. Sustituye a las pestañas de Material con subrayado,
 * que hacían que la app pareciera una web. Vibra un poco al cambiar.
 */
@Composable
fun ControlSegmentado(
    opciones: List<String>,
    seleccion: Int,
    onCambio: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val haptic = LocalHapticFeedback.current
    val forma = RoundedCornerShape(radio(12))
    Row(
        modifier.fillMaxWidth().clip(forma).background(Surface).border(1.dp, Border, forma).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        opciones.forEachIndexed { i, texto ->
            val activa = seleccion == i
            val fondo by animateColorAsState(if (activa) AccentSoft else Color.Transparent)
            Box(
                Modifier.weight(1f).height(34.dp).clip(RoundedCornerShape(radio(9))).background(fondo)
                    .premiumClickable {
                        if (!activa) {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onCambio(i)
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    texto,
                    color = if (activa) Accent else Muted,
                    fontSize = if (opciones.size > 3) 13.sp else 14.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        }
    }
}
