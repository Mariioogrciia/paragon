package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.Color
import com.paragon.app.util.DestinoQr
import com.paragon.app.util.enlacePerfil
import com.paragon.app.util.escanearQr
import com.paragon.app.util.interpretarQr
import com.paragon.shared.contextoPlataforma
import io.github.alexzhirkevich.qrose.rememberQrCodePainter
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.AvatarPersona
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.OnAccent
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.radio
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.HttpException
import com.paragon.shared.red.SolicitudAmistadDto
import com.paragon.shared.red.paragonErrorMessage
import kotlinx.coroutines.launch

/**
 * Arriba de la pestaña Amigos (5 oct 2026): añadir por @usuario y las
 * solicitudes que te han enviado, con Aceptar/Rechazar. Antes la app solo
 * enseñaba la lista: no había forma de hacer amigos desde el móvil.
 * `onCambio`: recargar la lista de amigos cuando alguien entra.
 */
@Composable
fun AmigosCabecera(
    tokenStore: TokenStore,
    onCambio: () -> Unit,
    modifier: Modifier = Modifier,
    miHandle: String? = null,
    onAbrirSesion: ((String) -> Unit)? = null,
    /**
     * Qué parte enseñar (7 oct 2026: antes todo junto encima de la lista y el
     * QR se comía la pantalla): SOLICITUDES o ANADIR (QR, escanear y @usuario).
     * null = todo, como antes (para quien la use fuera de Amigos).
     */
    seccion: SeccionAmigos? = null,
) {
    val contexto = contextoPlataforma()
    val scope = rememberCoroutineScope()
    var handle by remember { mutableStateOf("") }
    var mensaje by remember { mutableStateOf<Pair<String, Boolean>?>(null) } // texto, ¿error?
    var enviando by remember { mutableStateOf(false) }
    var pendientes by remember { mutableStateOf<List<SolicitudAmistadDto>>(emptyList()) }
    var recarga by remember { mutableIntStateOf(0) }

    LaunchedEffect(recarga) {
        pendientes = try { ApiClient.amigosApi(tokenStore).pendientes().pendientes } catch (e: Exception) { emptyList() }
    }

    fun enviar() {
        val limpio = handle.trim().removePrefix("@")
        if (limpio.equals(miHandle, ignoreCase = true)) {
            mensaje = Textos.t(T.qr_eres_tu) to true
            handle = ""
            return
        }
        if (limpio.isEmpty() || enviando) return
        enviando = true
        mensaje = null
        scope.launch {
            mensaje = try {
                val r = ApiClient.amigosApi(tokenStore).enviar(limpio)
                handle = ""
                if (r.amigos) onCambio()
                (if (r.amigos) Textos.t(T.amigos_ya_sois, limpio) else Textos.t(T.amigos_enviada, limpio)) to false
            } catch (e: HttpException) {
                (e.paragonErrorMessage() ?: Textos.t(T.error_conexion)) to true
            } catch (e: Exception) {
                Textos.t(T.error_conexion) to true
            }
            enviando = false
        }
    }

    // Lo que se lee con el QR: un perfil se agrega como amigo; una sesión, se abre.
    fun alLeer(texto: String) {
        when (val destino = interpretarQr(texto)) {
            is DestinoQr.Perfil -> { handle = destino.handle; enviar() }
            is DestinoQr.Sesion -> if (onAbrirSesion != null) onAbrirSesion(destino.id) else mensaje = Textos.t(T.qr_no_valido) to true
            null -> mensaje = Textos.t(T.qr_no_valido) to true
        }
    }

    Column(modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)) {
        val forma = RoundedCornerShape(radio(12))
        if (seccion != SeccionAmigos.SOLICITUDES) {
        // Tu código QR (diseño v2): quien lo escanee te envía la solicitud. También
        // vale con la cámara normal del móvil: abre tu perfil en la web.
        if (!miHandle.isNullOrBlank()) {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(20))).background(Surface).border(1.dp, Border, RoundedCornerShape(radio(20))).padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(112.dp).clip(RoundedCornerShape(radio(14))).background(Color.White).padding(10.dp)) {
                    Image(
                        painter = rememberQrCodePainter(enlacePerfil(miHandle)),
                        contentDescription = Textos.t(T.qr_tu_codigo),
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                Column(Modifier.weight(1f).padding(start = 16.dp)) {
                    Text(Textos.t(T.qr_tu_codigo), color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Text(Textos.t(T.qr_tu_codigo_sub), color = Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 4.dp))
                    Text("@$miHandle", color = Accent, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp))
                }
            }
            Spacer(Modifier.height(10.dp))
        }
        Row(
            Modifier.fillMaxWidth().height(50.dp).clip(RoundedCornerShape(radio(16))).background(Accent)
                .premiumClickable { escanearQr(contexto) { alLeer(it) } },
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.QrCodeScanner, contentDescription = null, tint = OnAccent, modifier = Modifier.size(20.dp))
            Text(Textos.t(T.qr_escanear), color = OnAccent, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
        }
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            BasicTextField(
                value = handle,
                onValueChange = { handle = it.take(30) },
                singleLine = true,
                textStyle = TextStyle(color = Foreground, fontSize = 15.sp),
                cursorBrush = SolidColor(Accent),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { enviar() }),
                modifier = Modifier.weight(1f),
                decorationBox = { campo ->
                    Box(
                        Modifier.fillMaxWidth().height(44.dp).clip(forma).background(Surface).border(1.dp, Border, forma).padding(horizontal = 12.dp),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        if (handle.isEmpty()) Text(Textos.t(T.amigos_placeholder), color = Muted, fontSize = 15.sp)
                        campo()
                    }
                },
            )
            Spacer(Modifier.width(8.dp))
            Box(
                Modifier.height(44.dp).clip(forma).background(if (handle.isBlank() || enviando) Surface else Accent)
                    .premiumClickable(enabled = handle.isNotBlank() && !enviando) { enviar() }
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    Textos.t(T.amigos_anadir),
                    color = if (handle.isBlank() || enviando) Muted else OnAccent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
            }
        }
        mensaje?.let { (texto, error) ->
            Text(texto, color = if (error) com.paragon.app.ui.theme.Danger else Accent, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
        }
        }

        if (seccion == SeccionAmigos.SOLICITUDES && pendientes.isEmpty()) {
            com.paragon.app.ui.common.EmptyState(
                icon = Icons.Default.PersonAdd,
                title = Textos.t(T.amigos_sin_solicitudes),
                description = Textos.t(T.amigos_sin_solicitudes_sub),
            )
        }
        if (seccion != SeccionAmigos.ANADIR && pendientes.isNotEmpty()) {
            Text(
                Textos.t(T.amigos_solicitudes).uppercase(),
                color = Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                pendientes.forEach { p ->
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(14))).background(Surface).padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AvatarPersona(p.image, p.name ?: p.handle, size = 36.dp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(p.name ?: "@${p.handle}", color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            p.handle?.let { Text("@$it", color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                        }
                        Text(
                            Textos.t(T.comun_rechazar),
                            color = Muted,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.premiumClickable {
                                scope.launch {
                                    try { ApiClient.amigosApi(tokenStore).quitar(p.userId) } catch (e: Exception) {}
                                    recarga++
                                }
                            }.padding(8.dp),
                        )
                        Box(
                            Modifier.clip(RoundedCornerShape(50)).background(Accent)
                                .premiumClickable {
                                    scope.launch {
                                        try { ApiClient.amigosApi(tokenStore).aceptar(p.userId) } catch (e: Exception) {}
                                        recarga++
                                        onCambio()
                                    }
                                }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        ) { Text(Textos.t(T.comun_aceptar), color = OnAccent, fontSize = 13.sp, fontWeight = FontWeight.Bold) }
                    }
                }
            }
        }
    }
}

/** Las partes de Amigos que no son la lista: ver AmigosCabecera(seccion). */
enum class SeccionAmigos { SOLICITUDES, ANADIR }
