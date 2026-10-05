package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import coil3.request.ImageRequest

actual fun ImageRequest.Builder.conPixelesLegibles(): ImageRequest.Builder = this

@Composable
actual fun ManejadorAtras(onBack: () -> Unit) {}
