package com.paragon.app.ui.asistente

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.CabeceraNativa
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.PreguntaRequest
import com.paragon.shared.red.TurnoAsistenteDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

private data class Mensaje(val deMi: Boolean, val texto: String, val error: Boolean = false)

/**
 * "Pregúntale a Paragon" en la app (6 nov 2026, como ChatParagon.tsx en la
 * web): preguntas en lenguaje normal sobre tu biblioteca, que contesta Claude
 * con tus datos (lib/asistente.ts). La conversación vive solo en pantalla.
 */
@Composable
fun PreguntarScreen(tokenStore: TokenStore, atras: String, onBack: () -> Unit) {
    val api = remember(tokenStore) { ApiClient.novedadesApi(tokenStore) }
    val scope = rememberCoroutineScope()
    val mensajes = remember { mutableStateListOf<Mensaje>() }
    var texto by remember { mutableStateOf("") }
    var pensando by remember { mutableStateOf(false) }
    var activo by remember { mutableStateOf<Boolean?>(null) }
    val lista = rememberLazyListState()

    LaunchedEffect(Unit) {
        activo = try {
            api.asistenteActivo().activo
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            true // sin red: que se vea; el error sale al preguntar
        }
    }
    LaunchedEffect(mensajes.size, pensando) {
        if (mensajes.isNotEmpty()) lista.animateScrollToItem(mensajes.size - 1 + if (pensando) 1 else 0)
    }

    fun enviar(pregunta: String) {
        val limpia = pregunta.trim()
        if (limpia.isEmpty() || pensando) return
        val historial = mensajes.filter { !it.error }.takeLast(6).map { TurnoAsistenteDto(if (it.deMi) "user" else "assistant", it.texto) }
        mensajes.add(Mensaje(true, limpia))
        texto = ""
        pensando = true
        scope.launch {
            val respuesta = try {
                val r = api.preguntar(PreguntaRequest(limpia, historial))
                if (r.ok && r.texto != null) Mensaje(false, r.texto.replace("**", ""))
                else Mensaje(
                    false,
                    Textos.t(
                        when (r.motivo) {
                            "limite" -> T.asistente_error_limite
                            "rechazo" -> T.asistente_error_rechazo
                            "inactivo" -> T.asistente_inactivo
                            else -> T.asistente_error_fallo
                        },
                    ),
                    error = true,
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Mensaje(false, Textos.t(T.error_conexion), error = true)
            }
            mensajes.add(respuesta)
            pensando = false
        }
    }

    Column(Modifier.fillMaxSize().background(Background).imePadding()) {
        CabeceraNativa(titulo = Textos.t(T.asistente_titulo), atras = atras, onBack = onBack)
        if (activo == false) {
            Text(Textos.t(T.asistente_inactivo), color = Muted, fontSize = 14.sp, modifier = Modifier.padding(20.dp))
            return@Column
        }
        LazyColumn(
            state = lista,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (mensajes.isEmpty()) {
                item { Text(Textos.t(T.asistente_descripcion), color = Muted, fontSize = 14.sp, lineHeight = 20.sp) }
                items(listOf(T.asistente_ejemplo1, T.asistente_ejemplo2, T.asistente_ejemplo3, T.asistente_ejemplo4)) { ejemplo ->
                    val frase = Textos.t(ejemplo)
                    Text(
                        frase,
                        color = Foreground,
                        fontSize = 14.sp,
                        modifier = Modifier.fillMaxWidth()
                            .background(Surface, RoundedCornerShape(radio(14)))
                            .border(1.dp, Border, RoundedCornerShape(radio(14)))
                            .clickable { enviar(frase) }
                            .padding(14.dp),
                    )
                }
            }
            items(mensajes) { m -> Burbuja(m) }
            if (pensando) item { Text(Textos.t(T.asistente_pensando), color = Muted, fontSize = 13.sp) }
        }
        Text(Textos.t(T.asistente_aviso), color = Muted, fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(horizontal = 20.dp))
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 12.dp + com.paragon.app.ui.common.huecoBarra()),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = texto,
                onValueChange = { if (it.length <= 1000) texto = it },
                placeholder = { Text(Textos.t(T.asistente_placeholder), color = Muted, fontSize = 14.sp) },
                modifier = Modifier.weight(1f).heightIn(min = 52.dp),
                maxLines = 4,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { enviar(texto) }),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground,
                ),
            )
            IconButton(enabled = !pensando && texto.isNotBlank(), onClick = { enviar(texto) }) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = Textos.t(T.asistente_enviar), tint = if (texto.isNotBlank()) Accent else Muted)
            }
        }
    }
}

@Composable
private fun Burbuja(m: Mensaje) {
    Box(Modifier.fillMaxWidth(), contentAlignment = if (m.deMi) Alignment.CenterEnd else Alignment.CenterStart) {
        Text(
            m.texto,
            color = if (m.error) Danger else if (m.deMi) OnAccent else Foreground,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            modifier = Modifier.widthIn(max = 320.dp)
                .background(if (m.deMi) Accent else Surface, RoundedCornerShape(radio(16)))
                .padding(horizontal = 14.dp, vertical = 10.dp),
        )
    }
}
