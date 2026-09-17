package com.paragon.app.ui.share

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Platinum

/**
 * Tarjeta vertical (9:16, estilo Instagram/TikTok Stories) para el Platino
 * recién conseguido — idea #20 del brainstorm de v1.0, el motor de
 * adquisición: cada Platino compartido es publicidad gratis de Paragon.
 *
 * A propósito NO usa `rememberGraphicsLayer` aquí dentro — esta función solo
 * dibuja la tarjeta; quien la usa (`ShareTrophyDialog.kt`) es responsable de
 * capturarla a bitmap, así esta pieza se puede reutilizar también solo como
 * preview visual sin capturar nada.
 */
@Composable
fun TrophyShareCard(
    coverUrl: String,
    gameTitle: String,
    earnedTrophies: Int,
    totalTrophies: Int,
    handle: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .aspectRatio(9f / 16f)
            .clip(RoundedCornerShape(28.dp))
            .background(Background)
    ) {
        if (coverUrl.isNotBlank()) {
            AsyncImage(
                model = coverUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                alpha = 0.5f,
            )
        }
        // Degradado de abajo a arriba — la mitad inferior (donde va el
        // texto) necesita quedar legible sobre cualquier carátula, clara u
        // oscura; la mitad superior se deja respirar con la carátula visible.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Background, Background),
                    )
                )
        )

        Column(
            modifier = Modifier.fillMaxSize().padding(28.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = "PARAGON",
                color = Foreground,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 3.sp,
            )

            Column {
                Text(
                    text = "PLATINO",
                    color = Platinum,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    modifier = Modifier
                        .background(AccentSoft, RoundedCornerShape(12.dp))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                )
                Text(
                    text = gameTitle,
                    color = Foreground,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 12.dp, bottom = 6.dp),
                )
                Text(
                    text = "$earnedTrophies/$totalTrophies trofeos conseguidos",
                    color = Muted,
                    fontSize = 14.sp,
                )
                Text(
                    text = "@$handle en Paragon",
                    color = Accent,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 18.dp),
                )
            }
        }
    }
}
