package com.paragon.app.ui.common

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.util.animacionesReducidas
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

/**
 * Esqueletos de carga (auditoría, 4 oct 2026): en vez de un spinner en
 * mitad de la pantalla vacía, la forma de lo que va a llegar — se percibe
 * más rápido y no salta el diseño al terminar. Un solo pulso de opacidad
 * para todos los bloques de la pantalla (no uno por bloque), parado con
 * "quitar animaciones".
 */
@Composable
private fun pulsoEsqueleto(): Float {
    if (animacionesReducidas()) return 0.7f
    val transicion = rememberInfiniteTransition(label = "esqueleto")
    val alfa by transicion.animateFloat(
        initialValue = 0.45f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "esqueletoAlfa",
    )
    return alfa
}

@Composable
private fun Bloque(modifier: Modifier, radio: Dp = 8.dp) {
    Box(modifier.background(Surface2, RoundedCornerShape(radio)))
}

/** Contenedor común: anuncia "Cargando" a TalkBack una sola vez y aplica el pulso. */
@Composable
private fun Esqueleto(modifier: Modifier = Modifier, contenido: @Composable () -> Unit) {
    val descripcion = Textos.t(T.comun_cargando)
    Box(
        modifier
            .alpha(pulsoEsqueleto())
            .semantics { contentDescription = descripcion },
    ) { contenido() }
}

/** Filas de lista: carátula + dos líneas (Biblioteca, Comunidad, Ligas...). */
@Composable
fun EsqueletoLista(filas: Int = 7, modifier: Modifier = Modifier.fillMaxSize()) {
    Esqueleto(modifier) {
        Column(Modifier.padding(horizontal = 24.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            repeat(filas) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Bloque(Modifier.size(56.dp), radio = 12.dp)
                    Column(Modifier.padding(start = 14.dp).weight(1f)) {
                        Bloque(Modifier.fillMaxWidth(0.7f).height(14.dp))
                        Spacer(Modifier.height(8.dp))
                        Bloque(Modifier.fillMaxWidth(0.45f).height(10.dp))
                    }
                }
            }
        }
    }
}

/** Ficha de juego: carátula y título arriba, luego filas de trofeo. */
@Composable
fun EsqueletoFicha(modifier: Modifier = Modifier.fillMaxSize()) {
    Esqueleto(modifier) {
        Column(Modifier.padding(24.dp)) {
            Row {
                Bloque(Modifier.width(110.dp).aspectRatio(0.75f), radio = 14.dp)
                Column(Modifier.padding(start = 20.dp).weight(1f)) {
                    Bloque(Modifier.fillMaxWidth(0.85f).height(24.dp))
                    Spacer(Modifier.height(12.dp))
                    Bloque(Modifier.fillMaxWidth(0.5f).height(12.dp))
                    Spacer(Modifier.height(16.dp))
                    Bloque(Modifier.fillMaxWidth().height(8.dp), radio = 4.dp)
                }
            }
            Spacer(Modifier.height(28.dp))
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                repeat(6) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Bloque(Modifier.size(44.dp), radio = 10.dp)
                        Column(Modifier.padding(start = 12.dp).weight(1f)) {
                            Bloque(Modifier.fillMaxWidth(0.6f).height(13.dp))
                            Spacer(Modifier.height(7.dp))
                            Bloque(Modifier.fillMaxWidth(0.85f).height(10.dp))
                        }
                    }
                }
            }
        }
    }
}

/** Tarjetas grandes apiladas (Estadísticas, carrusel del Panel). */
@Composable
fun EsqueletoTarjetas(tarjetas: Int = 3, alto: Dp = 160.dp, modifier: Modifier = Modifier.fillMaxSize()) {
    Esqueleto(modifier) {
        Column(Modifier.padding(horizontal = 24.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            repeat(tarjetas) { Bloque(Modifier.fillMaxWidth().height(alto), radio = 20.dp) }
        }
    }
}
