package com.paragon.app.ui.avisos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.ahoraMillis
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.isoAMillis
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.CabeceraNativa
import com.paragon.app.ui.common.huecoBarra
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.common.urlImagenSegura
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.AvisoDto
import kotlinx.coroutines.CancellationException

/**
 * Bandeja de avisos (16 oct 2026, ver src/lib/bandeja.ts): lo mismo que
 * llega por push (solicitudes de amistad, adelantos en la liga, trofeos,
 * sesiones...) más los platinos de los amigos, que solo salen aquí. Se abre
 * con la campana de Inicio; al abrirla, todo pasa a leído. Tocar un aviso
 * lleva a su pantalla, igual que tocar la push (`rutaAppDeAviso`).
 */
@Composable
fun AvisosScreen(
    tokenStore: TokenStore,
    onBack: () -> Unit,
    onAbrirRutaWeb: (String) -> Unit,
    onAjustes: () -> Unit,
) {
    var avisos by remember { mutableStateOf<List<AvisoDto>?>(null) }
    var error by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            val api = ApiClient.avisosApi(tokenStore)
            val datos = api.avisos()
            avisos = datos.avisos
            if (datos.noLeidos > 0) runCatching { api.marcarLeidos() }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            error = true
        }
    }

    Column(Modifier.fillMaxSize().background(Background)) {
        CabeceraNativa(titulo = Textos.t(T.avisos_titulo), atras = Textos.t(T.nav_panel), onBack = onBack) {
            // Qué avisos recibir (PreferenciasAvisosScreen).
            androidx.compose.material3.IconButton(onClick = onAjustes) {
                Icon(Icons.Default.Settings, contentDescription = Textos.t(T.ajustes_avisos_fila), tint = Foreground)
            }
        }
        val lista = avisos
        when {
            error -> Mensaje(Textos.t(T.error_red))
            lista == null -> com.paragon.app.ui.common.EsqueletoTarjetas()
            lista.isEmpty() -> Mensaje(Textos.t(T.avisos_vacio))
            else -> LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = huecoBarra() + 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(lista, key = { it.id }) { aviso ->
                    FilaAviso(aviso) { aviso.ruta?.let(onAbrirRutaWeb) }
                }
            }
        }
    }
}

@Composable
private fun Mensaje(texto: String) {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(texto, color = Muted, fontSize = 14.sp, lineHeight = 20.sp)
    }
}

@Composable
private fun FilaAviso(aviso: AvisoDto, onClick: () -> Unit) {
    val forma = RoundedCornerShape(radio(16))
    Row(
        Modifier
            .fillMaxWidth()
            .clip(forma)
            .background(if (aviso.leido) Surface else Accent.copy(alpha = 0.08f))
            .premiumClickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier.size(44.dp).clip(RoundedCornerShape(radio(10))).background(Surface2),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.Notifications, contentDescription = null, tint = Muted, modifier = Modifier.size(18.dp))
            urlImagenSegura(aviso.imagen)?.let {
                AsyncImage(model = it, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
        }
        Column(Modifier.weight(1f).padding(start = 12.dp)) {
            Text(aviso.titulo, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, lineHeight = 18.sp)
            Text(
                aviso.texto,
                color = Muted,
                fontSize = 13.sp,
                lineHeight = 17.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
            haceCuanto(aviso.createdAt)?.let {
                Spacer(Modifier.height(4.dp))
                Text(it, color = Muted, fontSize = 11.sp)
            }
        }
        if (!aviso.leido) {
            Box(Modifier.padding(start = 8.dp, top = 6.dp).size(8.dp).background(Accent, CircleShape))
        }
    }
}

private fun haceCuanto(iso: String): String? {
    val millis = isoAMillis(iso) ?: return null
    val minutos = ((ahoraMillis() - millis) / 60_000).coerceAtLeast(0)
    return when {
        minutos < 1 -> Textos.t(T.tiempo_ahora)
        minutos < 60 -> Textos.t(T.tiempo_min, minutos)
        minutos < 60 * 24 -> Textos.t(T.tiempo_h, minutos / 60)
        else -> Textos.t(T.tiempo_d, minutos / (60 * 24))
    }
}
