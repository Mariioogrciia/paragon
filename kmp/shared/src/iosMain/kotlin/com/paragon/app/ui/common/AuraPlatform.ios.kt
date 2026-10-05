package com.paragon.app.ui.common

import androidx.compose.ui.graphics.Color
import coil3.Image

actual fun extractAuraColor(image: Image): Color? {
    // In iOS we can use a custom extraction or simply fallback to the image background
    return null
}
