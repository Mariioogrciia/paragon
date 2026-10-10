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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.Gold
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
internal fun TrofeoMesDto.aTrophyItem() = TrophyItem(
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
internal fun mover(mes: String, delta: Int): String {
    val (a, m) = mes.split("-").map { it.toInt() }
    val total = a * 12 + (m - 1) + delta
    return "${total / 12}-${(total % 12 + 1).toString().padStart(2, '0')}"
}

internal fun nombreMes(mes: String): String =
    isoAMillis("$mes-15T12:00:00.000Z")?.let { fechaConPatron(it, "MMMMy") }?.replaceFirstChar { it.uppercase() } ?: mes

internal fun nombreDia(dia: String): String =
    isoAMillis("${dia}T12:00:00.000Z")?.let { fechaConPatron(it, "EEEEdMMMM") } ?: dia

@Composable
fun RitmoScreen(tokenStore: TokenStore, onBack: () -> Unit, onAbrirTrofeo: (gameId: String, trophyId: String) -> Unit = { _, _ -> }) {
    var mes by remember { mutableStateOf<String?>(null) }
    var datos by remember { mutableStateOf<MesResponse?>(null) }
    var error by remember { mutableStateOf(false) }
    var dia by remember { mutableStateOf<String?>(null) }
    var recarga by remember { mutableStateOf(0) }
    // Comparar con un amigo (7 oct 2026): su mes al lado del tuyo.
    var amigos by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) } // handle, nombre
    var con by remember { mutableStateOf<String?>(null) }
    var datosAmigo by remember { mutableStateOf<MesResponse?>(null) }
    LaunchedEffect(Unit) {
        amigos = try {
            ApiClient.socialApi(tokenStore).getSocial().amigos.mapNotNull { a -> a.handle?.let { it to (a.name ?: it) } }
        } catch (e: Exception) { emptyList() }
    }
    LaunchedEffect(mes, con) {
        val h = con
        val m = mes
        datosAmigo = if (h == null || m == null) null else try { ApiClient.statsApi(tokenStore).getMes(m, h) } catch (e: Exception) { null }
    }

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
            if (amigos.isNotEmpty()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(Textos.t(T.ritmo_comparar_con), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(end = 10.dp))
                    com.paragon.app.ui.common.Selector(
                        valor = con ?: "",
                        opciones = listOf(com.paragon.app.ui.common.OpcionSelector("", Textos.t(T.ritmo_sin_comparar))) +
                            amigos.map { (h, n) -> com.paragon.app.ui.common.OpcionSelector(h, n, detalle = "@$h") },
                        onElegir = { con = it.ifEmpty { null } },
                        buscable = amigos.size > 8,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        val d = datos
        when {
            error -> EmptyState(Icons.Default.CalendarMonth, Textos.t(T.error_conexion), "", Textos.t(T.comun_reintentar), { recarga++ })
            d == null -> EsqueletoLista()
            d.trofeos.isEmpty() && datosAmigo == null -> EmptyState(Icons.Default.CalendarMonth, Textos.t(T.ritmo_vacio_titulo), Textos.t(T.ritmo_vacio_texto))
            else -> {
                val filtrados = remember(d, dia) { d.trofeos.filter { dia == null || it.earnedAt.startsWith(dia!!) } }
                val porDia = remember(filtrados) { filtrados.groupBy { it.earnedAt.take(10) }.toList() }
                val vista = vistaTrofeosActual
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 32.dp + com.paragon.app.ui.common.huecoBarra())) {
                    datosAmigo?.let { otro ->
                        item {
                            ComparacionMes(d, otro, amigos.firstOrNull { it.first == con }?.second ?: con.orEmpty())
                            Spacer(Modifier.height(14.dp))
                        }
                    }
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
                                        onClick = { t -> fila.firstOrNull { "${it.gameId}:${it.trophyId}" == t.id }?.let { onAbrirTrofeo(it.gameId, it.trophyId) } },
                                    )
                                }
                            } else {
                                items(lista, key = { "${it.gameId}:${it.trophyId}" }) { t ->
                                    FilaTrofeo(t.aTrophyItem(), t.juego, Modifier.padding(vertical = 4.dp), onClick = { onAbrirTrofeo(t.gameId, t.trophyId) })
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

/** Días del mes "YYYY-MM" (28-31). */
private fun diasDelMes(mes: String): Int {
    val anio = mes.take(4).toIntOrNull() ?: return 31
    return when (mes.drop(5).take(2).toIntOrNull()) {
        2 -> if (anio % 4 == 0 && (anio % 100 != 0 || anio % 400 == 0)) 29 else 28
        4, 6, 9, 11 -> 30
        else -> 31
    }
}

/**
 * Tu mes contra el de un amigo: quién gana, trofeos, días activos y mejor día
 * lado a lado (tú en el acento, tu amigo en oro), y el día a día con las dos
 * barras juntas. Igual que en la web (/ritmo?con=).
 */
@Composable
private fun ComparacionMes(yo: MesResponse, otro: MesResponse, nombreOtro: String) {
    fun resumen(d: MesResponse) = Triple(d.total, d.porDia.count { it.total > 0 }, d.porDia.maxOfOrNull { it.total } ?: 0)
    val a = resumen(yo)
    val b = resumen(otro)
    val n = diasDelMes(yo.mes)
    fun delDia(d: MesResponse): List<Int> {
        val m = d.porDia.associate { (it.dia.drop(8).take(2).toIntOrNull() ?: 0) to it.total }
        return (1..n).map { m[it] ?: 0 }
    }
    val mios = delDia(yo)
    val suyos = delDia(otro)
    val maximo = (mios + suyos).maxOrNull()?.coerceAtLeast(1) ?: 1
    val veredicto = when {
        a.first == b.first -> Textos.t(T.ritmo_empate)
        a.first > b.first -> Textos.t(T.ritmo_ganas_tu)
        else -> Textos.t(T.ritmo_gana_otro, nombreOtro)
    }
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(18))).background(Surface).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                Textos.t(T.ritmo_tu_vs, nombreOtro),
                color = Foreground,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Text(
                veredicto,
                color = Foreground,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                modifier = Modifier.padding(start = 8.dp).clip(RoundedCornerShape(50)).background(Surface2).padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
        Spacer(Modifier.height(12.dp))
        FilaComparacion(Textos.t(T.ritmo_n_trofeos_corto), a.first, b.first)
        FilaComparacion(Textos.t(T.stats_dias_activos), a.second, b.second)
        FilaComparacion(Textos.t(T.ritmo_mejor_dia), a.third, b.third)
        Row(Modifier.fillMaxWidth().height(80.dp).padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.Bottom) {
            mios.forEachIndexed { i, x ->
                val y = suyos[i]
                Row(Modifier.weight(1f).fillMaxHeight(), horizontalArrangement = Arrangement.spacedBy(1.dp), verticalAlignment = Alignment.Bottom) {
                    Box(Modifier.weight(1f).fillMaxHeight(if (x == 0) 0.02f else (x.toFloat() / maximo).coerceAtLeast(0.05f)).clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp)).background(if (x == 0) Border else Accent))
                    Box(Modifier.weight(1f).fillMaxHeight(if (y == 0) 0.02f else (y.toFloat() / maximo).coerceAtLeast(0.05f)).clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp)).background(if (y == 0) Border else Gold))
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(10.dp).clip(RoundedCornerShape(2.dp)).background(Accent))
            Text(Textos.t(T.ritmo_tu), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(start = 4.dp, end = 12.dp))
            Box(Modifier.size(10.dp).clip(RoundedCornerShape(2.dp)).background(Gold))
            Text(nombreOtro, color = Muted, fontSize = 11.sp, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, modifier = Modifier.padding(start = 4.dp).weight(1f))
            Text("1–$n", color = Muted, fontSize = 10.sp)
        }
    }
}

/** Una cifra tuya y la de tu amigo, con la que gana resaltada. */
@Composable
private fun FilaComparacion(etiqueta: String, yo: Int, otro: Int) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("$yo", color = if (yo >= otro) Accent else Muted, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(56.dp))
        Text(etiqueta, color = Muted, fontSize = 12.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        Text("$otro", color = if (otro >= yo) Gold else Muted, fontSize = 18.sp, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.End, modifier = Modifier.width(56.dp))
    }
}
