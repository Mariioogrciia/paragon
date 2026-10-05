package com.paragon.app.ui.panel

import com.paragon.app.data.ahoraMillis

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Bronze
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Gold
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Platinum
import com.paragon.app.ui.theme.Silver
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio

/** 4312 → "4.312" / "4,312" según el idioma del teléfono. */
fun cifra(n: Int): String = com.paragon.app.util.cifra(n)

/**
 * Resumen del Panel (4 oct 2026): una sola pieza en vez de la rejilla de
 * cuatro cifras iguales + la fila de metales aparte. Los platinos mandan
 * (es la cifra que persigue un cazador); trofeos, juegos y completado van
 * de apoyo a su lado, y el desglose por metal debajo, con su nombre (antes
 * eran círculos de color sin texto, mudos para TalkBack).
 *
 * Conserva el huevo de pascua de la tarjeta de platinos: 5 toques seguidos.
 */
@Composable
fun ResumenCard(
    platinos: Int,
    trofeos: Int,
    juegos: Int,
    completado: Int,
    oro: Int,
    plata: Int,
    bronce: Int,
    onEasterEgg: () -> Unit,
) {
    var toques by remember { mutableIntStateOf(0) }
    var ultimo by remember { mutableLongStateOf(0L) }
    val haptic = LocalHapticFeedback.current
    val forma = RoundedCornerShape(radio(20))
    val etiquetaPlatinos = Textos.t(T.panel_platinos)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(Surface2, Surface)), forma)
            .border(1.dp, Border, forma)
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) {
                        val ahora = ahoraMillis()
                        toques = if (ahora - ultimo > 1000) 1 else toques + 1
                        ultimo = ahora
                        if (toques >= 5) {
                            toques = 0
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onEasterEgg()
                        }
                    }
                    .clearAndSetSemantics { contentDescription = "$etiquetaPlatinos: ${cifra(platinos)}" },
            ) {
                Text(etiquetaPlatinos, color = Platinum, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                Text(cifra(platinos), color = Foreground, fontSize = 52.sp, fontWeight = FontWeight.Bold, lineHeight = 54.sp)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                CifraApoyo(Textos.t(T.comun_trofeos), cifra(trofeos))
                CifraApoyo(Textos.t(T.comun_juegos), cifra(juegos))
                CifraApoyo(Textos.t(T.panel_completado), "$completado %")
            }
        }
        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Metal(Textos.t(T.grado_oro), oro, Gold)
            Metal(Textos.t(T.grado_plata), plata, Silver)
            Metal(Textos.t(T.grado_bronce), bronce, Bronze)
        }
    }
}

@Composable
private fun CifraApoyo(etiqueta: String, valor: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.clearAndSetSemantics { contentDescription = "$etiqueta: $valor" },
    ) {
        Text(etiqueta, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(end = 8.dp))
        Text(valor, color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
    }
}

@Composable
private fun Metal(nombre: String, n: Int, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.clearAndSetSemantics { contentDescription = "$nombre: ${cifra(n)}" },
    ) {
        Box(Modifier.size(10.dp).background(color, CircleShape))
        Text(cifra(n), color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 6.dp))
        Text(nombre, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp))
    }
}
