package com.paragon.app.ui.settings

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.core.os.LocaleListCompat
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.R
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.radio

/**
 * Idioma de la app (Ajustes, 5 oct 2026): antes solo se cambiaba desde los
 * ajustes del teléfono, que casi nadie encuentra. Mismos cuatro idiomas que
 * la web. Cada idioma se escribe en su propio idioma (si alguien se queda en
 * uno que no entiende, tiene que poder reconocer el suyo). "Automático" sigue
 * al teléfono. Va con `AppCompatDelegate.setApplicationLocales`: en Android
 * 13+ delega en el sistema (y aparece también en Ajustes → Apps → Paragon),
 * y por debajo lo guarda AppCompat (ver AppLocalesMetadataHolderService en el
 * manifiesto). Cambiarlo recrea la pantalla al momento.
 */
private val IDIOMAS = listOf("es" to "Español", "en" to "English", "de" to "Deutsch", "fr" to "Français")

private fun idiomaActual(): String =
    AppCompatDelegate.getApplicationLocales().takeIf { !it.isEmpty }?.get(0)?.language.orEmpty()

@Composable
fun IdiomaSelector() {
    var abierto by remember { mutableStateOf(false) }
    var actual by remember { mutableStateOf(idiomaActual()) }
    val automatico = stringResource(R.string.ajustes_idioma_auto)
    val nombre = IDIOMAS.firstOrNull { it.first == actual }?.second ?: automatico

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(14)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(14)))
            .clickable(role = Role.Button) { abierto = true }
            .heightIn(min = 56.dp)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(stringResource(R.string.ajustes_idioma), color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text(nombre, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Muted)
    }

    if (abierto) {
        AlertDialog(
            onDismissRequest = { abierto = false },
            containerColor = Surface,
            title = { Text(stringResource(R.string.ajustes_idioma), color = Foreground, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    (listOf("" to automatico) + IDIOMAS).forEach { (codigo, texto) ->
                        val activo = codigo == actual
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(radio(10)))
                                .background(if (activo) AccentSoft else androidx.compose.ui.graphics.Color.Transparent)
                                .clickable(role = Role.RadioButton) {
                                    abierto = false
                                    actual = codigo
                                    AppCompatDelegate.setApplicationLocales(
                                        if (codigo.isEmpty()) LocaleListCompat.getEmptyLocaleList() else LocaleListCompat.forLanguageTags(codigo),
                                    )
                                }
                                .semantics { selected = activo }
                                .heightIn(min = 48.dp)
                                .padding(horizontal = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(texto, color = if (activo) Accent else Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            if (activo) Icon(Icons.Default.Check, contentDescription = null, tint = Accent, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { abierto = false }) { Text(stringResource(R.string.comun_cerrar), color = Muted) }
            },
        )
    }
}
