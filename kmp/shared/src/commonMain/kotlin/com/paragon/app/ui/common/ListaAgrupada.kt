package com.paragon.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.radio

/**
 * Lista agrupada, como Ajustes en iPhone (diseño v2, 5 oct 2026): un título
 * pequeño en mayúsculas encima y las filas dentro de una tarjeta, separadas
 * por una línea fina. Las filas van con [FilaNativa] y [SeparadorFila].
 */
@Composable
fun GrupoNativo(
    modifier: Modifier = Modifier,
    titulo: String? = null,
    contenido: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier.fillMaxWidth()) {
        if (titulo != null) {
            Text(
                titulo.uppercase(),
                color = Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(start = 16.dp, bottom = 8.dp),
            )
        }
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(18))).background(Surface), content = contenido)
    }
}

/** Una fila de [GrupoNativo]: icono en una baldosa del acento, texto (una o dos líneas), valor y flecha. */
@Composable
fun FilaNativa(
    titulo: String,
    modifier: Modifier = Modifier,
    icono: ImageVector? = null,
    subtitulo: String? = null,
    valor: String? = null,
    onClick: (() -> Unit)? = null,
) {
    Row(
        modifier.fillMaxWidth()
            .then(if (onClick != null) Modifier.premiumClickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) {
            Box(Modifier.size(34.dp).clip(RoundedCornerShape(radio(10))).background(AccentSoft), contentAlignment = Alignment.Center) {
                Icon(icono, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp))
            }
        }
        Column(Modifier.weight(1f).padding(start = if (icono != null) 12.dp else 0.dp)) {
            Text(titulo, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (subtitulo != null) {
                Text(subtitulo, color = Muted, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 1.dp))
            }
        }
        if (valor != null) {
            Text(valor, color = Muted, fontSize = 14.sp, maxLines = 1, modifier = Modifier.padding(start = 8.dp))
        }
        if (onClick != null) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Muted.copy(alpha = 0.6f), modifier = Modifier.size(20.dp))
        }
    }
}

/** La línea fina entre filas, sangrada como en iPhone (empieza donde empieza el texto). */
@Composable
fun SeparadorFila(conIcono: Boolean = true) {
    HorizontalDivider(color = Border, thickness = 0.5.dp, modifier = Modifier.padding(start = if (conIcono) 62.dp else 16.dp))
}
