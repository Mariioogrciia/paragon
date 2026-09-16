package com.paragon.app.ui.game

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.paragon.app.data.GameDetailData
import com.paragon.app.data.GameDetailRepository
import com.paragon.app.data.GameDetailResult
import com.paragon.app.data.TrophyGrade
import com.paragon.app.data.TrophyItem
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*

/**
 * Ficha de juego (plan sección 2.4) — cabecera hero con portada difuminada
 * de fondo, barra de progreso general y trofeos agrupados por rareza
 * (Platino > Oro > Plata > Bronce, mismo orden que la web). Datos reales
 * contra GET /api/mobile/games/{gameId} (GameDetailRepository).
 *
 * Ojo: Panel sigue mandando aquí los ids inventados de sus tarjetas mock
 * (recentGames/nearPlatinum) — hasta que esas dejen de ser mock, tocar una
 * tarjeta del Panel aterriza aquí en el estado de error (404 real del
 * backend, "este juego no existe"), no en un fallo de la pantalla.
 */
@Composable
fun GameDetailScreen(gameId: String, tokenStore: TokenStore, onBack: () -> Unit = {}) {
    val repository = remember(tokenStore) { GameDetailRepository(tokenStore) }
    var result by remember { mutableStateOf<GameDetailResult?>(null) }

    LaunchedEffect(gameId) {
        result = null
        result = repository.getGameDetail(gameId)
    }

    when (val current = result) {
        null -> Box(
            modifier = Modifier.fillMaxSize().background(Background),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = Accent)
        }
        is GameDetailResult.Error -> Box(
            modifier = Modifier.fillMaxSize().background(Background).padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = current.message, color = Foreground, fontSize = 14.sp)
                Button(
                    onClick = onBack,
                    modifier = Modifier.padding(top = 16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                ) {
                    Text("Volver")
                }
            }
        }
        is GameDetailResult.Ok -> GameDetailContent(current.detail, onBack)
    }
}

@Composable
private fun GameDetailContent(game: GameDetailData, onBack: () -> Unit) {
    LazyColumn(modifier = Modifier.fillMaxSize().background(Background)) {
        item { GameDetailHero(game, onBack) }

        val grouped = game.trophies.sortedWith(
            compareByDescending<TrophyItem> { it.grade?.ordinal ?: -1 }.thenBy { it.earned.not() }
        )

        items(grouped) { trophy ->
            TrophyRow(trophy, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
        }

        item { Spacer(Modifier.height(32.dp)) }
    }
}

@Composable
private fun GameDetailHero(game: GameDetailData, onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().height(320.dp)) {
        AsyncImage(
            model = game.coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
            alpha = 0.35f,
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(colors = listOf(Color.Transparent, Background)))
        )
        IconButton(onClick = onBack, modifier = Modifier.padding(12.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Foreground)
        }
        Row(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            AsyncImage(
                model = game.coverUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .width(96.dp)
                    .height(136.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Surface),
            )
            Spacer(Modifier.width(20.dp))
            Column {
                Text(
                    text = game.title,
                    color = Foreground,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "${game.earnedTrophies}/${game.totalTrophies} trofeos · ${game.percent}%",
                    color = Muted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 6.dp, bottom = 12.dp),
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .background(Surface2, RoundedCornerShape(4.dp)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(game.percent / 100f)
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(4.dp)),
                    )
                }
            }
        }
    }
}

@Composable
private fun TrophyRow(trophy: TrophyItem, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(gradeColor(trophy.grade).copy(alpha = if (trophy.earned) 1f else 0.25f), RoundedCornerShape(20.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (trophy.earned) {
                Icon(Icons.Default.Check, contentDescription = null, tint = Background)
            }
        }
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = trophy.name,
                color = if (trophy.earned) Foreground else Muted,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = trophy.detail,
                color = Muted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        trophy.rarityPercent?.let {
            Text(text = "${it}%", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
    }
}

private fun gradeColor(grade: TrophyGrade?): Color = when (grade) {
    TrophyGrade.PLATINUM -> Platinum
    TrophyGrade.GOLD -> Gold
    TrophyGrade.SILVER -> Silver
    TrophyGrade.BRONZE -> Bronze
    null -> Muted
}
