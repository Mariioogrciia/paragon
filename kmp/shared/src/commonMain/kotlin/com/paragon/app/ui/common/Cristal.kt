package com.paragon.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.SurfaceSolida
import com.paragon.app.data.theme.ThemeMode
import com.paragon.app.ui.theme.modoActivo
import dev.chrisbanes.haze.HazeInput
import dev.chrisbanes.haze.HazeSourceSelection
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.glass.GlassStyle
import dev.chrisbanes.haze.glass.hazeGlass

/** "Reducir transparencia" del sistema (iOS). Android no tiene ese ajuste. */
expect fun reducirTransparenciaSistema(): Boolean

/**
 * ¿Se pinta cristal? No con "Reducir transparencia" del sistema ni en el
 * modo contraste alto de la app: los dos existen para que el texto se lea
 * sobre un fondo liso, y el cristal deja ver lo de detrás.
 */
fun cristalPermitido(): Boolean = modoActivo != ThemeMode.CONTRASTE && !reducirTransparenciaSistema()

/**
 * Cristal líquido (haze-glass) sobre lo que pinta `estado` por detrás, como
 * la barra de abajo. Solo para piezas pequeñas que flotan sobre contenido
 * que se mueve (portadas, listas): sobre el fondo liso no se nota y cuesta
 * una pasada de desenfoque. Sin cristal permitido, fondo opaco.
 */
@Composable
fun Modifier.cristal(
    estado: HazeState,
    forma: RoundedCornerShape,
    tinte: Color = Surface2,
    alfaTinte: Float = 0.4f,
    desenfoque: Dp = 10.dp,
    // Por defecto Haze solo coge las fuentes "de detrás" según su zIndex. Una
    // pantalla con su propio estado (la ficha: su lista es la fuente y el
    // cristal va encima, fuera de ella) puede pedir `All`. Nunca con el
    // cristal DENTRO de la fuente: se pinta a sí mismo sin fin y la app cae.
    seleccion: HazeSourceSelection = HazeSourceSelection.Behind,
): Modifier =
    if (cristalPermitido()) {
        hazeGlass(
            HazeInput.Sources(estado, seleccion),
            GlassStyle {
                shape(forma)
                backgroundColor(Background)
                tint(tinte.copy(alpha = alfaTinte))
                optics(blurRadius = desenfoque)
            },
        )
    } else {
        background(SurfaceSolida, forma)
    }
