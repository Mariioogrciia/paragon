package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import coil3.request.ImageRequest

/**
 * En Android, Palette necesita leer los píxeles uno a uno, cosa que un
 * bitmap "hardware" (el que Coil usa por defecto) no permite; en iOS no
 * hace falta nada.
 */
expect fun ImageRequest.Builder.conPixelesLegibles(): ImageRequest.Builder

/** El botón/gesto de atrás del sistema (Android); en iOS cada pantalla tiene su botón. */
@Composable
expect fun ManejadorAtras(onBack: () -> Unit)
