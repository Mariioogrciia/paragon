package com.paragon.app.ui.settings

import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.verticalScroll
import coil3.compose.AsyncImage
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.SettingsResult
import com.paragon.app.data.UserProfile
import com.paragon.app.data.theme.ThemeMode
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.ui.graphics.Brush
import com.paragon.app.ui.theme.radio
import com.paragon.app.ui.theme.Accent2
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size

@Composable
fun SettingsScreen(
    profile: UserProfile,
    repository: SettingsRepository,
    themeStore: ThemeStore,
    onBack: () -> Unit,
    onNavigateToLinkedAccounts: () -> Unit,
    onNavigateToApariencia: () -> Unit,
    onLogout: () -> Unit
) {
    var nameInput by remember { mutableStateOf(profile.name) }
    // Arranca con la misma foto que ya se ve en la web (`profile.image`,
    // GET /api/mobile/panel) — se actualiza sola en cuanto se sube una nueva.
    var avatarUrl by remember { mutableStateOf(profile.image) }
    var isLoading by remember { mutableStateOf(false) }
    var isUploadingAvatar by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = com.paragon.shared.contextoPlataforma()
    val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
    // Antes el botón se activaba con solo tener un nombre no vacío, aunque
    // fuera el mismo de siempre — "Guardar cambios" sin ningún cambio
    // pendiente invita a pulsar sin necesidad. Se compara contra el último
    // valor GUARDADO (no contra `profile` directo, que es una prop que no
    // se actualiza sola tras guardar) para que el botón vuelva a
    // desactivarse justo después de un guardado con éxito.
    var nombreGuardado by remember { mutableStateOf(profile.name) }
    var avatarGuardado by remember { mutableStateOf(profile.image) }
    val hayCambiosSinGuardar = nameInput != nombreGuardado || avatarUrl != avatarGuardado
    // "Cerrar Sesión" saltaba directo con un solo toque, sin nada de por
    // medio — mismo criterio que "Desvincular" (LinkedAccountsScreen) y las
    // acciones de Ligas (LeagueDetailSheet).
    var showLogoutConfirm by remember { mutableStateOf(false) }

    ProfileImagePicker(onImagePicked = { bytes, mimeType, extension ->
        isUploadingAvatar = true
        errorMessage = null
        successMessage = null
        // Ktor ya no bloquea el hilo: no hace falta cambiar de Dispatcher.
        scope.launch {
            when (val result = repository.uploadAvatar(bytes, mimeType, extension)) {
                is SettingsResult.Ok -> {
                    avatarUrl = result.data
                    successMessage = Textos.t(T.ajustes_foto_ok)
                }
                is SettingsResult.Error -> errorMessage = result.message
            }
            isUploadingAvatar = false
        }
    }) { onPickImage ->

    Scaffold(
        containerColor = Background,
        topBar = {
            com.paragon.app.ui.common.CabeceraNativa(titulo = Textos.t(T.nav_ajustes), atras = Textos.t(T.nav_perfil), onBack = onBack, modifier = Modifier.padding(bottom = 8.dp))
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text(Textos.t(T.ajustes_seccion_perfil), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(12.dp))

            // Foto de perfil — la misma que la web, editable desde aquí.
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(AccentSoft)
                        .clickable(enabled = !isUploadingAvatar) {
                            onPickImage()
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    if (isUploadingAvatar) {
                        CircularProgressIndicator(color = Accent, modifier = Modifier.size(28.dp))
                    } else {
                        com.paragon.app.ui.common.AvatarPersona(avatarUrl, profile.name, size = 72.dp, colorInicial = Accent, fondo = AccentSoft)
                    }
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    TextButton(onClick = {
                        onPickImage()
                    }) {
                        Text(Textos.t(T.ajustes_cambiar_foto), color = Accent, fontWeight = FontWeight.SemiBold)
                    }
                    Text(
                        text = Textos.t(T.ajustes_foto_sub),
                        color = Muted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(start = 16.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            OutlinedTextField(
                value = nameInput,
                onValueChange = { nameInput = it },
                label = { Text(Textos.t(T.ajustes_nombre)) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                    focusedLabelColor = Accent,
                    unfocusedLabelColor = Muted,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground
                ),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    scope.launch {
                        isLoading = true
                        errorMessage = null
                        successMessage = null
                        val result = repository.updateProfile(nameInput, avatarUrl)
                        when (result) {
                            is SettingsResult.Ok -> {
                                successMessage = Textos.t(T.ajustes_perfil_ok)
                                nombreGuardado = nameInput
                                avatarGuardado = avatarUrl
                            }
                            is SettingsResult.Error -> errorMessage = result.message
                        }
                        isLoading = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                enabled = !isLoading && nameInput.isNotBlank() && hayCambiosSinGuardar
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = OnAccent, modifier = Modifier.size(24.dp))
                } else {
                    Text(Textos.t(T.comun_guardar_cambios), fontWeight = FontWeight.Bold)
                }
            }

            if (errorMessage != null) {
                Text(text = errorMessage!!, color = Danger, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            }
            if (successMessage != null) {
                Text(text = successMessage!!, color = Good, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Diseño v2: listas agrupadas como Ajustes del iPhone.
            com.paragon.app.ui.common.GrupoNativo(titulo = Textos.t(T.ajustes_seccion_apariencia)) {
                com.paragon.app.ui.common.FilaNativa(
                    icono = Icons.Default.Palette,
                    titulo = Textos.t(T.apariencia_titulo),
                    subtitulo = Textos.t(T.ajustes_apariencia_sub),
                    onClick = onNavigateToApariencia,
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            IdiomaSelector()

            Spacer(modifier = Modifier.height(32.dp))
            
            Text(Textos.t(T.ajustes_seccion_solitario), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface, RoundedCornerShape(radio(14)))
                    .border(1.dp, Border, RoundedCornerShape(radio(14)))
                    .clickable { themeStore.setZenMode(!themeStore.zenMode) }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f).padding(end = 16.dp)) {
                    Text(Textos.t(T.ajustes_ocultar_social), color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text(Textos.t(T.ajustes_ocultar_social_sub), color = Muted, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
                }
                androidx.compose.material3.Switch(
                    checked = themeStore.zenMode,
                    onCheckedChange = { themeStore.setZenMode(it) },
                    colors = androidx.compose.material3.SwitchDefaults.colors(
                        checkedThumbColor = OnAccent,
                        checkedTrackColor = Accent,
                    )
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            com.paragon.app.ui.common.GrupoNativo(titulo = Textos.t(T.ajustes_seccion_conexiones)) {
                com.paragon.app.ui.common.FilaNativa(
                    icono = Icons.Default.Link,
                    titulo = Textos.t(T.cuentas_titulo),
                    onClick = onNavigateToLinkedAccounts,
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // La guía completa y la del bot de Discord ya existen enteras en la
            // web: se abren ahí en vez de duplicarlas en Kotlin.
            com.paragon.app.ui.common.GrupoNativo(titulo = Textos.t(T.ajustes_seccion_ayuda)) {
                com.paragon.app.ui.common.FilaNativa(
                    icono = Icons.AutoMirrored.Filled.HelpOutline,
                    titulo = Textos.t(T.ajustes_como_funciona),
                    onClick = { uriHandler.openUri("https://paragon.app/como-funciona") },
                )
                com.paragon.app.ui.common.SeparadorFila()
                com.paragon.app.ui.common.FilaNativa(
                    icono = Icons.Default.SmartToy,
                    titulo = Textos.t(T.ajustes_bot_discord),
                    onClick = { uriHandler.openUri("https://paragon.app/bot-discord") },
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = { showLogoutConfirm = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .padding(bottom = 0.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Surface),
                shape = RoundedCornerShape(radio(14)),
            ) {
                Text(Textos.t(T.ajustes_cerrar_sesion_boton), color = Danger, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.height(40.dp))
        }
    }

    if (showLogoutConfirm) {
        com.paragon.app.ui.common.ConfirmDialog(
            title = Textos.t(T.ajustes_cerrar_sesion_titulo),
            message = Textos.t(T.ajustes_cerrar_sesion_texto),
            confirmLabel = Textos.t(T.ajustes_cerrar_sesion_si),
            onConfirm = onLogout,
            onDismiss = { showLogoutConfirm = false },
        )
    }
} 
}


