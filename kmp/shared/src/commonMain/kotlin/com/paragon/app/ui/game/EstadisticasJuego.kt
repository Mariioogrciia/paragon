package com.paragon.app.ui.game

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.EstadisticaJuegoDto
import kotlinx.coroutines.CancellationException

/**
 * «Estadísticas del juego» de la ficha (9 nov 2026, como en la web): lo que
 * el juego de Steam guarda de ti, tipo tracker. Se pide aparte de la ficha;
 * si no hay nada (o falla), la tarjeta no sale.
 */
@Composable
fun EstadisticasJuegoCard(gameId: String, de: String?, tokenStore: TokenStore, acento: Color, modifier: Modifier = Modifier) {
    var lista by remember(gameId, de) { mutableStateOf<List<EstadisticaJuegoDto>>(emptyList()) }
    var todas by remember(gameId) { mutableStateOf(false) }
    LaunchedEffect(gameId, de) {
        lista = try {
            ApiClient.gamesApi(tokenStore).getEstadisticas(gameId, de).estadisticas
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            emptyList()
        }
    }
    if (lista.isEmpty()) return

    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Column {
            Text(Textos.t(T.estad_titulo).uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(Textos.t(T.estad_fuente), color = Muted, fontSize = 12.sp)
        }
        // Las seis primeras en baldosas de dos en dos, como un tracker.
        lista.take(6).chunked(2).forEach { fila ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                fila.forEach { e ->
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(radio(12))).background(Surface2).padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        Text(e.texto, color = acento, fontSize = 20.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                        Text(e.nombre, color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                if (fila.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        val resto = lista.drop(6)
        if (resto.isNotEmpty()) {
            if (todas) {
                resto.forEach { e ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(e.nombre, color = Muted, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        Text(e.texto, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            Text(
                if (todas) Textos.t(T.estad_ver_menos) else Textos.t(T.estad_ver_mas, resto.size),
                color = acento,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clickable { todas = !todas }.padding(vertical = 4.dp),
            )
        }
    }
}
