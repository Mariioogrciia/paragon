package com.paragon.app.ui.common

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Muted
import com.paragon.shared.ContextoPlataforma
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * Anuncios en la app (19 oct 2026). El SDK de AdMob y el consentimiento
 * (UMP) solo existen en la app de Android (androidApp, anuncios/Publicidad.kt):
 * al arrancar, si está configurada y la persona ha decidido sobre el
 * consentimiento, rellena esto. Mientras siga vacío (iOS, o Android sin
 * ADMOB_APP_ID al compilar) no se pinta ningún hueco.
 */
object Anuncios {
    /** El banner nativo de la plataforma; null = sin anuncios. */
    var banner: (@Composable (Modifier) -> Unit)? by mutableStateOf(null)

    /**
     * Vuelve a abrir el formulario de consentimiento. Solo existe cuando la
     * ley lo pide (Europa): entonces Ajustes enseña "Privacidad de los anuncios".
     */
    var opcionesPrivacidad: ((ContextoPlataforma) -> Unit)? by mutableStateOf(null)
}

/** Un bloque de anuncio con su rótulo, o nada si no hay anuncios. */
@Composable
fun HuecoAnuncio(modifier: Modifier = Modifier) {
    val banner = Anuncios.banner ?: return
    Column(modifier.fillMaxWidth()) {
        Text(Textos.t(T.anuncio_rotulo), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(bottom = 4.dp))
        banner(Modifier.fillMaxWidth())
    }
}
