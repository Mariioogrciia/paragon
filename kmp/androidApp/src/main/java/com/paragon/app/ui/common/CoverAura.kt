package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.palette.graphics.Palette
import coil3.BitmapImage
import coil3.imageLoader
import coil3.request.ImageRequest
import coil3.request.SuccessResult
import coil3.request.allowHardware

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
    val context = LocalContext.current

    LaunchedEffect(coverUrl) {
        if (coverUrl.isNullOrBlank()) return@LaunchedEffect
        try {
            val request = ImageRequest.Builder(context)
                .data(coverUrl)
                .allowHardware(false)
                .build()
            val result = context.imageLoader.execute(request)
            val image = (result as? SuccessResult)?.image
            if (image is BitmapImage) {
                val palette = Palette.from(image.bitmap).generate()
                val swatch = palette.vibrantSwatch ?: palette.dominantSwatch ?: palette.mutedSwatch
                if (swatch != null) aura = Color(swatch.rgb)
            }
        } catch (e: Exception) {
            // Se queda en null — la tarjeta sigue con su degradado neutro.
        }
    }
    return aura
}
