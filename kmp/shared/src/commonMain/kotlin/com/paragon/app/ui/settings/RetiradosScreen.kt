package com.paragon.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.CabeceraNativa
import com.paragon.app.ui.common.GrupoNativo
import com.paragon.app.ui.common.SeparadorFila
import com.paragon.app.ui.common.huecoBarra
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.CambiarRetiradoRequest
import com.paragon.shared.red.RetiradosDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

/** Nombre bonito de lo que guarda la plataforma ("PSVITA" → "PS Vita"). */
fun nombreConsola(d: String): String = when (d) {
    "PSVITA" -> "PS Vita"
    "PSPC" -> "PC (PlayStation)"
    "XBOX360", "XBOX 360" -> "Xbox 360"
    "XBOXONE", "XBOX ONE" -> "Xbox One"
    else -> d
}

/**
 * Ajustes → «Lo que ya no tienes» (8 nov 2026, como en la web): las consolas
 * de tu biblioteca con un interruptor, y los juegos ocultos con «Volver a
 * mostrar». Lo retirado no sale en «A un paso del platino» ni en las
 * recomendaciones. Se guarda al tocar; si falla, vuelve a como estaba.
 */
@Composable
fun RetiradosScreen(tokenStore: TokenStore, onBack: () -> Unit) {
    val api = remember(tokenStore) { ApiClient.retiradosApi(tokenStore) }
    val scope = rememberCoroutineScope()
    var datos by remember { mutableStateOf<RetiradosDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        datos = try {
            api.get()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = Textos.t(T.error_red)
            null
        }
    }

    fun cambiar(tipo: String, valor: String, retirado: Boolean, optimista: RetiradosDto) {
        val antes = datos
        datos = optimista
        scope.launch {
            try {
                datos = api.cambiar(CambiarRetiradoRequest(tipo, valor, retirado))
                error = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                datos = antes
                error = Textos.t(T.error_red)
            }
        }
    }

    Column(Modifier.fillMaxSize().background(Background)) {
        CabeceraNativa(titulo = Textos.t(T.retirados_titulo), atras = Textos.t(T.nav_ajustes), onBack = onBack, subtitulo = Textos.t(T.retirados_sub))
        val d = datos
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = huecoBarra() + 24.dp),
        ) {
            if (d == null) {
                Text(error ?: "…", color = Muted, fontSize = 14.sp, modifier = Modifier.padding(16.dp))
                return@Column
            }
            GrupoNativo(titulo = Textos.t(T.retirados_consolas)) {
                d.consolas.forEachIndexed { i, c ->
                    if (i > 0) SeparadorFila(conIcono = false)
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 12.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(nombreConsola(c.dispositivo), color = if (c.retirado) Muted else Foreground, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                            Text(Textos.t(T.retirados_n_juegos, c.juegos), color = Muted, fontSize = 12.sp)
                        }
                        // Encendido = la tienes. Apagarlo la retira.
                        Switch(
                            checked = !c.retirado,
                            onCheckedChange = { laTengo ->
                                cambiar(
                                    "dispositivo", c.dispositivo, !laTengo,
                                    d.copy(consolas = d.consolas.map { if (it.dispositivo == c.dispositivo) it.copy(retirado = !laTengo) else it }),
                                )
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = OnAccent, checkedTrackColor = Accent),
                        )
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
            GrupoNativo(titulo = Textos.t(T.retirados_juegos)) {
                if (d.juegos.isEmpty()) {
                    Text(Textos.t(T.retirados_ninguno), color = Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(16.dp))
                }
                d.juegos.forEachIndexed { i, j ->
                    if (i > 0) SeparadorFila(conIcono = false)
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(j.titulo, color = Foreground, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        TextButton(onClick = { cambiar("juego", j.id, false, d.copy(juegos = d.juegos - j)) }) {
                            Text(Textos.t(T.retirados_volver), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            error?.let { Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(16.dp)) }
        }
    }
}
