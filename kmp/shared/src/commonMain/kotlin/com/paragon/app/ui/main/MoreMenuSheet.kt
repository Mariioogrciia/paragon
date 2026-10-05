package com.paragon.app.ui.main

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * La pestaña "Más" de la barra de abajo: todo lo que no cabe en las cuatro
 * pestañas. Antes (5 oct 2026) tenía "Descubrir" y "Planificador", que solo
 * cerraban la hoja (esas pantallas no existen en la app), "Amigos", que
 * llevaba a lo mismo que la pestaña Ligas, y textos en español a fuego.
 * Ahora solo hay destinos que existen, traducidos, y "Ajustes" separado al
 * final como en el menú del avatar.
 *
 * `conLigas`: en modo zen la barra no tiene la pestaña Ligas, así que se
 * ofrece aquí para que no quede inaccesible.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreMenuSheet(
    conLigas: Boolean,
    onDismiss: () -> Unit,
    onNavigate: (String) -> Unit,
) {
    fun ir(ruta: String) {
        onDismiss()
        onNavigate(ruta)
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 28.dp)) {
            Text(
                Textos.t(T.nav_mas).uppercase(),
                color = Muted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            )
            MoreMenuItem(Icons.Default.Groups, Textos.t(T.nav_sesiones)) { ir(Screen.Sessions.route) }
            if (conLigas) MoreMenuItem(Icons.Default.EmojiEvents, Textos.t(T.nav_ligas)) { ir(Screen.Social.route) }
            MoreMenuItem(Icons.Default.BarChart, Textos.t(T.nav_estadisticas)) { ir(Screen.Stats.route) }
            MoreMenuItem(Icons.Default.CalendarMonth, Textos.t(T.ritmo_titulo)) { ir(Screen.Ritmo.route) }
            MoreMenuItem(Icons.Default.CenterFocusStrong, Textos.t(T.nav_enfoque)) { ir(Screen.Focus.route) }
            MoreMenuItem(Icons.Default.Star, Textos.t(T.nav_atascados_menu)) { ir(Screen.StuckTrophies.route) }
            MoreMenuItem(Icons.Default.Folder, Textos.t(T.nav_carpetas)) { ir(Screen.Collections.route) }
            MoreMenuItem(Icons.AutoMirrored.Filled.CompareArrows, Textos.t(T.nav_comparar)) { ir("compare") }
            HorizontalDivider(color = Border, modifier = Modifier.padding(horizontal = 24.dp, vertical = 6.dp))
            MoreMenuItem(Icons.Default.Settings, Textos.t(T.nav_ajustes), tinte = Accent) { ir(Screen.Settings.route) }
        }
    }
}

@Composable
private fun MoreMenuItem(
    icon: ImageVector,
    label: String,
    tinte: Color = Foreground,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .premiumClickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tinte, modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(text = label, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
}
