package com.paragon.app.ui.social

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.Anchor
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Castle
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.RocketLaunch
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Danger
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.OnAccent
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.SurfaceSolida
import com.paragon.app.ui.theme.radio
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import kotlinx.coroutines.launch

/**
 * Escudo de un clan, al estilo Clash of Clans: forma + símbolo + color de
 * fondo + color del símbolo, de un catálogo fijo. MISMO catálogo, claves y
 * orden que la web (src/lib/clanEmblema.ts): se guarda como texto
 * `emblema:1:<forma>:<simbolo>:<fondo>:<color>` y lo leen las dos.
 */
data class Emblema(val forma: String, val simbolo: String, val fondo: Int, val color: Int) {
    fun aTexto() = "emblema:1:$forma:$simbolo:$fondo:$color"
}

val FORMAS_ESCUDO = listOf("escudo", "circulo", "hexagono", "estandarte", "rombo")

/** Trazado de cada forma en una caja de 100×100 (los mismos que la web). */
private val TRAZADO_FORMA = mapOf(
    "escudo" to "M50 4 L90 16 V48 C90 72 72 88 50 96 C28 88 10 72 10 48 V16 Z",
    "circulo" to "M50 4 A46 46 0 1 1 49.99 4 Z",
    "hexagono" to "M50 4 L90 27 V73 L50 96 L10 73 V27 Z",
    "estandarte" to "M14 4 H86 V92 L50 76 L14 92 Z",
    "rombo" to "M50 3 L97 50 L50 97 L3 50 Z",
)

/** Los mismos iconos de Material que la web (react-icons/md). */
val SIMBOLOS_ESCUDO: List<Pair<String, ImageVector>> = listOf(
    "copa" to Icons.Default.EmojiEvents,
    "rayo" to Icons.Default.Bolt,
    "llama" to Icons.Default.LocalFireDepartment,
    "estrella" to Icons.Default.Star,
    "medalla" to Icons.Default.MilitaryTech,
    "mando" to Icons.Default.SportsEsports,
    "cohete" to Icons.Default.RocketLaunch,
    "garra" to Icons.Default.Pets,
    "castillo" to Icons.Default.Castle,
    "diamante" to Icons.Default.Diamond,
    "ancla" to Icons.Default.Anchor,
    "copo" to Icons.Default.AcUnit,
)

val COLORES_ESCUDO = listOf(
    Color(0xFFE53935), Color(0xFFFB8C00), Color(0xFFF2B632), Color(0xFF2E9E5B), Color(0xFF1FB5AD),
    Color(0xFF2F6FDB), Color(0xFF7B4CD8), Color(0xFFD9468C), Color(0xFF2A2F3A), Color(0xFFEDE6D6),
)

/** El de un clan que aún no ha elegido: escudo azul con copa dorada (igual que la web). */
val EMBLEMA_POR_DEFECTO = Emblema("escudo", "copa", 5, 2)

/** null si no es un emblema válido. */
fun textoAEmblema(texto: String?): Emblema? {
    val p = texto?.split(":") ?: return null
    if (p.size != 6 || p[0] != "emblema" || p[1] != "1") return null
    val fondo = p[4].toIntOrNull() ?: return null
    val color = p[5].toIntOrNull() ?: return null
    if (p[2] !in FORMAS_ESCUDO || SIMBOLOS_ESCUDO.none { it.first == p[3] }) return null
    if (fondo !in COLORES_ESCUDO.indices || color !in COLORES_ESCUDO.indices) return null
    return Emblema(p[2], p[3], fondo, color)
}

private val trazados = mutableMapOf<String, Path>()
private fun trazado(forma: String): Path = trazados.getOrPut(forma) {
    PathParser().parsePathString(TRAZADO_FORMA.getValue(forma)).toPath()
}

/** El escudo: la forma rellena del color de fondo, con un filo del color del símbolo, y el símbolo encima. */
@Composable
fun EscudoClan(emblema: String?, size: Dp, modifier: Modifier = Modifier) {
    EscudoClan(textoAEmblema(emblema) ?: EMBLEMA_POR_DEFECTO, size, modifier)
}

@Composable
fun EscudoClan(e: Emblema, size: Dp, modifier: Modifier = Modifier) {
    val fondo = COLORES_ESCUDO[e.fondo]
    val color = COLORES_ESCUDO[e.color]
    val icono = SIMBOLOS_ESCUDO.first { it.first == e.simbolo }.second
    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size)) {
            val path = trazado(e.forma)
            scale(this.size.width / 100f, this.size.height / 100f, pivot = androidx.compose.ui.geometry.Offset.Zero) {
                drawPath(path, fondo)
                drawPath(path, color.copy(alpha = 0.55f), style = Stroke(width = 5f))
            }
        }
        Icon(icono, contentDescription = null, tint = color, modifier = Modifier.size(size * 0.46f))
    }
}

/**
 * Editor del escudo (solo el líder): vista previa en grande, forma, símbolo,
 * color de fondo y del símbolo. Como el de la web (EditorEscudo.tsx).
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EditorEscudoSheet(inicial: String?, onGuardar: suspend (String) -> String?, onDismiss: () -> Unit) {
    var e by remember { mutableStateOf(textoAEmblema(inicial) ?: EMBLEMA_POR_DEFECTO) }
    var error by remember { mutableStateOf<String?>(null) }
    var guardando by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = SurfaceSolida,
    ) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 32.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                EscudoClan(e, 88.dp)
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(Textos.t(T.clan_escudo_titulo), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(Textos.t(T.clan_escudo_texto), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
                }
            }

            Etiqueta(Textos.t(T.clan_escudo_forma))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FORMAS_ESCUDO.forEach { f ->
                    Opcion(activa = e.forma == f, onClick = { e = e.copy(forma = f) }) {
                        Canvas(Modifier.size(28.dp)) {
                            scale(size.width / 100f, size.height / 100f, pivot = androidx.compose.ui.geometry.Offset.Zero) {
                                drawPath(trazado(f), Muted)
                            }
                        }
                    }
                }
            }

            Etiqueta(Textos.t(T.clan_escudo_simbolo))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SIMBOLOS_ESCUDO.forEach { (clave, icono) ->
                    Opcion(activa = e.simbolo == clave, onClick = { e = e.copy(simbolo = clave) }) {
                        Icon(icono, contentDescription = null, tint = if (e.simbolo == clave) Foreground else Muted, modifier = Modifier.size(24.dp))
                    }
                }
            }

            Etiqueta(Textos.t(T.clan_escudo_fondo))
            Colores(elegido = e.fondo) { e = e.copy(fondo = it) }
            Etiqueta(Textos.t(T.clan_escudo_color))
            Colores(elegido = e.color) { e = e.copy(color = it) }

            error?.let { Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 16.dp)) }
            Box(
                Modifier.padding(top = 24.dp).fillMaxWidth().height(50.dp)
                    .clip(RoundedCornerShape(radio(14)))
                    .background(Accent)
                    .premiumClickable(enabled = !guardando) {
                        guardando = true
                        error = null
                        scope.launch {
                            error = onGuardar(e.aTexto())
                            guardando = false
                            if (error == null) onDismiss()
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text(Textos.t(T.clan_escudo_guardar), color = OnAccent, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}

@Composable
private fun Etiqueta(texto: String) {
    Text(texto.uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, modifier = Modifier.padding(top = 22.dp, bottom = 10.dp))
}

@Composable
private fun Opcion(activa: Boolean, onClick: () -> Unit, contenido: @Composable () -> Unit) {
    Box(
        Modifier.size(52.dp)
            .clip(RoundedCornerShape(radio(14)))
            .background(Surface2)
            .border(if (activa) 2.dp else 1.dp, if (activa) Accent else Border, RoundedCornerShape(radio(14)))
            .premiumClickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { contenido() }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Colores(elegido: Int, onElegir: (Int) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        COLORES_ESCUDO.forEachIndexed { i, c ->
            Box(
                Modifier.size(40.dp)
                    .clip(CircleShape)
                    .background(c)
                    .border(if (elegido == i) 3.dp else 1.dp, if (elegido == i) Foreground else Border, CircleShape)
                    .premiumClickable { onElegir(i) },
            )
        }
    }
}
