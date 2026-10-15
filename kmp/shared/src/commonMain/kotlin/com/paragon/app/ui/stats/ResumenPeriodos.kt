package com.paragon.app.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.EstiloDeCazaStats
import com.paragon.app.data.ahoraMillis
import com.paragon.app.data.isoAMillis
import com.paragon.app.ui.common.ControlSegmentado
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Good
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.app.util.cifra
import com.paragon.app.util.fechaConPatron
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.PeriodosDto

/**
 * Cabecera de Estadísticas (diseño v2, 15 oct 2026, maqueta "11 ·
 * Estadísticas"): Semana / Año / Siempre con la cifra en grande, la
 * comparación con el periodo anterior y las barras; debajo, tu estilo de
 * caza y tu hora favorita. Los datos: `periodos` de GET /api/mobile/stats.
 */
@Composable
internal fun ResumenPeriodos(periodos: PeriodosDto, estilo: EstiloDeCazaStats?) {
    var periodo by rememberSaveable { mutableIntStateOf(1) }
    val forma = RoundedCornerShape(radio(20))
    Column(Modifier.fillMaxWidth()) {
        ControlSegmentado(
            opciones = listOf(Textos.t(T.stats_periodo_semana), Textos.t(T.stats_periodo_anio), Textos.t(T.stats_periodo_siempre)),
            seleccion = periodo,
            onCambio = { periodo = it },
        )
        Column(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .background(Surface, forma)
                .border(1.dp, Border, forma)
                .padding(20.dp),
        ) {
            val (total, etiqueta, comparacion) = when (periodo) {
                0 -> Triple(
                    periodos.semana.total,
                    Textos.t(T.stats_trofeos_semana),
                    diferencia(periodos.semana.total, periodos.semana.anterior)?.let { Textos.t(T.stats_vs_semana, it) },
                )
                1 -> Triple(
                    periodos.anio.total,
                    Textos.t(T.stats_trofeos_en, periodos.anio.anio),
                    diferencia(periodos.anio.total, periodos.anio.anterior)?.let { Textos.t(T.stats_vs_anio, it, periodos.anio.anio - 1) },
                )
                else -> Triple(periodos.siempre.total, Textos.t(T.stats_trofeos_siempre), null)
            }
            Text(text = cifra(total), color = Foreground, fontSize = 44.sp, fontWeight = FontWeight.Bold, lineHeight = 48.sp)
            if (comparacion != null) {
                val sube = !comparacion.startsWith("−")
                Text(text = comparacion, color = if (sube) Good else Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
            Text(text = etiqueta, color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))

            val (valores, rotulos, destacada) = when (periodo) {
                0 -> Triple(
                    periodos.semana.barras,
                    List(periodos.semana.barras.size) { i ->
                        fechaConPatron(ahoraMillis() - (periodos.semana.barras.size - 1 - i) * DIA_MS, "EEEEE")
                    },
                    periodos.semana.barras.size - 1,
                )
                1 -> Triple(
                    periodos.anio.barras,
                    List(periodos.anio.barras.size) { i ->
                        val mes = (i + 1).toString().padStart(2, '0')
                        isoAMillis("${periodos.anio.anio}-$mes-15T12:00:00.000Z")?.let { fechaConPatron(it, "MMMMM") } ?: ""
                    },
                    mesActual(periodos.anio.anio, periodos.anio.barras.size),
                )
                else -> Triple(
                    periodos.siempre.barras.map { it.total },
                    periodos.siempre.barras.map { "'" + (it.anio % 100).toString().padStart(2, '0') },
                    periodos.siempre.barras.size - 1,
                )
            }
            if (valores.isNotEmpty()) Barras(valores, rotulos, destacada)
        }

        Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (estilo != null) {
                Ficha(Textos.t(T.stats_estilo), estilo.nombre, estilo.descripcion, Modifier.weight(1f))
            }
            periodos.horaFavorita?.let { hora ->
                val apodo = when (hora) {
                    in 5..11 -> Textos.t(T.stats_hora_manana)
                    in 12..19 -> Textos.t(T.stats_hora_tarde)
                    else -> Textos.t(T.stats_hora_noche)
                }
                Ficha(Textos.t(T.stats_hora_favorita), "${hora.toString().padStart(2, '0')}:00", apodo, Modifier.weight(1f))
            }
        }
    }
}

private const val DIA_MS = 86_400_000L

/** "+18 %" / "−5 %" frente al periodo anterior; null si antes no hubo nada con que comparar. */
private fun diferencia(ahora: Int, antes: Int): String? {
    if (antes <= 0) return null
    val pct = ((ahora - antes) * 100.0 / antes).let { kotlin.math.round(it).toInt() }
    return if (pct >= 0) "+$pct %" else "−${-pct} %"
}

/** Índice del mes actual en las barras del año (o el último si el año no es el de hoy). */
private fun mesActual(anio: Int, meses: Int): Int {
    val hoy = fechaConPatron(ahoraMillis(), "yyyy-MM")
    // El patrón localizado puede traer otros separadores: se leen solo los dígitos.
    val digitos = hoy.filter { it.isDigit() }
    return if (digitos.length >= 6 && digitos.take(4).toIntOrNull() == anio) {
        ((digitos.drop(4).take(2).toIntOrNull() ?: meses) - 1).coerceIn(0, meses - 1)
    } else {
        meses - 1
    }
}

@Composable
private fun Barras(valores: List<Int>, rotulos: List<String>, destacada: Int) {
    val maximo = (valores.maxOrNull() ?: 0).coerceAtLeast(1)
    val alto = 96.dp
    Row(
        Modifier.fillMaxWidth().padding(top = 18.dp).height(alto + 18.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        valores.forEachIndexed { i, v ->
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                val altura = if (v <= 0) 3.dp else (alto * (v.toFloat() / maximo)).coerceAtLeast(6.dp)
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(altura)
                        .background(
                            if (i == destacada) Accent else Accent.copy(alpha = if (v > 0) 0.35f else 0.15f),
                            RoundedCornerShape(radio(4)),
                        ),
                )
                Text(
                    text = rotulos.getOrElse(i) { "" },
                    color = if (i == destacada) Foreground else Muted,
                    fontSize = 10.sp,
                    maxLines = 1,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun Ficha(titulo: String, valor: String, detalle: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(Surface2, RoundedCornerShape(radio(16)))
            .padding(14.dp),
    ) {
        Text(text = titulo, color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, maxLines = 1)
        Text(text = valor, color = Foreground, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, modifier = Modifier.padding(top = 4.dp))
        Text(text = detalle, color = Muted, fontSize = 12.sp, maxLines = 2, modifier = Modifier.padding(top = 2.dp))
    }
}
