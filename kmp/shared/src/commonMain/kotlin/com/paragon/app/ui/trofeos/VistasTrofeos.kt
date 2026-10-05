package com.paragon.app.ui.trofeos

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.TrophyItem
import com.paragon.app.data.isoAMillis
import com.paragon.app.ui.common.gradeColor
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.common.urlImagenSegura
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.radio
import com.paragon.app.util.EstiloFecha
import com.paragon.app.util.fechaConEstilo
import com.paragon.app.util.numeroLocal
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.DiarioPlatinoDto

/**
 * Las vistas de una lista de trofeos, compartidas por la ficha de un juego y
 * el desglose del mes (5 oct 2026), como `components/VistasTrofeos.tsx` en la
 * web. La elegida se recuerda mientras la app está abierta y vale para las
 * dos pantallas. (El árbol de la web no está en las apps.)
 */
enum class VistaTrofeos { LISTA, CUADRICULA, CRONOLOGIA }

/** La vista elegida, común a la ficha del juego y al mes. */
var vistaTrofeosActual by mutableStateOf(VistaTrofeos.LISTA)

@Composable
fun SelectorVistaTrofeos(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(radio(10)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(10)))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        BotonVista(VistaTrofeos.LISTA, Icons.AutoMirrored.Filled.List, Textos.t(T.vista_lista))
        BotonVista(VistaTrofeos.CUADRICULA, Icons.Default.GridView, Textos.t(T.vista_cuadricula))
        BotonVista(VistaTrofeos.CRONOLOGIA, Icons.Default.Timeline, Textos.t(T.vista_cronologia))
    }
}

@Composable
private fun BotonVista(vista: VistaTrofeos, icono: ImageVector, etiqueta: String) {
    val activa = vistaTrofeosActual == vista
    Box(
        Modifier
            .clip(RoundedCornerShape(radio(7)))
            .background(if (activa) AccentSoft else Surface)
            .premiumClickable { vistaTrofeosActual = vista }
            .padding(horizontal = 10.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icono, contentDescription = etiqueta, tint = if (activa) Accent else Muted, modifier = Modifier.size(18.dp))
    }
}

/** Foto real del trofeo; sin ella, el color del metal (mismo criterio que la web). */
@Composable
fun FotoTrofeo(trophy: TrophyItem, tam: Int) {
    Box(
        Modifier.size(tam.dp)
            .clip(RoundedCornerShape(radio((tam * 0.27f).toInt())))
            .background(gradeColor(trophy.grade).copy(alpha = if (trophy.earned) 1f else 0.25f))
            .alpha(if (trophy.earned) 1f else 0.42f),
    ) {
        urlImagenSegura(trophy.iconUrl)?.let {
            AsyncImage(model = it, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
    }
}

/** Una fila de la cuadrícula: `columnas` tarjetas del mismo ancho (los huecos del final quedan vacíos). */
@Composable
fun FilaCuadricula(
    trofeos: List<TrophyItem>,
    columnas: Int,
    juegoDe: (TrophyItem) -> String? = { null },
    modifier: Modifier = Modifier,
    onClick: ((TrophyItem) -> Unit)? = null,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        trofeos.forEach { t -> TarjetaTrofeo(t, juegoDe(t), Modifier.weight(1f), onClick?.let { { it(t) } }) }
        repeat(columnas - trofeos.size) { Spacer(Modifier.weight(1f)) }
    }
}

@Composable
fun TarjetaTrofeo(trophy: TrophyItem, juego: String?, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(radio(14)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(14)))
            .then(if (onClick != null) Modifier.premiumClickable(onClick = onClick) else Modifier)
            .alpha(if (trophy.earned) 1f else 0.5f)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f), contentAlignment = Alignment.Center) { FotoTrofeo(trophy, 52) }
        Text(
            trophy.name,
            color = Foreground,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            lineHeight = 13.sp,
        )
        juego?.let { Text(it, color = Muted, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp)) }
        trophy.rarityPercent?.let { Text("${numeroLocal(it, 1)} %", color = Muted, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 2.dp)) }
    }
}

/** Fila de la vista Lista para trofeos de varios juegos (el mes): foto, nombre, juego y rareza. */
@Composable
fun FilaTrofeo(trophy: TrophyItem, juego: String?, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().clip(RoundedCornerShape(radio(16))).background(Surface).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FotoTrofeo(trophy, 40)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(trophy.name, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            juego?.let { Text(it.uppercase(), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis) }
            if (trophy.detail.isNotBlank()) Text(trophy.detail, color = Muted, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
        }
        trophy.rarityPercent?.let { Text("${numeroLocal(it, 1)} %", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
    }
}

/** Cabecera de un grupo (un día del mes), como los grupos de la web. */
@Composable
fun CabeceraGrupo(titulo: String, total: Int, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().padding(top = 8.dp, bottom = 6.dp), verticalAlignment = Alignment.Bottom) {
        Text(titulo.uppercase(), color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text("$total", color = Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
    Box(Modifier.fillMaxWidth().height(2.dp).background(Border))
}

// ----------------------------------------------------------- Diario del platino

/** Texto con los valores en negrita y el resto normal: "{0}" → valores[0]. */
private fun conNegritas(plantilla: String, vararg valores: String, cursiva: Set<Int> = emptySet()) = buildAnnotatedString {
    val partes = Regex("\\{(\\d+)\\}").split(plantilla)
    val huecos = Regex("\\{(\\d+)\\}").findAll(plantilla).map { it.groupValues[1].toInt() }.toList()
    partes.forEachIndexed { i, texto ->
        append(texto)
        huecos.getOrNull(i)?.let { n ->
            val estilo = if (n in cursiva) SpanStyle(fontStyle = FontStyle.Italic) else SpanStyle(fontWeight = FontWeight.Bold, color = Foreground)
            withStyle(estilo) { append(valores.getOrElse(n) { "" }) }
        }
    }
}

/**
 * "El Diario del Platino", como en la web (components/DiarioPlatino.tsx): el
 * muro solo con 3 días o más y la hazaña si su rareza baja del 20 %.
 */
@Composable
fun DiarioPlatinoCard(diario: DiarioPlatinoDto, titulo: String, modifier: Modifier = Modifier) {
    fun fecha(iso: String) = isoAMillis(iso)?.let { fechaConEstilo(it, EstiloFecha.LARGA) } ?: iso
    Column(
        modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(Textos.t(T.diario_titulo).uppercase(), color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        val estilo = Modifier
        Text(conNegritas(Textos.t(T.diario_inicio), titulo, fecha(diario.primeraFecha), diario.primerTrofeo, cursiva = setOf(2)), color = Muted, fontSize = 14.sp, lineHeight = 20.sp, modifier = estilo)
        if (diario.muroDias >= 3) {
            Text(conNegritas(Textos.t(T.diario_muro), diario.muroTrofeo, "${diario.muroDias}", cursiva = setOf(0)), color = Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        diario.masRaro?.takeIf { it.rarityPercent < 20 }?.let {
            Text(conNegritas(Textos.t(T.diario_hazana), it.nombre, numeroLocal(it.rarityPercent, 1), cursiva = setOf(0)), color = Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        val final = if (diario.diasTotales == 1) Textos.t(T.diario_final_1) else Textos.t(T.diario_final_n)
        Text(conNegritas(final, fecha(diario.fechaPlatino), "${diario.diasTotales}"), color = Muted, fontSize = 14.sp, lineHeight = 20.sp)
    }
}
