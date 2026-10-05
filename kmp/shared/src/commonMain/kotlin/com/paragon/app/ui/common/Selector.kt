package com.paragon.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/** Una opción del [Selector]. `grupo`: las seguidas con el mismo salen bajo un encabezado. */
data class OpcionSelector(
    val valor: String,
    val etiqueta: String,
    /** Delante: emoji del metal, etc. */
    val icono: String? = null,
    /** Pequeño, a la derecha: consola, %... */
    val detalle: String? = null,
    val grupo: String? = null,
    val activa: Boolean = true,
)

/** A partir de cuántas opciones sale la búsqueda. */
private const val UMBRAL_BUSQUEDA = 12

/**
 * EL desplegable de la app (5 oct 2026), gemelo de `components/ui/Selector.tsx`
 * de la web: antes cada pantalla usaba el `DropdownMenu` de Material a pelo
 * (fondo plano, sin bordes, sin marcar la elegida) o un `TextButton` suelto.
 * El botón se ve como un campo (fondo, borde de 1 dp, radio de la app) y el
 * panel como el menú del avatar: `Surface`, borde, la elegida en acento con
 * ✓, encabezados de grupo, detalle a la derecha y búsqueda en listas largas.
 *
 * `compacto`: solo el texto y la flecha, sin caja (para una barra de
 * herramientas, como el orden de la biblioteca).
 */
@Composable
fun Selector(
    valor: String?,
    opciones: List<OpcionSelector>,
    onElegir: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = Textos.t(T.selector_elige),
    activo: Boolean = true,
    compacto: Boolean = false,
) {
    var abierto by remember { mutableStateOf(false) }
    var busqueda by remember { mutableStateOf("") }
    val elegida = opciones.firstOrNull { it.valor == valor }
    val conBusqueda = opciones.size > UMBRAL_BUSQUEDA
    val forma = RoundedCornerShape(radio(8))

    Box(modifier = modifier) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = (if (compacto) Modifier else Modifier.fillMaxWidth().background(Background, forma).border(1.dp, if (abierto) Accent.copy(alpha = 0.6f) else Border, forma))
                .clip(forma)
                .clickable(enabled = activo) { busqueda = ""; abierto = true }
                .alpha(if (activo) 1f else 0.5f)
                .padding(horizontal = if (compacto) 4.dp else 12.dp, vertical = if (compacto) 4.dp else 11.dp),
        ) {
            elegida?.icono?.let { Text(it, fontSize = 14.sp); Spacer(Modifier.width(6.dp)) }
            Text(
                elegida?.etiqueta ?: placeholder,
                color = if (elegida == null) Muted else if (compacto) Muted else Foreground,
                fontSize = 14.sp,
                fontWeight = if (elegida == null || compacto) FontWeight.Medium else FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = if (compacto) Modifier else Modifier.weight(1f),
            )
            if (!compacto) elegida?.detalle?.let { Text(it, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(start = 8.dp)) }
            Icon(
                Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = Muted,
                modifier = Modifier.padding(start = 4.dp).size(18.dp).rotate(if (abierto) 180f else 0f),
            )
        }

        DropdownMenu(
            expanded = abierto,
            onDismissRequest = { abierto = false },
            containerColor = Surface,
            shape = RoundedCornerShape(radio(12)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
            modifier = Modifier.widthIn(min = 220.dp).heightIn(max = 380.dp),
        ) {
            if (conBusqueda) {
                BasicTextField(
                    value = busqueda,
                    onValueChange = { busqueda = it },
                    singleLine = true,
                    textStyle = TextStyle(color = Foreground, fontSize = 14.sp),
                    cursorBrush = SolidColor(Accent),
                    decorationBox = { campo ->
                        Box(
                            Modifier.fillMaxWidth().background(Background, forma).border(1.dp, Border, forma).padding(horizontal = 10.dp, vertical = 8.dp),
                        ) {
                            if (busqueda.isEmpty()) Text(Textos.t(T.selector_buscar), color = Muted, fontSize = 14.sp)
                            campo()
                        }
                    },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
                )
                HorizontalDivider(color = Border, modifier = Modifier.padding(top = 4.dp))
            }
            val q = normalizar(busqueda)
            val visibles = if (q.isEmpty()) opciones else opciones.filter { normalizar("${it.etiqueta} ${it.detalle.orEmpty()} ${it.grupo.orEmpty()}").contains(q) }
            if (visibles.isEmpty()) {
                Text(Textos.t(T.selector_sin_resultados), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp))
            }
            visibles.forEachIndexed { i, o ->
                if (o.grupo != null && o.grupo != visibles.getOrNull(i - 1)?.grupo) {
                    Text(
                        o.grupo.uppercase(),
                        color = Muted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp,
                        modifier = Modifier.padding(start = 14.dp, end = 14.dp, top = 10.dp, bottom = 4.dp),
                    )
                }
                val seleccionada = o.valor == valor
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 6.dp)
                        .clip(RoundedCornerShape(radio(8)))
                        .background(if (seleccionada) Surface2 else Surface)
                        .clickable(enabled = o.activa) {
                            onElegir(o.valor)
                            abierto = false
                        }
                        .alpha(if (o.activa) 1f else 0.4f)
                        .padding(horizontal = 10.dp, vertical = 10.dp),
                ) {
                    o.icono?.let { Text(it, fontSize = 14.sp); Spacer(Modifier.width(8.dp)) }
                    Text(
                        o.etiqueta,
                        color = if (seleccionada) Accent else Foreground,
                        fontSize = 14.sp,
                        fontWeight = if (seleccionada) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    o.detalle?.let { Text(it, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(start = 8.dp)) }
                    Box(Modifier.padding(start = 6.dp).size(16.dp)) {
                        if (seleccionada) Icon(Icons.Default.Check, contentDescription = null, tint = Accent, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

private fun normalizar(texto: String): String =
    texto.lowercase()
        .replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
        .replace('ü', 'u').replace('ñ', 'n').replace('à', 'a').replace('è', 'e').replace('ç', 'c')
        .trim()
