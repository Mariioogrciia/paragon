package com.paragon.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface2

/**
 * La foto de una persona, igual en toda la app. Debajo va siempre la inicial:
 * si la foto no llega (sin red, enlace caído, bloqueada) se queda la inicial
 * en vez de un círculo vacío.
 *
 * Las fotos antiguas de PSN vienen en `http://` (static-resource.np.community
 * .playstation.net), que Android e iOS bloquean por defecto; el mismo
 * servidor responde por `https`, así que se piden siempre así.
 */
@Composable
fun AvatarPersona(
    url: String?,
    nombre: String?,
    size: Dp = 40.dp,
    modifier: Modifier = Modifier,
    colorInicial: Color = Muted,
    fondo: Color = Surface2,
) {
    Box(
        modifier = modifier.size(size).clip(CircleShape).background(fondo),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = nombre?.trim()?.firstOrNull()?.uppercase() ?: "?",
            color = colorInicial,
            fontWeight = FontWeight.Bold,
            fontSize = (size.value / 2.4f).sp,
        )
        val segura = urlImagenSegura(url)
        if (segura != null) {
            AsyncImage(
                model = segura,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}

/** `http://` → `https://` (iOS y Android bloquean http); vacía → null. */
fun urlImagenSegura(url: String?): String? = when {
    url.isNullOrBlank() -> null
    url.startsWith("http://") -> "https://" + url.removePrefix("http://")
    else -> url
}
