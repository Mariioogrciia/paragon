package com.paragon.app.ui.social

import androidx.compose.foundation.background
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
fun AmigosCabecera(tokenStore: TokenStore, onCambio: () -> Unit, modifier: Modifier = Modifier) {
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

    Column(modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp)) {
        val forma = RoundedCornerShape(radio(12))
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
            Text(texto, color = if (error) androidx.compose.ui.graphics.Color(0xFFE57373) else Accent, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
        }

        if (pendientes.isNotEmpty()) {
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
