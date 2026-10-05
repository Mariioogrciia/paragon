package com.paragon.app.util

import com.paragon.shared.ContextoPlataforma
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Texto
import org.jetbrains.compose.resources.DrawableResource
import com.paragon.shared.recursos.Res
import com.paragon.shared.recursos.icono_claro
import com.paragon.shared.recursos.icono_esmeralda
import com.paragon.shared.recursos.icono_neon
import com.paragon.shared.recursos.icono_oro
import com.paragon.shared.recursos.icono_paragon

/**
 * Los iconos de la app a elegir (Ajustes → Apariencia → Icono). Las imágenes
 * salen de kmp/iconos/generar.py: en Android, un <activity-alias> por icono;
 * en iOS, un AppIcon-<Nombre> en Assets.xcassets. "" = la P de siempre.
 */
data class IconoApp(val clave: String, val nombre: Texto, val miniatura: DrawableResource)

val ICONOS_APP = listOf(
    IconoApp("", T.icono_paragon, Res.drawable.icono_paragon),
    IconoApp("oro", T.icono_oro, Res.drawable.icono_oro),
    IconoApp("claro", T.icono_claro, Res.drawable.icono_claro),
    IconoApp("neon", T.icono_neon, Res.drawable.icono_neon),
    IconoApp("esmeralda", T.icono_esmeralda, Res.drawable.icono_esmeralda),
)

/** La clave del icono puesto ahora mismo. */
expect fun iconoAppActual(contexto: ContextoPlataforma): String

/** Pone ese icono en la pantalla de inicio del sistema. */
expect fun cambiarIconoApp(contexto: ContextoPlataforma, clave: String)

/** En Android el icono nuevo puede tardar en verse hasta salir de la app (iOS avisa él solo). */
expect val cambiarIconoAvisaAlCerrar: Boolean
