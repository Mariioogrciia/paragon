package com.paragon.app.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Lo que ocupa la barra flotante de abajo (con la barra de gestos del
 * sistema). El contenido pasa POR DETRÁS de la barra, que es de cristal
 * (desenfoca lo que tiene detrás, como Instagram): cada lista lo suma a su
 * relleno inferior para que lo último no quede tapado. 0 donde no hay barra
 * (tablet con barra lateral, hojas).
 */
val LocalHuecoBarra = compositionLocalOf { 0.dp }

@Composable
fun huecoBarra(): Dp = LocalHuecoBarra.current
