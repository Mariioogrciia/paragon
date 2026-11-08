package com.paragon.app.ui.panel

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.paragon.app.ui.common.ControlSegmentado
import com.paragon.app.ui.common.GrupoNativo
import com.paragon.app.ui.common.SeparadorFila
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.PlatinableDto
import com.paragon.shared.red.PlatinablesDto

private const val VISIBLES = 5

private fun faltanTexto(p: PlatinableDto) =
    if (p.tienePlatino) Textos.t(T.plat_faltan, p.faltan) else Textos.t(T.plat_faltan_cien, p.faltan)

private fun extras(p: PlatinableDto): List<String> = listOfNotNull(
    p.diasDesdeJugado?.takeIf { it <= 365 }?.let {
        when (it) {
            0 -> Textos.t(T.plat_hoy)
            1 -> Textos.t(T.plat_ayer)
            else -> Textos.t(T.plat_hace, it)
        }
    },
    p.horasRestantes?.takeIf { it > 0 }?.let { Textos.t(T.plat_horas, it) },
)

/**
 * «A un paso del platino» en el Panel (8 nov 2026, como la web): lo que
 * menos te queda y lo que estás jugando, con pestañas. Antes la app solo
 * enseñaba el primero, dentro de «Para hoy».
 */
@Composable
fun SeccionPlatinables(datos: PlatinablesDto, onAbrir: (String) -> Unit, onVerTodo: () -> Unit, onRetirar: (String) -> Unit = {}) {
    // "Ya no lo tengo" (lib/retirados.ts): desaparece al momento de las dos listas.
    var quitados by remember { mutableStateOf(emptySet<String>()) }
    val cerca = datos.cerca.filter { it.id !in quitados }
    val jugando = datos.jugando.filter { it.id !in quitados }
    if (cerca.isEmpty() && jugando.isEmpty()) return
    var pestana by remember { mutableIntStateOf(if (cerca.isNotEmpty()) 0 else 1) }
    var todos by remember { mutableStateOf(false) }
    val lista = if (pestana == 0) cerca else jugando

    TituloSeccion(Textos.t(T.plat_titulo), Textos.t(T.inicio_ver_todo)) { onVerTodo() }
    Column(Modifier.padding(horizontal = 20.dp).animateContentSize()) {
        ControlSegmentado(
            opciones = listOf(
                Textos.t(T.plat_cerca) + " · " + cerca.size,
                Textos.t(T.plat_jugando) + " · " + jugando.size,
            ),
            seleccion = pestana,
            onCambio = { pestana = it; todos = false },
        )
        Text(
            Textos.t(if (pestana == 0) T.plat_desc_cerca else T.plat_desc_jugando),
            color = Muted,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            modifier = Modifier.padding(top = 8.dp, bottom = 8.dp, start = 4.dp, end = 4.dp),
        )
        if (lista.isEmpty()) {
            Text(Textos.t(T.plat_vacio), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 12.dp, horizontal = 4.dp))
        } else {
            GrupoNativo {
                val visibles = if (todos) lista else lista.take(VISIBLES)
                visibles.forEachIndexed { i, p ->
                    if (i > 0) SeparadorFila()
                    FilaPlatinable(p, onRetirar = { quitados = quitados + p.id; onRetirar(p.id) }) { onAbrir(p.id) }
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
private fun FilaPlatinable(p: PlatinableDto, onRetirar: () -> Unit, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(48.dp).clip(RoundedCornerShape(radio(10))).background(Surface2)) {
            if (p.coverUrl.isNotBlank()) {
                AsyncImage(model = p.coverUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
        }
        Column(Modifier.weight(1f).padding(start = 12.dp, end = 8.dp)) {
            Text(p.title, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                (listOf(faltanTexto(p)) + extras(p)).joinToString(" · "),
                color = Muted,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 1.dp),
            )
            Box(Modifier.padding(top = 6.dp).fillMaxWidth().height(4.dp).clip(RoundedCornerShape(50)).background(Surface2)) {
                Box(Modifier.fillMaxWidth(p.percent.coerceIn(0, 100) / 100f).height(4.dp).background(Accent))
            }
        }
        Text("${p.percent}%", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        IconButton(onClick = onRetirar, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Default.Close, contentDescription = Textos.t(T.retirados_ya_no), tint = Muted, modifier = Modifier.size(16.dp))
        }
    }
}
