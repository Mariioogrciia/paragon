package com.paragon.app.ui.panel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GameProgress
import com.paragon.app.ui.theme.*

/**
 * `coverUrl` sale de `iconUrl` del backend, y puede venir vacío para
 * muchos juegos (dato todavía sin sincronizar, o la plataforma no lo da)
 * — la web ya lo trata así, con un degradado de respaldo en vez de una
 * imagen rota (ver LibraryGrid.tsx). Antes esto se pasaba tal cual a
 * `AsyncImage`, que con un modelo vacío no pinta nada — de ahí las
 * carátulas en blanco reportadas el 16/09.
 */
@Composable
private fun GameCover(coverUrl: String, title: String, modifier: Modifier) {
    if (coverUrl.isNotBlank()) {
        AsyncImage(
            model = coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier,
        )
    } else {
        Box(
            modifier = modifier.background(Brush.linearGradient(colors = listOf(Surface2, Surface))),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = title.take(1).uppercase(),
                color = Muted,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
fun HeroGameCard(game: GameProgress, onClick: () -> Unit = {}) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(240.dp)
            .clip(RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .clickable { onClick() }
    ) {
        // Imagen de fondo con opacidad — sin degradado de respaldo aquí:
        // con coverUrl vacío simplemente no hay capa de fondo, el Box ya
        // tiene el gradiente oscuro de abajo encima.
        if (game.coverUrl.isNotBlank()) {
            AsyncImage(
                model = game.coverUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                alpha = 0.3f
            )
        }

        // Gradiente oscuro
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Background)
                    )
                )
        )

        // Contenido
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            // Portada pequeña
            GameCover(
                coverUrl = game.coverUrl,
                title = game.title,
                modifier = Modifier
                    .width(100.dp)
                    .height(140.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, Border, RoundedCornerShape(12.dp))
            )

            Spacer(modifier = Modifier.width(20.dp))

            Column {
                Text(
                    text = "SIGUIENTE PLATINO",
                    color = Accent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    modifier = Modifier
                        .background(AccentSoft, RoundedCornerShape(12.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                )

                Text(
                    text = game.title,
                    color = Foreground,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp, bottom = 12.dp)
                )

                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = (game.totalTrophies - game.earnedTrophies).toString(),
                        color = Platinum,
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = " trofeos\n restantes",
                        color = Muted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 6.dp, start = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // ProgressBar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .background(Surface2, RoundedCornerShape(4.dp))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(game.percent / 100f)
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(4.dp))
                    )
                }
            }
        }
    }
}

@Composable
fun StandardGameCard(game: GameProgress, onClick: () -> Unit = {}) {
    Box(
        modifier = Modifier
            .width(180.dp)
            .height(260.dp)
            .clip(RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .background(Surface)
            .clickable { onClick() }
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                GameCover(
                    coverUrl = game.coverUrl,
                    title = game.title,
                    modifier = Modifier.fillMaxSize(),
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Background)
                            )
                        )
                )
                Text(
                    text = game.title,
                    color = Foreground,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(16.dp)
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${game.percent}%",
                        color = Accent,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${game.earnedTrophies}/${game.totalTrophies}",
                        color = Muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(5.dp)
                        .background(Surface2, RoundedCornerShape(2.5.dp))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(game.percent / 100f)
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(2.5.dp))
                    )
                }
            }
        }
    }
}
