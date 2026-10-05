package com.paragon.app.ui.common

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.R
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted

/**
 * Botón "Volver" visible en la cabecera de una hoja inferior (clan, liga...).
 * Antes solo se cerraban deslizando hacia abajo o con el gesto de Atrás, y
 * quien no lo sabía no veía cómo salir (5 oct 2026).
 */
@Composable
fun CabeceraHoja(onBack: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().offset(x = (-12).dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.comun_volver), tint = Foreground)
        }
        Text(stringResource(R.string.comun_volver), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(start = 0.dp))
    }
}
