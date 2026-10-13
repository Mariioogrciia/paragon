package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.backhandler.BackHandler
import coil3.request.ImageRequest

actual fun ImageRequest.Builder.conPixelesLegibles(): ImageRequest.Builder = this

/**
 * El gesto de volver de iOS (deslizar desde el borde izquierdo) llega aquí
 * igual que el botón atrás de Android: Compose lo recibe del
 * ComposeUIViewController. `BackHandler` está marcado como obsoleto en favor
 * de NavigationEventHandler, pero hace lo mismo y es la API estable de
 * Compose 1.12 para esto.
 */
@OptIn(ExperimentalComposeUiApi::class)
@Suppress("DEPRECATION")
@Composable
actual fun ManejadorAtras(onBack: () -> Unit) = BackHandler(onBack = onBack)
