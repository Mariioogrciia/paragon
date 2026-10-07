package com.paragon.app.ui.perfil

import androidx.compose.foundation.Image
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import com.paragon.app.util.enlacePerfil
import io.github.alexzhirkevich.qrose.rememberQrCodePainter
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.GlobalStats
import com.paragon.app.data.RachaGlobal
import com.paragon.app.data.UserProfile
import com.paragon.app.ui.common.AvatarPersona
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.app.util.cifra
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * Pestaña "Perfil" (5 oct 2026, rediseño de la app): sustituye a "Más" y al
 * menú del avatar, que repetían lo mismo. Arriba tu tarjeta con las cifras;
 * debajo, en grupos al estilo iPhone, todo lo que es tuyo (Tu caza) y lo que
 * es con otros. Ajustes, arriba a la derecha. Solo colores del tema
 * (acento, superficie, bordes y radios de Apariencia), nada fijo.
 *
 * `modoZen` ("Ocultar funciones sociales"): sin el grupo "Con otros".
 */
@Composable
fun PerfilScreen(
    profile: UserProfile,
    stats: GlobalStats,
    racha: RachaGlobal,
    modoZen: Boolean,
    onNavigate: (String) -> Unit,
) {
    var verQr by remember { mutableStateOf(false) }
    if (verQr) HojaMiQr(handle = profile.handle, onDismiss = { verQr = false })
    Column(
        Modifier.fillMaxSize().background(Background).verticalScroll(rememberScrollState()).padding(bottom = 32.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 16.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(Textos.t(T.nav_perfil), color = Foreground, fontSize = 32.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            // Tu código QR (diseño v2): quien lo escanee te envía la solicitud de amistad.
            IconButton(
                onClick = { verQr = true },
                modifier = Modifier.padding(end = 8.dp).size(44.dp).clip(RoundedCornerShape(50)).background(Surface).border(1.dp, Border, RoundedCornerShape(50)),
            ) { Icon(Icons.Default.QrCode2, contentDescription = Textos.t(T.qr_tu_codigo), tint = Foreground) }
            IconButton(
                onClick = { onNavigate(Screen.Settings.route) },
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(50)).background(Surface).border(1.dp, Border, RoundedCornerShape(50)),
            ) { Icon(Icons.Default.Settings, contentDescription = Textos.t(T.nav_ajustes), tint = Foreground) }
        }

        // La tarjeta: lo primero que se mira, con las cifras por delante de las etiquetas.
        Column(
            Modifier.padding(horizontal = 24.dp, vertical = 16.dp)
                .fillMaxWidth()
                .shadow(16.dp, RoundedCornerShape(radio(24)), ambientColor = Accent.copy(alpha = 0.25f), spotColor = Accent.copy(alpha = 0.25f))
                .clip(RoundedCornerShape(radio(24)))
                .background(Surface)
                .border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(radio(24)))
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(76.dp).clip(RoundedCornerShape(50)).background(Accent).padding(3.dp)) {
                    AvatarPersona(profile.image, profile.name, size = 70.dp)
                }
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(Textos.t(T.comun_nivel_n, profile.level).uppercase(), color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text(profile.name, color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("@${profile.handle}", color = Muted, fontSize = 13.sp, maxLines = 1)
                }
            }
            HorizontalDivider(color = Border, modifier = Modifier.padding(vertical = 16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Cifra(cifra(stats.platinums), Textos.t(T.comun_platinos), destacada = true, modifier = Modifier.weight(1f))
                Cifra(cifra(stats.trophies), Textos.t(T.comun_trofeos), modifier = Modifier.weight(1f))
                Cifra(cifra(stats.games), Textos.t(T.comun_juegos), modifier = Modifier.weight(1f))
                Cifra(cifra(racha.actual), Textos.t(T.perfil_racha), modifier = Modifier.weight(1f))
            }
        }

        Grupo(Textos.t(T.perfil_tu_caza)) {
            Fila(Icons.Default.BarChart, Textos.t(T.nav_estadisticas)) { onNavigate(Screen.Stats.route) }
            Fila(Icons.Default.CalendarMonth, Textos.t(T.ritmo_titulo)) { onNavigate(Screen.Ritmo.route) }
            Fila(Icons.Default.CenterFocusStrong, Textos.t(T.nav_enfoque)) { onNavigate(Screen.Focus.route) }
            Fila(Icons.Default.Star, Textos.t(T.nav_atascados_menu)) { onNavigate(Screen.StuckTrophies.route) }
            Fila(Icons.Default.Folder, Textos.t(T.nav_carpetas), ultima = true) { onNavigate(Screen.Collections.route) }
        }
        if (!modoZen) Grupo(Textos.t(T.perfil_con_otros)) {
            Fila(Icons.Default.Groups, Textos.t(T.nav_sesiones)) { onNavigate(Screen.Sessions.route) }
            Fila(Icons.AutoMirrored.Filled.CompareArrows, Textos.t(T.nav_comparar), ultima = true) { onNavigate("compare") }
        }
    }
}

@Composable
private fun Cifra(valor: String, etiqueta: String, modifier: Modifier = Modifier, destacada: Boolean = false) {
    Column(modifier) {
        Text(valor, color = if (destacada) Accent else Foreground, fontSize = 18.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, maxLines = 1)
        Text(etiqueta, color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun Grupo(titulo: String, filas: @Composable () -> Unit) {
    Text(
        titulo.uppercase(),
        color = Muted,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 16.dp, bottom = 8.dp),
    )
    Column(Modifier.padding(horizontal = 24.dp).fillMaxWidth().clip(RoundedCornerShape(radio(20))).background(Surface)) { filas() }
}

@Composable
private fun Fila(icono: ImageVector, texto: String, ultima: Boolean = false, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(52.dp).premiumClickable(onClick = onClick).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(32.dp).clip(RoundedCornerShape(radio(8))).background(AccentSoft), contentAlignment = Alignment.Center) {
            Icon(icono, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(texto, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Muted, modifier = Modifier.size(20.dp))
    }
    if (!ultima) HorizontalDivider(color = Surface2, modifier = Modifier.padding(start = 60.dp))
}

/** Hoja con tu código QR en grande (el mismo que en Amigos). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HojaMiQr(handle: String, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = com.paragon.app.ui.theme.SurfaceSolida) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(Textos.t(T.qr_tu_codigo), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(Textos.t(T.qr_tu_codigo_sub), color = Muted, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp, bottom = 20.dp))
            Box(Modifier.size(240.dp).clip(RoundedCornerShape(radio(24))).background(Color.White).padding(18.dp)) {
                Image(
                    painter = rememberQrCodePainter(enlacePerfil(handle)),
                    contentDescription = Textos.t(T.qr_tu_codigo),
                    modifier = Modifier.fillMaxSize(),
                )
            }
            Text("@$handle", color = Accent, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 16.dp))
        }
    }
}
