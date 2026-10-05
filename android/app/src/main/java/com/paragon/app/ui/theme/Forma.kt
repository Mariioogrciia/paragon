package com.paragon.app.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Radio de esquina según el estilo elegido (4 oct 2026). La web lo hace con
 * `[class*="rounded"] { border-radius: Npx }` sobre toda la página; aquí
 * todas las piezas piden su radio con `radio(N)` en vez de `N.dp`, y el
 * estilo decide: Clásico respeta el de cada pieza, Terminal 2, Brutalista
 * 0, Vidrio 22, PS5 20, Switch 14, Xbox 8, Steam 6. Lo totalmente redondo
 * (avatares, puntos, chips) usa `CircleShape` y no cambia.
 *
 * Lee estado de Compose (`estiloActivo`): cambiar de estilo recompone.
 */
fun radio(clasico: Int): Dp = (estiloActivo.radio ?: clasico).dp
