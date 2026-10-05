package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import coil3.compose.LocalPlatformContext
import coil3.SingletonImageLoader
import coil3.request.ImageRequest
import coil3.request.SuccessResult

/**
 * Color dominante de una carátula ("Game Aura") — antes cada Hero Card (y
 * la Ficha de juego) descargaba la portada A MANO con `java.net.URL(...)
 * .openConnection()` y la decodificaba entera solo para sacar un color,
 * IGNORANDO que el propio `AsyncImage` de al lado ya está pidiendo esa
 * MISMA imagen a Coil — doble descarga de red y doble decodificación de
 * bitmap por cada tarjeta visible. Pasar por `context.imageLoader` (mismo
 * patrón que ya usa `FriendProfileBottomSheet.kt` para el fondo del
 * perfil) hace que esto sea un acierto de caché, no una descarga nueva,
 * cuando la carátula ya se pidió antes en la misma sesión.
 */
@Composable
fun rememberCoverAuraColor(coverUrl: String?): Color? {
    var aura by remember(coverUrl) { mutableStateOf<Color?>(null) }
    val context = LocalPlatformContext.current

    LaunchedEffect(coverUrl) {
        if (coverUrl.isNullOrBlank()) return@LaunchedEffect
        try {
            val request = ImageRequest.Builder(context)
                .data(coverUrl)
                .conPixelesLegibles()
                .build()
            val result = SingletonImageLoader.get(context).execute(request)
            val image = (result as? SuccessResult)?.image
            if (image != null) {
                val color = extractAuraColor(image)
                if (color != null) aura = color
            }
        } catch (e: Exception) {
            // Se queda en null — la tarjeta sigue con su degradado neutro.
        }
    }
    return aura
}
