package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

/**
 * Fondo premium (Glassmorphism):
 * - En iOS: usa UIVisualEffectView nativo para un desenfoque de sistema perfecto.
 * - En Android: usa un fondo traslúcido normal como fallback.
 */
@Composable
expect fun GlassBackground(modifier: Modifier = Modifier, fallbackColor: Color)
