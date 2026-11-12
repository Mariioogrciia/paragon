package com.paragon.app.ui.panel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import com.paragon.app.data.LibraryGame
import com.paragon.app.ui.library.BuscadorBiblioteca
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import kotlinx.coroutines.launch

/**
 * Elegir las cazas desde el propio Panel (12 nov 2026, «que se puedan elegir
 * desde el panel de reanudar también»): tu biblioteca sin platinar, con
 * buscador, y un toque para añadir o quitar. Lo último jugado, primero.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ElegirCazasSheet(
    elegidasIniciales: Set<String>,
    max: Int,
    cargarBiblioteca: suspend () -> List<LibraryGame>,
    onCaza: suspend (String, Boolean) -> Boolean,
    onCerrar: () -> Unit,
) {
    val estadoHoja = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val ambito = rememberCoroutineScope()
    var juegos by remember { mutableStateOf<List<LibraryGame>?>(null) }
    var busqueda by remember { mutableStateOf("") }
    var elegidas by remember { mutableStateOf(elegidasIniciales) }
    var llena by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        juegos = cargarBiblioteca()
            .filter { !it.isPlatinado && it.progressPercent < 100 && it.definedTotal > 0 }
            .sortedByDescending { it.lastPlayedAt ?: "" }
    }
    val filtrados = juegos.orEmpty().let { lista ->
        val q = busqueda.trim().lowercase()
        if (q.isEmpty()) lista else lista.filter { q in it.title.lowercase() }
    }.take(80)

    fun alternar(id: String) {
        val nueva = id !in elegidas
        if (nueva && elegidas.size >= max) {
            llena = true
            return
        }
        llena = false
        elegidas = if (nueva) elegidas + id else elegidas - id
        ambito.launch {
            if (!onCaza(id, nueva)) {
                elegidas = if (nueva) elegidas - id else elegidas + id
                if (nueva) llena = true
            }
        }
    }

    ModalBottomSheet(onDismissRequest = onCerrar, sheetState = estadoHoja, containerColor = SurfaceSolida) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("🎯 " + Textos.t(T.cazas_elegir), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text("${elegidas.size} / $max", color = Muted, fontSize = 13.sp)
                TextButton(onClick = onCerrar) { Text(Textos.t(T.cazas_hecho), color = Accent, fontWeight = FontWeight.Bold) }
            }
            BuscadorBiblioteca(busqueda, { busqueda = it }, Modifier.padding(top = 8.dp))
            if (llena) {
                Text("🎯 " + Textos.t(T.caza_llena), color = Danger, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
            }
            when {
                juegos == null -> Text("…", color = Muted, modifier = Modifier.padding(24.dp))
                filtrados.isEmpty() -> Text(Textos.t(T.cazas_sin_resultados), color = Muted, fontSize = 14.sp, modifier = Modifier.padding(vertical = 24.dp))
                else -> LazyColumn(Modifier.fillMaxWidth().heightIn(max = 520.dp).padding(top = 8.dp, bottom = 16.dp)) {
                    items(filtrados, key = { it.id }) { j ->
                        val activa = j.id in elegidas
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(12))).clickable { alternar(j.id) }.padding(vertical = 8.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(Modifier.size(44.dp).clip(RoundedCornerShape(radio(8))).background(Surface2)) {
                                if (j.coverUrl.isNotBlank()) AsyncImage(model = j.coverUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            }
                            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                Text(j.title, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${j.progressPercent}%", color = Muted, fontSize = 12.sp)
                            }
                            Text(
                                if (activa) "🎯 " + Textos.t(T.cazas_elegida) else "+ " + Textos.t(T.cazas_anadir),
                                color = if (activa) Accent else Muted,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .then(if (activa) Modifier.background(AccentSoft) else Modifier)
                                    .border(1.dp, if (activa) Accent.copy(alpha = 0.4f) else Border, RoundedCornerShape(50))
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
