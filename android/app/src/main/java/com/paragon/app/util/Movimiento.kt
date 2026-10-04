package com.paragon.app.util

import android.provider.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/**
 * true si la persona ha quitado las animaciones del sistema (Accesibilidad →
 * "Quitar animaciones", o la escala de animación a 0 en Opciones de
 * desarrollador). Las animaciones con fin ya las acorta el propio sistema;
 * las infinitas (pulsos, brillos) hay que pararlas a mano con esto.
 */
@Composable
fun animacionesReducidas(): Boolean {
    val context = LocalContext.current
    return remember(context) {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
}
