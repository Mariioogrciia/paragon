package com.paragon.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.em
import androidx.compose.ui.text.TextStyle
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

    activeDynamicScheme = if (themeStore.useDynamicColor) {
        platformDynamicColorScheme(oscuro)
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
    val tipografia = if (estiloActivo.monoespaciada) {
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
    // Interlineado relativo a la letra (7 oct 2026): los estilos de Material
    // traen uno fijo (24 sp en el de cuerpo) y, en un texto de 11-12 sp que
    // salta de línea, quedaba un hueco enorme entre líneas ("Miembro · 0 /
    // trofeos en el / clan"), sobre todo con la monoespaciada de Terminal.
    val typography = interlineadoRelativo(tipografia)

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

/** Todos los estilos con interlineado proporcional a su tamaño de letra. */
private fun interlineadoRelativo(t: Typography): Typography {
    fun TextStyle.rel(f: Float) = copy(lineHeight = f.em)
    return Typography(
        displayLarge = t.displayLarge.rel(1.12f), displayMedium = t.displayMedium.rel(1.15f), displaySmall = t.displaySmall.rel(1.2f),
        headlineLarge = t.headlineLarge.rel(1.22f), headlineMedium = t.headlineMedium.rel(1.25f), headlineSmall = t.headlineSmall.rel(1.28f),
        titleLarge = t.titleLarge.rel(1.28f), titleMedium = t.titleMedium.rel(1.32f), titleSmall = t.titleSmall.rel(1.32f),
        bodyLarge = t.bodyLarge.rel(1.35f), bodyMedium = t.bodyMedium.rel(1.35f), bodySmall = t.bodySmall.rel(1.35f),
        labelLarge = t.labelLarge.rel(1.3f), labelMedium = t.labelMedium.rel(1.3f), labelSmall = t.labelSmall.rel(1.3f),
    )
}
