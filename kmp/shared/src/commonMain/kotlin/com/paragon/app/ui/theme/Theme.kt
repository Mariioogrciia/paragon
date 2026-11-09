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
import androidx.compose.ui.text.font.FontWeight
import com.paragon.shared.recursos.Res
import com.paragon.shared.recursos.manrope_bold
import com.paragon.shared.recursos.manrope_extrabold
import com.paragon.shared.recursos.manrope_medium
import com.paragon.shared.recursos.manrope_regular
import com.paragon.shared.recursos.manrope_semibold
import org.jetbrains.compose.resources.Font
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
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

    // Se escribe ANTES de construir el esquema (no en un SideEffect) para que
    // Background/Accent/... ya valgan lo correcto en este mismo frame.
    modoActivo = modo
    acentoActivo = acentoPorClave(themeStore.acento)
    acentoLibreActivo = themeStore.acentoLibre.takeIf { it.isNotEmpty() }?.let { colorDeHex(it) }
    fondoLibreActivo = themeStore.fondoLibre.takeIf { it.isNotEmpty() }?.let { colorDeHex(it) }
    paletaJuegoActiva = themeStore.paletaJuego
    estiloActivo = estiloPorClave(themeStore.estilo)
    // Con fondo libre, oscuro o claro lo decide ese fondo (texto, esquema de Material).
    val oscuro = isDarkTheme

    activeDynamicScheme = if (themeStore.useDynamicColor) {
        platformDynamicColorScheme(oscuro)
    } else null

    val colorScheme = activeDynamicScheme ?: if (oscuro) {
        darkColorScheme(
            background = Background, surface = Surface, surfaceVariant = Surface2,
            primary = Accent, onPrimary = OnAccent, secondary = Accent2,
            onBackground = Foreground, onSurface = Foreground, onSurfaceVariant = Muted,
            // 8 nov 2026 (capturas del emulador): sin estos, Material ponía sus
            // morados y rosas de serie en interruptores, casillas y pastillas.
            outline = Muted, outlineVariant = Border, error = Danger,
            primaryContainer = AccentSoft, onPrimaryContainer = Foreground,
            secondaryContainer = AccentSoft, onSecondaryContainer = Foreground,
            tertiary = Accent2, surfaceTint = Accent, inversePrimary = Accent,
            surfaceContainerLowest = Surface, surfaceContainerLow = Surface, surfaceContainer = Surface2,
            surfaceContainerHigh = Surface2, surfaceContainerHighest = Border,
        )
    } else {
        lightColorScheme(
            background = Background, surface = Surface, surfaceVariant = Surface2,
            primary = Accent, onPrimary = OnAccent, secondary = Accent2,
            onBackground = Foreground, onSurface = Foreground, onSurfaceVariant = Muted,
            // 8 nov 2026 (capturas del emulador): sin estos, Material ponía sus
            // morados y rosas de serie en interruptores, casillas y pastillas.
            outline = Muted, outlineVariant = Border, error = Danger,
            primaryContainer = AccentSoft, onPrimaryContainer = Foreground,
            secondaryContainer = AccentSoft, onSecondaryContainer = Foreground,
            tertiary = Accent2, surfaceTint = Accent, inversePrimary = Accent,
            surfaceContainerLowest = Surface, surfaceContainerLow = Surface, surfaceContainer = Surface2,
            surfaceContainerHigh = Surface2, surfaceContainerHighest = Border,
        )
    }

    // Letra de la app (9 nov 2026, elegida entre cinco): Manrope, metida en
    // la app (composeResources/font, licencia OFL en kmp/LICENCIAS). Terminal
    // sigue en monoespaciada en toda la interfaz, como en la web.
    val familia = if (estiloActivo.monoespaciada) FontFamily.Monospace else manrope()
    val base = Typography()
    val tipografia = Typography(
        displayLarge = base.displayLarge.copy(fontFamily = familia), displayMedium = base.displayMedium.copy(fontFamily = familia),
        displaySmall = base.displaySmall.copy(fontFamily = familia), headlineLarge = base.headlineLarge.copy(fontFamily = familia),
        headlineMedium = base.headlineMedium.copy(fontFamily = familia), headlineSmall = base.headlineSmall.copy(fontFamily = familia),
        titleLarge = base.titleLarge.copy(fontFamily = familia), titleMedium = base.titleMedium.copy(fontFamily = familia),
        titleSmall = base.titleSmall.copy(fontFamily = familia), bodyLarge = base.bodyLarge.copy(fontFamily = familia),
        bodyMedium = base.bodyMedium.copy(fontFamily = familia), bodySmall = base.bodySmall.copy(fontFamily = familia),
        labelLarge = base.labelLarge.copy(fontFamily = familia), labelMedium = base.labelMedium.copy(fontFamily = familia),
        labelSmall = base.labelSmall.copy(fontFamily = familia),
    )
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

/** Todos los estilos con interlineado proporcional a su tamaño de letra y sin espaciado extra. */
private fun interlineadoRelativo(t: Typography): Typography {
    // Sin el espaciado entre letras de serie de Material (+0,5 sp en el cuerpo, 9 nov 2026):
    // con él todo el texto se veía "ancho" y nada nativo, sobre todo en iPhone.
    fun TextStyle.rel(f: Float) = copy(lineHeight = f.em, letterSpacing = 0.sp)
    return Typography(
        displayLarge = t.displayLarge.rel(1.12f), displayMedium = t.displayMedium.rel(1.15f), displaySmall = t.displaySmall.rel(1.2f),
        headlineLarge = t.headlineLarge.rel(1.22f), headlineMedium = t.headlineMedium.rel(1.25f), headlineSmall = t.headlineSmall.rel(1.28f),
        titleLarge = t.titleLarge.rel(1.28f), titleMedium = t.titleMedium.rel(1.32f), titleSmall = t.titleSmall.rel(1.32f),
        bodyLarge = t.bodyLarge.rel(1.35f), bodyMedium = t.bodyMedium.rel(1.35f), bodySmall = t.bodySmall.rel(1.35f),
        labelLarge = t.labelLarge.rel(1.3f), labelMedium = t.labelMedium.rel(1.3f), labelSmall = t.labelSmall.rel(1.3f),
    )
}

/** Manrope en sus cinco pesos; el resto (Light, Black…) lo aproxima el sistema. */
@Composable
fun manrope(): FontFamily {
    val regular = Font(Res.font.manrope_regular, FontWeight.Normal)
    val medium = Font(Res.font.manrope_medium, FontWeight.Medium)
    val semibold = Font(Res.font.manrope_semibold, FontWeight.SemiBold)
    val bold = Font(Res.font.manrope_bold, FontWeight.Bold)
    val extrabold = Font(Res.font.manrope_extrabold, FontWeight.ExtraBold)
    // Siempre la misma familia: si no, cada recomposición del tema estrenaría tipografía.
    return androidx.compose.runtime.remember(regular, medium, semibold, bold, extrabold) {
        FontFamily(regular, medium, semibold, bold, extrabold)
    }
}
