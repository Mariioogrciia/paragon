package com.paragon.app.util

import androidx.compose.runtime.Composable
import platform.UIKit.UIAccessibilityIsReduceMotionEnabled

@Composable
actual fun animacionesReducidas(): Boolean {
    return UIAccessibilityIsReduceMotionEnabled()
}
