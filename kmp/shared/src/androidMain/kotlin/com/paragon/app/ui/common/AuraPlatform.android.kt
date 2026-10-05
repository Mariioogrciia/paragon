package com.paragon.app.ui.common

import androidx.compose.ui.graphics.Color
import androidx.palette.graphics.Palette
import coil3.BitmapImage
import coil3.Image

actual fun extractAuraColor(image: Image): Color? {
    if (image !is BitmapImage) return null
    return try {
        val palette = Palette.from(image.bitmap).generate()
        val swatch = palette.vibrantSwatch ?: palette.dominantSwatch ?: palette.mutedSwatch
        swatch?.let { Color(it.rgb) }
    } catch (e: Exception) {
        null
    }
}
