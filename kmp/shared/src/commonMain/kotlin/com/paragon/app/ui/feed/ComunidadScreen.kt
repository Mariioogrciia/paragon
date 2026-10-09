package com.paragon.app.ui.feed

import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import com.paragon.app.data.network.ApiClient
import com.paragon.app.util.DestinoQr
import com.paragon.app.util.escanearQr
import com.paragon.app.util.interpretarQr
import com.paragon.shared.red.HttpException
import com.paragon.shared.red.paragonErrorMessage
import kotlinx.coroutines.launch
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.sesiones.SesionesScreen
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.radio
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * Pestaña Comunidad (rediseño del 5 oct 2026, maqueta "4 · Sesiones"): el
 * título y un selector Muro / Sesiones. Las sesiones ya no viven escondidas
 * en un menú: son la mitad de lo que se hace con otros. (Amigos sigue en
 * Ligas, donde ya estaba.) Colores del tema.
 */
@Composable
fun ComunidadScreen(
    tokenStore: TokenStore,
    themeStore: ThemeStore,
    onCompareClick: (String) -> Unit,
    onAbrirSesion: (String) -> Unit,
    onAbrirPerfil: (String) -> Unit,
) {
    var seccion by rememberSaveable { mutableIntStateOf(0) }
    val contexto = com.paragon.shared.contextoPlataforma()
    val scope = rememberCoroutineScope()
    var avisoQr by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().background(Background)) {
        com.paragon.app.ui.common.CabeceraNativa(titulo = Textos.t(T.feed_titulo)) {
            // Lector de QR (diseño v2): un perfil te envía la solicitud de amistad; una sesión se abre.
            IconButton(onClick = {
                escanearQr(contexto) { texto ->
                    when (val destino = interpretarQr(texto)) {
                        is DestinoQr.Sesion -> onAbrirSesion(destino.id)
                        is DestinoQr.Perfil -> scope.launch {
                            avisoQr = try {
                                val r = ApiClient.amigosApi(tokenStore).enviar(destino.handle)
                                if (r.amigos) Textos.t(T.amigos_ya_sois, destino.handle) else Textos.t(T.amigos_enviada, destino.handle)
                            } catch (e: HttpException) {
                                e.paragonErrorMessage() ?: Textos.t(T.error_conexion)
                            } catch (e: Exception) {
                                Textos.t(T.error_conexion)
                            }
                        }
                        null -> avisoQr = Textos.t(T.qr_no_valido)
                    }
                }
            }) {
                Icon(Icons.Default.QrCodeScanner, contentDescription = Textos.t(T.qr_escanear), tint = Foreground)
            }
        }
        avisoQr?.let { Text(it, color = Accent, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) }
        com.paragon.app.ui.common.ControlSegmentado(
            opciones = listOf(Textos.t(T.comunidad_muro), Textos.t(T.nav_sesiones)),
            seleccion = seccion,
            onCambio = { seccion = it },
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
        )
        Box(Modifier.weight(1f)) {
            if (seccion == 0) {
                FeedScreen(tokenStore, themeStore, onCompareClick = onCompareClick, onAbrirPerfil = onAbrirPerfil, conTitulo = false)
            } else {
                SesionesScreen(tokenStore = tokenStore, onBack = {}, onAbrir = onAbrirSesion, embebida = true)
            }
        }
    }
}
