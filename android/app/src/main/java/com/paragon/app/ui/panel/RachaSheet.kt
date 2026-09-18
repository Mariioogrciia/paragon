package com.paragon.app.ui.panel

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.DiaActividad
import com.paragon.app.data.RachaDetalle
import com.paragon.app.data.RachaDetalleResult
import com.paragon.app.data.RachaRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*

/**
 * Pantalla dedicada a la racha (pedido explícito del usuario: ni el resumen
 * del Panel ni la pantalla entera de Estadísticas, algo propio) — se abre
 * al tocar el icono de fuego de la cabecera. Contra GET /api/mobile/racha,
 * curado aparte de /stats para no cargar toda esa pantalla por un detalle.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RachaSheet(tokenStore: TokenStore, onDismiss: () -> Unit) {
    val repository = remember(tokenStore) { RachaRepository(tokenStore) }
    var result by remember { mutableStateOf<RachaDetalleResult?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(Unit) {
        result = repository.getRacha()
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = Surface) {
        Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp).padding(bottom = 32.dp)) {
            when (val current = result) {
                null -> Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is RachaDetalleResult.Error -> Text(text = current.message, color = Muted, fontSize = 14.sp)
                is RachaDetalleResult.Ok -> RachaContent(current.detalle)
            }
        }
    }
}

@Composable
private fun RachaContent(detalle: RachaDetalle) {
    val viva = detalle.actual > 0

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Icon(
            imageVector = Icons.Default.Whatshot,
            contentDescription = null,
            tint = if (viva) Gold else Muted,
            modifier = Modifier.size(56.dp),
        )
        // Sin racha, "0 días" en 32sp dominaba la pantalla y sonaba a fallo
        // ("llevas 0 de algo") en vez de a invitación — mismo criterio en
        // el hueco vacío de cualquier lista: no repetir el cero, decir qué
        // hacer con él.
        if (viva) {
            Text(
                text = "${detalle.actual} ${if (detalle.actual == 1) "día" else "días"}",
                color = Gold,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(
                text = "Racha activa — sigue así",
                color = Muted,
                fontSize = 13.sp,
            )
        } else {
            Text(
                text = "Tu próxima racha empieza hoy",
                color = Foreground,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp),
            )
            Text(
                text = "Completa un trofeo para activarla",
                color = Muted,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
        }

        Spacer(Modifier.height(20.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            MiniStatRacha(label = "Mejor racha", value = "${detalle.mejor}d", modifier = Modifier.weight(1f))
            MiniStatRacha(label = "Días activos", value = detalle.diasActivos.toString(), modifier = Modifier.weight(1f))
        }

        Spacer(Modifier.height(24.dp))

        Text(
            text = "ÚLTIMAS 5 SEMANAS",
            color = Muted,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            modifier = Modifier.align(Alignment.Start).padding(bottom = 10.dp),
        )
        DiasGrid(dias = detalle.dias)
    }
}

@Composable
private fun MiniStatRacha(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Surface2, RoundedCornerShape(14.dp))
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text = value, color = Foreground, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text(text = label, color = Muted, fontSize = 11.sp)
    }
}

/** 5 filas de 7 — una semana por fila, empezando por la más antigua de los últimos 35 días. */
@Composable
private fun DiasGrid(dias: List<DiaActividad>) {
    val semanas = dias.chunked(7)
    // El último día de la lista es hoy (35 días terminando hoy) — un pulso
    // muy discreto ahí, no en el resto, para que se note dónde está "hoy"
    // sin que el calendario entero titile.
    val hoy = dias.lastOrNull()
    val transicion = rememberInfiniteTransition(label = "pulsoHoy")
    val pulso by transicion.animateFloat(
        initialValue = 0.6f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse),
        label = "pulsoHoyAlpha",
    )

    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        semanas.forEach { semana ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                semana.forEach { dia ->
                    // Intensidad por cantidad de trofeos ese día, no solo
                    // "hubo o no hubo" — un día suelto y una tarde a tope
                    // se veían exactamente igual antes.
                    val color = when {
                        dia.trofeos >= 3 -> Gold
                        dia.trofeos == 2 -> Gold.copy(alpha = 0.65f)
                        dia.trofeos == 1 -> Gold.copy(alpha = 0.35f)
                        else -> Surface2
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                            .background(color, RoundedCornerShape(6.dp))
                            .then(
                                if (dia === hoy) {
                                    Modifier.border(2.dp, Accent.copy(alpha = pulso), RoundedCornerShape(6.dp))
                                } else Modifier,
                            ),
                    )
                }
                repeat(7 - semana.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
