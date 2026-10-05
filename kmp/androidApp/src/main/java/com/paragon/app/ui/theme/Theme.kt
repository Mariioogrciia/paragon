package com.paragon.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.Density
import com.paragon.app.data.theme.ThemeMode
import com.paragon.app.data.theme.ThemeStore

/**
 * Tema de la app a partir de la apariencia elegida (ThemeStore), con el
 * mismo modelo que la web: modo, acento/paleta/color libre/paleta de juego,
 * estilo y tamaño de texto. Material You (Android 12+) es un extra del
 * móvil que manda sobre los colores mientras está activo.
 */
@Composable
fun ParagonTheme(
    themeStore: ThemeStore,
    content: @Composable () -> Unit
) {
    val sistemaOscuro = isSystemInDarkTheme()
    val modo = when (themeStore.mode) {
        ThemeMode.SISTEMA -> if (sistemaOscuro) ThemeMode.OSCURO else ThemeMode.CLARO
        else -> themeStore.mode
    }
    val oscuro = modo != ThemeMode.CLARO

    // Se escribe ANTES de construir el esquema (no en un SideEffect) para que
    // Background/Accent/... ya valgan lo correcto en este mismo frame.
    modoActivo = modo
    acentoActivo = acentoPorClave(themeStore.acento)
    acentoLibreActivo = themeStore.acentoLibre.takeIf { it.isNotEmpty() }?.let { colorDeHex(it) }
    paletaJuegoActiva = themeStore.paletaJuego
    estiloActivo = estiloPorClave(themeStore.estilo)

    val context = LocalContext.current
    activeDynamicScheme = if (themeStore.useDynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (oscuro) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    } else null

    val colorScheme = activeDynamicScheme ?: if (oscuro) {
        darkColorScheme(
            background = Background, surface = Surface, surfaceVariant = Surface2,
            primary = Accent, onPrimary = OnAccent, secondary = Accent2,
            onBackground = Foreground, onSurface = Foreground, onSurfaceVariant = Muted,
            outline = Border, error = Danger,
        )
    } else {
        lightColorScheme(
            background = Background, surface = Surface, surfaceVariant = Surface2,
            primary = Accent, onPrimary = OnAccent, secondary = Accent2,
            onBackground = Foreground, onSurface = Foreground, onSurfaceVariant = Muted,
            outline = Border, error = Danger,
        )
    }

    // Terminal: monoespaciada en toda la interfaz (la web hace lo mismo).
    val base = Typography()
    val typography = if (estiloActivo.monoespaciada) {
        val m = FontFamily.Monospace
        Typography(
            displayLarge = base.displayLarge.copy(fontFamily = m), displayMedium = base.displayMedium.copy(fontFamily = m),
            displaySmall = base.displaySmall.copy(fontFamily = m), headlineLarge = base.headlineLarge.copy(fontFamily = m),
            headlineMedium = base.headlineMedium.copy(fontFamily = m), headlineSmall = base.headlineSmall.copy(fontFamily = m),
            titleLarge = base.titleLarge.copy(fontFamily = m), titleMedium = base.titleMedium.copy(fontFamily = m),
            titleSmall = base.titleSmall.copy(fontFamily = m), bodyLarge = base.bodyLarge.copy(fontFamily = m),
            bodyMedium = base.bodyMedium.copy(fontFamily = m), bodySmall = base.bodySmall.copy(fontFamily = m),
            labelLarge = base.labelLarge.copy(fontFamily = m), labelMedium = base.labelMedium.copy(fontFamily = m),
            labelSmall = base.labelSmall.copy(fontFamily = m),
        )
    } else base

    // Las piezas de Material (botones, diálogos, campos...) también siguen al estilo.
    val shapes = Shapes(
        extraSmall = RoundedCornerShape(radio(4)),
        small = RoundedCornerShape(radio(8)),
        medium = RoundedCornerShape(radio(12)),
        large = RoundedCornerShape(radio(16)),
        extraLarge = RoundedCornerShape(radio(28)),
    )

    // Tamaño de texto de la app, multiplicado sobre el del sistema (quien ya
    // tenga la letra grande en Android no lo pierde, como en la web).
    val densidad = LocalDensity.current
    val escala = tamanoPorClave(themeStore.tamanoTexto).escala

    CompositionLocalProvider(LocalDensity provides Density(densidad.density, densidad.fontScale * escala)) {
        MaterialTheme(colorScheme = colorScheme, typography = typography, shapes = shapes, content = content)
    }
}

/** "#7cc4e4" → Color; null si no es un hex válido. */
fun colorDeHex(hex: String): Color? {
    val limpio = hex.removePrefix("#")
    if (limpio.length != 6) return null
    return limpio.toLongOrNull(16)?.let { Color(0xFF000000 or it) }
}
