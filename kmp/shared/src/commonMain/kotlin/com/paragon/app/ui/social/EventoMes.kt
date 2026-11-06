package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.AvatarPersona
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.EventoDto
import com.paragon.shared.red.ParticipanteEventoDto
import kotlinx.coroutines.CancellationException

private fun genero(categoria: String): String = Textos.t(
    when (categoria) {
        "accion" -> T.evento_genero_accion
        "rpg" -> T.evento_genero_rpg
        "aventura" -> T.evento_genero_aventura
        "estrategia" -> T.evento_genero_estrategia
        "plataformas" -> T.evento_genero_plataformas
        "puzles" -> T.evento_genero_puzles
        else -> T.evento_genero_deportes
    },
)

private val MEDALLAS = listOf("🥇", "🥈", "🥉")

/**
 * Evento del mes (6 nov 2026, como /ligas/evento en la web): una tarjeta en
 * Ligas con el género, los días que quedan y tu puesto; al tocarla, el
 * ranking entero y el podio del mes anterior. Sin red no pinta nada.
 */
@Composable
fun EventoMesTarjeta(tokenStore: TokenStore, onAbrirPerfil: (String) -> Unit, modifier: Modifier = Modifier) {
    var evento by remember { mutableStateOf<EventoDto?>(null) }
    var abierto by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        evento = try {
            ApiClient.novedadesApi(tokenStore).evento()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
    }
    val e = evento ?: return
    val yo = e.ranking.indexOfFirst { it.soyYo }
    Column(
        modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(18)))
            .background(Brush.linearGradient(listOf(AccentSoft, Surface)))
            .border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(radio(18)))
            .clickable { abierto = true }
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(Textos.t(T.evento_tarjeta).uppercase(), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Text(Textos.t(T.evento_titulo, genero(e.categoria)), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(
            listOfNotNull(
                if (e.diasRestantes == 0) Textos.t(T.evento_termina_hoy) else Textos.t(T.evento_quedan, e.diasRestantes),
                if (yo >= 0) "${Textos.t(T.evento_tu)}: #${yo + 1} · ${Textos.t(T.evento_puntos, e.ranking[yo].puntos)}" else null,
            ).joinToString(" · "),
            color = Muted,
            fontSize = 13.sp,
        )
    }
    if (abierto) EventoMesSheet(e, onAbrirPerfil = { abierto = false; onAbrirPerfil(it) }, onDismiss = { abierto = false })
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EventoMesSheet(e: EventoDto, onAbrirPerfil: (String) -> Unit, onDismiss: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = SurfaceSolida) {
        LazyColumn(
            Modifier.fillMaxWidth().heightIn(max = 640.dp).padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Column(Modifier.padding(bottom = 8.dp)) {
                    Text(Textos.t(T.evento_titulo, genero(e.categoria)), color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text(Textos.t(T.evento_descripcion, genero(e.categoria)), color = Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
            if (e.ranking.isEmpty()) {
                item { Text(Textos.t(T.evento_vacio), color = Muted, fontSize = 14.sp, modifier = Modifier.padding(vertical = 12.dp)) }
            }
            itemsIndexed(e.ranking, key = { i, p -> "r$i-${p.handle}" }) { i, p -> FilaEvento(i, p, onAbrirPerfil) }
            if (e.anterior.podio.isNotEmpty()) {
                item {
                    Text(
                        Textos.t(T.evento_anterior, genero(e.anterior.categoria), e.anterior.mes),
                        color = Foreground,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 16.dp, bottom = 4.dp),
                    )
                }
                itemsIndexed(e.anterior.podio, key = { i, p -> "a$i-${p.handle}" }) { i, p -> FilaEvento(i, p, onAbrirPerfil) }
            }
            item { Text(Textos.t(T.evento_reglas), color = Muted, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 16.dp, bottom = 32.dp)) }
        }
    }
}

@Composable
private fun FilaEvento(i: Int, p: ParticipanteEventoDto, onAbrirPerfil: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(14)))
            .background(if (p.soyYo) AccentSoft else Surface)
            .border(1.dp, if (p.soyYo) Accent.copy(alpha = 0.4f) else Border, RoundedCornerShape(radio(14)))
            .clickable(enabled = p.handle != null) { p.handle?.let(onAbrirPerfil) }
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(MEDALLAS.getOrNull(i) ?: "${i + 1}", color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(32.dp))
        AvatarPersona(p.imagen, p.nombre ?: p.handle ?: "?", size = 34.dp)
        Column(Modifier.weight(1f).padding(start = 10.dp)) {
            Text(p.nombre ?: p.handle?.let { "@$it" } ?: "—", color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(Textos.t(T.evento_detalle, p.trofeos, p.platinos), color = Muted, fontSize = 12.sp)
        }
        Text(Textos.t(T.evento_puntos, p.puntos), color = Platinum, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}
