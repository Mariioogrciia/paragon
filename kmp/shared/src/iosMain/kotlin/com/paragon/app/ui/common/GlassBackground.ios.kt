package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.interop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import platform.UIKit.UIBlurEffect
import platform.UIKit.UIBlurEffectStyle
import platform.UIKit.UIVisualEffectView

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun GlassBackground(modifier: Modifier, fallbackColor: Color) {
    UIKitView(
        factory = {
            val blurEffect = UIBlurEffect.effectWithStyle(UIBlurEffectStyle.UIBlurEffectStyleSystemChromeMaterialDark)
            UIVisualEffectView(effect = blurEffect)
        },
        modifier = modifier,
        update = {}
    )
}
