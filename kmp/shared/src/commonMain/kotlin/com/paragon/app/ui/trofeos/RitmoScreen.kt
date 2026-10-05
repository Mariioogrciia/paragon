package com.paragon.app.ui.trofeos

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CalendarMonth
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.TrophyGrade
import com.paragon.app.data.TrophyItem
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.isoAMillis
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.EmptyState
import com.paragon.app.ui.common.EsqueletoLista
import com.paragon.app.ui.game.TrophyRarityChart
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.radio
import com.paragon.app.util.fechaConPatron
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.MesResponse
import com.paragon.shared.red.TrofeoMesDto

/**
 * "Mes a mes": el desglose de un mes como /ritmo en la web (5 oct 2026) —
 * barras por día (tocar una filtra ese día) y los trofeos con las mismas
 * vistas que la ficha de un juego, agrupados por día.
 */

private fun grado(g: String?): TrophyGrade? = when (g) {
    "bronze" -> TrophyGrade.BRONZE
    "silver" -> TrophyGrade.SILVER
    "gold" -> TrophyGrade.GOLD
    "platinum" -> TrophyGrade.PLATINUM
    else -> null
}

/** Con el id compuesto: el id de un trofeo solo es único dentro de su juego. */
private fun TrofeoMesDto.aTrophyItem() = TrophyItem(
    id = "$gameId:$trophyId",
    name = nombre,
    detail = detalle,
    grade = grado(grade),
    earned = true,
    earnedAt = earnedAt,
    rarityPercent = rarityPercent,
    iconUrl = iconUrl,
)

/** "2026-10" → "2026-09" / "2026-11". */
private fun mover(mes: String, delta: Int): String {
    val (a, m) = mes.split("-").map { it.toInt() }
    val total = a * 12 + (m - 1) + delta
    return "${total / 12}-${(total % 12 + 1).toString().padStart(2, '0')}"
}

private fun nombreMes(mes: String): String =
    isoAMillis("$mes-15T12:00:00.000Z")?.let { fechaConPatron(it, "MMMMy") }?.replaceFirstChar { it.uppercase() } ?: mes

private fun nombreDia(dia: String): String =
    isoAMillis("${dia}T12:00:00.000Z")?.let { fechaConPatron(it, "EEEEdMMMM") } ?: dia

@Composable
fun RitmoScreen(tokenStore: TokenStore, onBack: () -> Unit) {
    var mes by remember { mutableStateOf<String?>(null) }
    var datos by remember { mutableStateOf<MesResponse?>(null) }
    var error by remember { mutableStateOf(false) }
    var dia by remember { mutableStateOf<String?>(null) }
    var recarga by remember { mutableStateOf(0) }

    LaunchedEffect(mes, recarga) {
        // La primera carga (mes = null) ya trae el actual: no volver a pedirlo al fijar `mes`.
        if (mes != null && datos?.mes == mes) return@LaunchedEffect
        datos = null
        error = false
        dia = null
        try {
            val r = ApiClient.statsApi(tokenStore).getMes(mes)
            datos = r
            if (mes == null) mes = r.mes
        } catch (e: Exception) {
            error = true
        }
    }

    Column(Modifier.fillMaxSize().background(Background)) {
        com.paragon.app.ui.common.CabeceraNativa(titulo = Textos.t(T.ritmo_titulo), atras = Textos.t(T.nav_perfil), onBack = onBack)
        val actual = mes
        if (actual != null) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { mes = mover(actual, -1) }) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null, tint = Foreground) }
                Text(nombreMes(actual), color = Foreground, fontSize = 17.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                IconButton(onClick = { mes = mover(actual, 1) }) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Foreground) }
            }
        }

        val d = datos
        when {
            error -> EmptyState(Icons.Default.CalendarMonth, Textos.t(T.error_conexion), "", Textos.t(T.comun_reintentar), { recarga++ })
            d == null -> EsqueletoLista()
            d.trofeos.isEmpty() -> EmptyState(Icons.Default.CalendarMonth, Textos.t(T.ritmo_vacio_titulo), Textos.t(T.ritmo_vacio_texto))
            else -> {
                val filtrados = remember(d, dia) { d.trofeos.filter { dia == null || it.earnedAt.startsWith(dia!!) } }
                val porDia = remember(filtrados) { filtrados.groupBy { it.earnedAt.take(10) }.toList() }
                val vista = vistaTrofeosActual
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 32.dp)) {
                    item {
                        BarrasDias(d, dia) { dia = if (dia == it) null else it }
                    }
                    item {
                        Row(Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(Textos.t(T.ritmo_n_trofeos, filtrados.size), color = Muted, fontSize = 13.sp, modifier = Modifier.weight(1f))
                            SelectorVistaTrofeos()
                        }
                    }
                    when (vista) {
                        VistaTrofeos.CRONOLOGIA -> item {
                            TrophyRarityChart(trophies = filtrados.map { it.aTrophyItem() })
                        }
                        else -> porDia.forEach { (clave, lista) ->
                            item(key = "cab-$clave") { CabeceraGrupo(nombreDia(clave), lista.size) }
                            if (vista == VistaTrofeos.CUADRICULA) {
                                items(lista.chunked(4), key = { fila -> "f-${fila.first().gameId}:${fila.first().trophyId}" }) { fila ->
                                    FilaCuadricula(
                                        fila.map { it.aTrophyItem() },
                                        columnas = 4,
                                        juegoDe = { t -> fila.firstOrNull { "${it.gameId}:${it.trophyId}" == t.id }?.juego },
                                        modifier = Modifier.padding(vertical = 4.dp),
                                    )
                                }
                            } else {
                                items(lista, key = { "${it.gameId}:${it.trophyId}" }) { t ->
                                    FilaTrofeo(t.aTrophyItem(), t.juego, Modifier.padding(vertical = 4.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Una barra por día del mes; tocar una con trofeos filtra ese día. */
@Composable
private fun BarrasDias(d: MesResponse, elegido: String?, onDia: (String) -> Unit) {
    val maximo = (d.porDia.maxOfOrNull { it.total } ?: 0).coerceAtLeast(1)
    Column(
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(18)))
            .background(Surface)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(Textos.t(T.ritmo_dia_a_dia).uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (elegido != null) {
                Text(
                    Textos.t(T.ritmo_quitar_dia),
                    color = Accent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onDia(elegido) },
                )
            }
        }
        Row(Modifier.fillMaxWidth().height(80.dp).padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.Bottom) {
            d.porDia.forEach { p ->
                val activo = p.dia == elegido
                Box(
                    Modifier.weight(1f).fillMaxHeight()
                        .then(if (p.total > 0) Modifier.clickable { onDia(p.dia) } else Modifier),
                    contentAlignment = Alignment.BottomCenter,
                ) {
                    Box(
                        Modifier.fillMaxWidth()
                            .fillMaxHeight(if (p.total == 0) 0.03f else (p.total.toFloat() / maximo).coerceAtLeast(0.05f))
                            .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                            .background(
                                when {
                                    p.total == 0 -> Border
                                    activo -> Accent
                                    else -> Accent.copy(alpha = 0.55f)
                                },
                            ),
                    )
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Text("1", color = Muted, fontSize = 10.sp, modifier = Modifier.weight(1f))
            Text("${d.porDia.size}", color = Muted, fontSize = 10.sp)
        }
        Spacer(Modifier.height(2.dp))
    }
}
