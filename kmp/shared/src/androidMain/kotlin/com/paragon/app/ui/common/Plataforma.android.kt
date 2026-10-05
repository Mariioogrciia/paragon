package com.paragon.app.ui.common

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import coil3.request.ImageRequest
import coil3.request.allowHardware

actual fun ImageRequest.Builder.conPixelesLegibles(): ImageRequest.Builder = allowHardware(false)

@Composable
actual fun ManejadorAtras(onBack: () -> Unit) = BackHandler(onBack = onBack)
