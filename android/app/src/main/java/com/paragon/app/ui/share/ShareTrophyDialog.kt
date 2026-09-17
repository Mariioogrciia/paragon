package com.paragon.app.ui.share

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.graphics.rememberGraphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.util.shareBitmapAsImage
import kotlinx.coroutines.launch

/**
 * Preview + captura de la tarjeta de Platino (ver `TrophyShareCard.kt`) para
 * compartir — abierta desde `GameDetailScreen.kt` cuando el juego ya tiene
 * el platino conseguido. `rememberGraphicsLayer` + `drawWithContent` es la
 * forma real de capturar un Composable a bitmap desde Compose 1.7+ (llegó
 * en el mismo BOM que ya subimos para las transiciones compartidas) — sin
 * esto habría hecho falta la vía antigua de `View.drawToBitmap`, mucho más
 * frágil con `AsyncImage`/Coil de por medio.
 */
@Composable
fun ShareTrophyDialog(
    coverUrl: String,
    gameTitle: String,
    earnedTrophies: Int,
    totalTrophies: Int,
    handle: String,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val graphicsLayer = rememberGraphicsLayer()

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .clip(RoundedCornerShape(24.dp))
                .background(Surface)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TrophyShareCard(
                coverUrl = coverUrl,
                gameTitle = gameTitle,
                earnedTrophies = earnedTrophies,
                totalTrophies = totalTrophies,
                handle = handle,
                modifier = Modifier
                    .width(260.dp)
                    .drawWithContent {
                        // Se graba el mismo dibujado que ya se ve en pantalla
                        // — nada especial "invisible", la tarjeta del diálogo
                        // ES la fuente de la imagen que se comparte.
                        graphicsLayer.record { this@drawWithContent.drawContent() }
                        drawLayer(graphicsLayer)
                    },
            )

            Spacer(Modifier.height(20.dp))

            Button(
                onClick = {
                    coroutineScope.launch {
                        val bitmap = graphicsLayer.toImageBitmap().asAndroidBitmap()
                        shareBitmapAsImage(context, bitmap)
                        onDismiss()
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Compartir")
            }

            TextButton(onClick = onDismiss, modifier = Modifier.padding(top = 4.dp)) {
                Text("Cerrar", color = Muted)
            }
        }
    }
}
