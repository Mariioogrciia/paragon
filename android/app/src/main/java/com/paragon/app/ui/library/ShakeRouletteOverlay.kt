package com.paragon.app.ui.library

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.LibraryGame
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlin.random.Random

/**
 * "Agitar para jugar" (idea de Antigravity): al agitar el móvil en la
 * Biblioteca (ver `rememberShakeListener`), esta ruleta va enseñando
 * portadas al azar cada vez más despacio hasta pararse en un juego de
 * verdad de los que están al 0% — mismo criterio de "backlog" que usa el
 * resto de la app (`platinosAlAlcance` en el backend), aquí sin exigir
 * los 2 meses sin tocarlo porque el gesto ya es una elección deliberada.
 */
@Composable
fun ShakeRouletteOverlay(
    candidates: List<LibraryGame>,
    onDismiss: () -> Unit,
    onOpenGame: (String) -> Unit,
) {
    val chosen = remember { candidates.random() }
    var shown by remember { mutableStateOf(chosen) }
    var spinning by remember { mutableStateOf(true) }
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(Unit) {
        val pasos = 14
        repeat(pasos) { i ->
            shown = candidates.random()
            delay(70L + i * 14L) // se frena poco a poco, como una ruleta real
        }
        shown = chosen
        spinning = false
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.75f))
            .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) {
                if (!spinning) onDismiss()
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .padding(32.dp)
                .background(Surface, RoundedCornerShape(24.dp))
                .border(1.dp, Border, RoundedCornerShape(24.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(text = "¿A QUÉ JUGAMOS?", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
            Spacer(Modifier.height(16.dp))

            if (shown.coverUrl.isNotBlank()) {
                AsyncImage(
                    model = shown.coverUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(140.dp).clip(RoundedCornerShape(16.dp)),
                )
            } else {
                Box(
                    modifier = Modifier.size(140.dp).background(AccentSoft, RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(text = shown.title.take(1).uppercase(), color = Accent, fontSize = 40.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(16.dp))
            Text(text = shown.title, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Spacer(Modifier.height(20.dp))

            if (!spinning) {
                Button(
                    onClick = { onOpenGame(chosen.id) },
                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Empezarlo", fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = onDismiss) { Text("Cerrar", color = Muted) }
            }
        }
    }
}
