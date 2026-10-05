package com.paragon.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

@Composable
actual fun GlassBackground(modifier: Modifier, fallbackColor: Color) {
    Box(modifier = modifier.background(fallbackColor.copy(alpha = 0.85f)))
}
