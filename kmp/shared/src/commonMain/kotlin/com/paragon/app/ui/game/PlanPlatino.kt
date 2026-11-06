package com.paragon.app.ui.game

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.TrophyItem
import com.paragon.app.ui.common.AvatarPersona
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Texto
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.PlanPlatinoDto
import com.paragon.shared.red.PlatinoRapidoDto

private fun nombreFase(fase: String): Texto = when (fase) {
    "perdibles" -> T.plan_fase_perdibles
    "historia" -> T.plan_fase_historia
    "coleccionables" -> T.plan_fase_coleccionables
    "online" -> T.plan_fase_online
    "habilidad" -> T.plan_fase_habilidad
    "grindeo" -> T.plan_fase_grindeo
    else -> T.plan_fase_limpieza
}

private fun consejoFase(fase: String): Texto = when (fase) {
    "perdibles" -> T.plan_consejo_perdibles
    "historia" -> T.plan_consejo_historia
    "coleccionables" -> T.plan_consejo_coleccionables
    "online" -> T.plan_consejo_online
    "habilidad" -> T.plan_consejo_habilidad
    "grindeo" -> T.plan_consejo_grindeo
    else -> T.plan_consejo_limpieza
}

/** Cuántos trofeos pendientes se enseñan por fase antes del "y N más". */
private const val MAX_POR_FASE = 4

/**
 * Plan de platino (como PlanPlatino.tsx en la web, 6 nov 2026): lo que falta
 * por fases, primero lo que se puede perder. La fase que toca va abierta; el
 * resto se abre tocándola. Tocar un trofeo baja hasta él en la lista.
 */
@Composable
fun PlanPlatinoCard(plan: PlanPlatinoDto, trofeos: List<TrophyItem>, onTrofeo: (String) -> Unit, modifier: Modifier = Modifier) {
    val porId = remember(trofeos) { trofeos.associateBy { it.id } }
    var abierta by remember(plan.actual) { mutableStateOf(plan.actual) }
    Column(
        modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .padding(18.dp)
            .animateContentSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(Textos.t(T.plan_titulo).uppercase(), color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text(Textos.t(T.plan_faltan, plan.faltan), color = Platinum, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
        Text(Textos.t(T.plan_descripcion), color = Muted, fontSize = 13.sp, lineHeight = 18.sp)
        plan.fases.filter { it.total > 0 }.forEach { f ->
            val hecha = f.pendientes.isEmpty()
            val esActual = f.fase == plan.actual
            Column(
                Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(radio(12)))
                    .background(if (esActual) AccentSoft else Surface2)
                    .clickable(enabled = !hecha) { abierta = if (abierta == f.fase) null else f.fase }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        if (esActual) Text(Textos.t(T.plan_siguiente).uppercase(), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        Text(
                            Textos.t(nombreFase(f.fase)),
                            color = if (hecha) Muted else Foreground,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    Text("${f.conseguidos}/${f.total}", color = if (hecha) Good else Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    if (!hecha) Icon(
                        if (abierta == f.fase) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = Muted,
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
                // Barra de progreso de la fase.
                Box(Modifier.padding(top = 8.dp).fillMaxWidth().height(4.dp).clip(RoundedCornerShape(50)).background(Border)) {
                    Box(
                        Modifier.fillMaxWidth(if (f.total == 0) 0f else f.conseguidos.toFloat() / f.total)
                            .height(4.dp)
                            .background(if (hecha) Good else Accent),
                    )
                }
                if (abierta == f.fase && !hecha) {
                    Text(Textos.t(consejoFase(f.fase)), color = Muted, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 8.dp))
                    f.pendientes.take(MAX_POR_FASE).forEach { id ->
                        val t = porId[id] ?: return@forEach
                        Text(
                            "• ${t.name}",
                            color = Foreground,
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.fillMaxWidth().clickable { onTrofeo(id) }.padding(top = 6.dp),
                        )
                    }
                    if (f.pendientes.size > MAX_POR_FASE) {
                        Text(Textos.t(T.plan_y_mas, f.pendientes.size - MAX_POR_FASE), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }
    }
}

/** "2 d 4 h", "5 h 12 min", "40 min" (lib/platinoRapidoReglas.ts → duracionLegible). */
private fun duracionLegible(ms: Long): String {
    val minutos = (ms + 30_000) / 60_000
    val dias = minutos / 1440
    val horas = (minutos % 1440) / 60
    val min = minutos % 60
    return when {
        dias > 0 -> if (horas > 0) "$dias d $horas h" else "$dias d"
        horas > 0 -> if (min > 0) "$horas h $min min" else "$horas h"
        else -> "$min min"
    }
}

/** Platinos más rápidos del juego entre la gente de Paragon (PlatinosRapidos.tsx en la web). */
@Composable
fun PlatinosRapidosCard(rapidos: List<PlatinoRapidoDto>, onPersona: (String) -> Unit, modifier: Modifier = Modifier) {
    val medallas = listOf("🥇", "🥈", "🥉")
    Column(
        modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(Textos.t(T.rapidos_titulo).uppercase(), color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        Text(Textos.t(T.rapidos_descripcion), color = Muted, fontSize = 13.sp, lineHeight = 18.sp)
        rapidos.forEachIndexed { i, p ->
            Row(
                Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(radio(12)))
                    .clickable(enabled = p.handle != null) { p.handle?.let(onPersona) }
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(medallas.getOrNull(i) ?: "${i + 1}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Foreground, modifier = Modifier.width(30.dp))
                AvatarPersona(p.avatarUrl, p.nombre ?: p.handle ?: "?", size = 32.dp)
                Text(
                    p.nombre ?: p.handle?.let { "@$it" } ?: "—",
                    color = Foreground,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).padding(start = 10.dp),
                )
                Text(duracionLegible(p.duracionMs), color = Platinum, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
