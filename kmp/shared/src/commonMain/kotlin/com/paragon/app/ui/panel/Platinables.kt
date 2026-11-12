package com.paragon.app.ui.panel

import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.draw.alpha
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.ui.common.GrupoNativo
import com.paragon.app.ui.common.SeparadorFila
import com.paragon.app.ui.settings.nombreConsola
import com.paragon.app.ui.theme.*
import com.paragon.app.util.numeroLocal
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.DoblePlatinoDto
import com.paragon.shared.red.PlatinableDto
import com.paragon.shared.red.PlatinablesDto

private const val VISIBLES = 5

/** Una fila de cualquiera de las cuatro listas, ya con sus textos. */
private data class Fila(
    val id: String,
    val titulo: String,
    val cover: String,
    val percent: Int,
    val linea: String,
    val avisos: List<String>,
    val amigos: String?,
    val dispositivos: List<String>,
    val horas: Int?,
    val instalado: Boolean,
    val suscripcion: Boolean,
    val ocultable: Boolean,
    /** En «Mis cazas» (12 nov 2026). */
    val caza: Boolean = false,
)

private fun fila(p: PlatinableDto): Fila {
    val faltan = when {
        p.sinEmpezar -> Textos.t(T.plat_sin_empezar, p.faltan)
        p.tienePlatino -> Textos.t(T.plat_faltan, p.faltan)
        else -> Textos.t(T.plat_faltan_cien, p.faltan)
    }
    val extras = listOfNotNull(
        p.diasDesdeJugado?.takeIf { it <= 365 && !p.sinEmpezar }?.let {
            when (it) {
                0 -> Textos.t(T.plat_hoy)
                1 -> Textos.t(T.plat_ayer)
                else -> Textos.t(T.plat_hace, it)
            }
        },
        p.horasRestantes?.takeIf { it > 0 }?.let { Textos.t(T.plat_horas, it) },
        p.rarezaPlatino?.takeIf { p.sinEmpezar }?.let { Textos.t(T.plat_rareza_platino, numeroLocal(it, 1)) },
    )
    val avisos = buildList {
        if (p.perdibles > 0) add(Textos.t(T.plat_perdibles, p.perdibles))
        p.masRaroPendiente?.takeIf { it < 2 }?.let { add(Textos.t(T.plat_dificil, numeroLocal(it, 1))) }
        when (p.suscripcion) {
            "ps_plus" -> add("PS Plus")
            "game_pass" -> add("Game Pass")
        }
        if (p.instalado) add(Textos.t(T.plat_instalado))
    }
    return Fila(
        id = p.id,
        titulo = p.title,
        cover = p.coverUrl,
        percent = p.percent,
        linea = (listOf(faltan) + extras).joinToString(" · "),
        avisos = avisos,
        amigos = p.amigos.takeIf { it.isNotEmpty() }?.let { a -> Textos.t(T.plat_amigos, a.joinToString(", ") { "${it.nombre ?: "?"} (${it.percent} %)" }) },
        dispositivos = p.dispositivos,
        horas = p.horasRestantes,
        instalado = p.instalado,
        suscripcion = p.suscripcion != null,
        ocultable = true,
        caza = p.caza,
    )
}

private fun fila(d: DoblePlatinoDto) = Fila(
    id = d.id,
    titulo = d.titulo,
    cover = d.coverUrl,
    percent = d.laTienes ?: 0,
    linea = listOf(
        if (d.laTienes != null) Textos.t(T.plat_doble_la_tienes, nombreConsola(d.consola)) else Textos.t(T.plat_doble_otra, nombreConsola(d.consola)),
        Textos.t(T.plat_doble_ya, nombreConsola(d.platinadoEn)),
    ).joinToString(" · "),
    avisos = emptyList(),
    amigos = null,
    dispositivos = listOf(d.consola.uppercase()),
    horas = null,
    instalado = false,
    suscripcion = false,
    ocultable = false,
)

/**
 * «A un paso del platino» en el Panel (como la web): lo más cerca, lo que
 * juegas ahora, fáciles sin empezar y doble platino, con filtros por
 * consola, horas, instalado y suscripción, avisos (perdibles, lo que falta
 * es rarísimo…) y amigos a medias. La × es «ya no lo tengo».
 */
@Composable
fun SeccionPlatinables(
    datos: PlatinablesDto,
    onAbrir: (String) -> Unit,
    onVerTodo: () -> Unit,
    onRetirar: (String) -> Unit = {},
    onRetirarConsola: (String) -> Unit = {},
    /** 🎯 de cada fila (12 nov 2026): añadir o quitar de «Mis cazas». Devuelve si se pudo. */
    onCaza: suspend (String, Boolean) -> Boolean = { _, _ -> true },
) {
    var quitados by remember { mutableStateOf(emptySet<String>()) }
    var cazas by remember(datos) { mutableStateOf((datos.cerca + datos.jugando + datos.faciles).filter { it.caza }.map { it.id }.toSet()) }
    var cazaLlena by remember { mutableStateOf(false) }
    val ambito = rememberCoroutineScope()
    fun alternarCaza(id: String) {
        val nueva = id !in cazas
        cazaLlena = false
        cazas = if (nueva) cazas + id else cazas - id
        ambito.launch {
            if (!onCaza(id, nueva) && nueva) {
                cazas = cazas - id
                cazaLlena = true
            }
        }
    }
    var sugerencia by remember(datos) { mutableStateOf(datos.sugerenciaRetirar) }
    val listas = listOf(
        T.plat_cerca to datos.cerca.map(::fila),
        T.plat_jugando to datos.jugando.map(::fila),
        T.plat_faciles to datos.faciles.map(::fila),
        T.plat_dobles to datos.dobles.map(::fila),
    ).map { (t, l) -> t to l.filter { it.id !in quitados } }.filter { it.second.isNotEmpty() || it.first == T.plat_cerca }
    if (listas.all { it.second.isEmpty() }) return
    var pestanaElegida by remember { mutableStateOf(0) }
    val pestana = pestanaElegida.coerceIn(0, listas.lastIndex)
    var todos by remember { mutableStateOf(false) }
    var consola by remember { mutableStateOf<String?>(null) }
    var filtro by remember { mutableStateOf<String?>(null) }

    val base = listas[pestana].second
    val consolas = listas.flatMap { it.second }.flatMap { it.dispositivos }.distinct()
    val lista = base.filter {
        (consola == null || consola in it.dispositivos) &&
            (filtro != "corto" || (it.horas != null && it.horas <= 5)) &&
            (filtro != "instalados" || it.instalado) &&
            (filtro != "suscripcion" || it.suscripcion)
    }

    TituloSeccion(Textos.t(T.plat_titulo), Textos.t(T.inicio_ver_todo)) { onVerTodo() }
    Column(Modifier.padding(horizontal = 20.dp).animateContentSize()) {
        sugerencia?.let { s ->
            Column(
                Modifier.fillMaxWidth().padding(bottom = 10.dp)
                    .clip(RoundedCornerShape(radio(14)))
                    .background(AccentSoft)
                    .border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(radio(14)))
                    .padding(start = 14.dp, end = 6.dp, top = 10.dp, bottom = 2.dp),
            ) {
                Text(Textos.t(T.plat_retirar_pregunta, s.anios, nombreConsola(s.dispositivo)), color = Foreground, fontSize = 13.sp, lineHeight = 18.sp)
                Row {
                    TextButton(onClick = { onRetirarConsola(s.dispositivo); sugerencia = null }) {
                        Text(Textos.t(T.plat_retirar_si), color = Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    TextButton(onClick = { sugerencia = null }) {
                        Text(Textos.t(T.plat_retirar_no), color = Muted, fontSize = 13.sp)
                    }
                }
            }
        }

        // Pestañas y filtros en una fila que se desliza (cuatro pestañas no caben en un segmentado).
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listas.forEachIndexed { i, (t, l) ->
                Pastilla(Textos.t(t) + " · " + l.size, i == pestana) { pestanaElegida = i; todos = false }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 6.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (consolas.size > 1) {
                Pastilla(Textos.t(T.plat_todas), consola == null, pequena = true) { consola = null }
                consolas.forEach { c -> Pastilla(nombreConsola(c), consola == c, pequena = true) { consola = if (consola == c) null else c } }
            }
            listOf("corto" to T.plat_filtro_corto, "instalados" to T.plat_filtro_instalados, "suscripcion" to T.plat_filtro_suscripcion).forEach { (k, t) ->
                Pastilla(Textos.t(t), filtro == k, pequena = true) { filtro = if (filtro == k) null else k }
            }
        }
        Text(
            Textos.t(
                when (listas[pestana].first) {
                    T.plat_jugando -> T.plat_desc_jugando
                    T.plat_faciles -> T.plat_desc_faciles
                    T.plat_dobles -> T.plat_desc_dobles
                    else -> T.plat_desc_cerca
                },
            ),
            color = Muted,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            modifier = Modifier.padding(top = 8.dp, bottom = 8.dp, start = 4.dp, end = 4.dp),
        )
        if (cazaLlena) {
            Text("🎯 " + Textos.t(T.caza_llena), color = Danger, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 6.dp, start = 4.dp))
        }
        if (lista.isEmpty()) {
            Text(Textos.t(T.plat_vacio), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 12.dp, horizontal = 4.dp))
        } else {
            GrupoNativo {
                val visibles = if (todos) lista else lista.take(VISIBLES)
                visibles.forEachIndexed { i, f ->
                    if (i > 0) SeparadorFila()
                    FilaPlatinable(
                        f,
                        onRetirar = if (f.ocultable) ({ quitados = quitados + f.id; onRetirar(f.id) }) else null,
                        caza = if (f.ocultable) f.id in cazas else null,
                        onCaza = { alternarCaza(f.id) },
                    ) { onAbrir(f.id) }
                }
            }
            if (lista.size > VISIBLES) {
                TextButton(onClick = { todos = !todos }) {
                    Text(
                        if (todos) Textos.t(T.plat_ver_menos) else Textos.t(T.plat_ver_mas, lista.size - VISIBLES),
                        color = Accent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun Pastilla(texto: String, activa: Boolean, pequena: Boolean = false, onClick: () -> Unit) {
    Text(
        texto,
        color = if (activa) Accent else Muted,
        fontSize = if (pequena) 11.sp else 12.sp,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (activa) AccentSoft else Surface)
            .border(1.dp, if (activa) Accent.copy(alpha = 0.4f) else Border, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = if (pequena) 10.dp else 12.dp, vertical = if (pequena) 5.dp else 7.dp),
    )
}

@Composable
private fun FilaPlatinable(
    f: Fila,
    onRetirar: (() -> Unit)?,
    /** null = sin botón 🎯 (doble platino). */
    caza: Boolean? = null,
    onCaza: () -> Unit = {},
    onClick: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(start = 12.dp, end = 2.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(48.dp).clip(RoundedCornerShape(radio(10))).background(Surface2)) {
            if (f.cover.isNotBlank()) {
                AsyncImage(model = f.cover, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
        }
        Column(Modifier.weight(1f).padding(start = 12.dp, end = 8.dp)) {
            Text(f.titulo, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(f.linea, color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 1.dp))
            if (f.avisos.isNotEmpty()) {
                Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    f.avisos.take(3).forEach { a ->
                        Text(
                            a,
                            color = Accent,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            modifier = Modifier.clip(RoundedCornerShape(50)).background(AccentSoft).padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }
            f.amigos?.let { Text(it, color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 3.dp)) }
            Box(Modifier.padding(top = 6.dp).fillMaxWidth().height(4.dp).clip(RoundedCornerShape(50)).background(Surface2)) {
                Box(Modifier.fillMaxWidth(f.percent.coerceIn(0, 100) / 100f).height(4.dp).background(Accent))
            }
        }
        Text("${f.percent}%", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        if (caza != null) {
            IconButton(onClick = onCaza, modifier = Modifier.size(36.dp)) {
                Text(
                    "🎯",
                    fontSize = 15.sp,
                    modifier = Modifier.alpha(if (caza) 1f else 0.3f),
                )
            }
        }
        if (onRetirar != null) {
            IconButton(onClick = onRetirar, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Default.Close, contentDescription = Textos.t(T.retirados_ya_no), tint = Muted, modifier = Modifier.size(16.dp))
            }
        } else {
            Box(Modifier.size(12.dp))
        }
    }
}

/**
 * «Reanuda tus cazas» en el Panel (12 nov 2026, como la web): los juegos que
 * has elegido platinar (🎯 en la ficha o en «A un paso del platino»), en el
 * orden en que los elegiste. La × los quita de aquí sin tocar nada más.
 */
@Composable
fun SeccionCazas(cazas: List<PlatinableDto>, onAbrir: (String) -> Unit, onQuitar: (String) -> Unit) {
    var quitadas by remember { mutableStateOf(emptySet<String>()) }
    val lista = cazas.filter { it.id !in quitadas }.map(::fila)
    TituloSeccion("🎯 " + Textos.t(T.cazas_titulo))
    Column(Modifier.padding(horizontal = 20.dp).animateContentSize()) {
        if (lista.isEmpty()) {
            Text(
                Textos.t(T.cazas_vacio),
                color = Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(radio(14)))
                    .border(1.dp, Border, RoundedCornerShape(radio(14)))
                    .padding(14.dp),
            )
        } else {
            GrupoNativo {
                lista.forEachIndexed { i, f ->
                    if (i > 0) SeparadorFila()
                    FilaPlatinable(f, onRetirar = { quitadas = quitadas + f.id; onQuitar(f.id) }) { onAbrir(f.id) }
                }
            }
        }
    }
}
