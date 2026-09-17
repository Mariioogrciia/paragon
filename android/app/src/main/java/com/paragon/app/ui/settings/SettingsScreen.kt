package com.paragon.app.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.verticalScroll
import coil3.compose.AsyncImage
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.SettingsResult
import com.paragon.app.data.UserProfile
import com.paragon.app.data.theme.ThemeMode
import com.paragon.app.data.theme.PlatformColor
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    profile: UserProfile,
    repository: SettingsRepository,
    themeStore: ThemeStore,
    onBack: () -> Unit,
    onNavigateToLinkedAccounts: () -> Unit,
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
    val context = LocalContext.current

    val pickImage = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        isUploadingAvatar = true
        errorMessage = null
        successMessage = null
        scope.launch {
            when (val result = repository.uploadAvatar(context, uri)) {
                is SettingsResult.Ok -> {
                    avatarUrl = result.data
                    successMessage = "Foto actualizada"
                }
                is SettingsResult.Error -> errorMessage = result.message
            }
            isUploadingAvatar = false
        }
    }

    Scaffold(
        containerColor = Background,
        topBar = {
            // Sin `windowInsetsPadding(WindowInsets.statusBars)` a propósito:
            // esta pantalla siempre vive DENTRO del NavHost de MainScreen,
            // debajo de su barra "PARAGON" (que ya consume ese inset) —
            // repetirlo aquí sumaba el alto de la barra de estado dos veces,
            // dejando una cabecera enorme con un hueco en blanco arriba.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Foreground)
                }
                Text(
                    text = "Ajustes",
                    color = Foreground,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 16.dp)
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text("PERFIL", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(12.dp))

            // Foto de perfil — la misma que la web, editable desde aquí.
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(AccentSoft)
                        .clickable(enabled = !isUploadingAvatar) {
                            pickImage.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    if (isUploadingAvatar) {
                        CircularProgressIndicator(color = Accent, modifier = Modifier.size(28.dp))
                    } else if (!avatarUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = avatarUrl,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                        )
                    } else {
                        Text(profile.name.take(1).uppercase(), color = Accent, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    TextButton(onClick = {
                        pickImage.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    }) {
                        Text("Cambiar foto", color = Accent, fontWeight = FontWeight.SemiBold)
                    }
                    Text(
                        text = "Se ve igual en la web y en la app",
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
                label = { Text("Nombre de usuario") },
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
                            is SettingsResult.Ok -> successMessage = "Perfil actualizado"
                            is SettingsResult.Error -> errorMessage = result.message
                        }
                        isLoading = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                enabled = !isLoading && nameInput.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = Background, modifier = Modifier.size(24.dp))
                } else {
                    Text("Guardar cambios", fontWeight = FontWeight.Bold)
                }
            }

            if (errorMessage != null) {
                Text(text = errorMessage!!, color = Danger, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            }
            if (successMessage != null) {
                Text(text = successMessage!!, color = Good, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text("APARIENCIA Y PERSONALIZACIÓN", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(8.dp))
            ThemePicker(themeStore = themeStore)
            
            Spacer(modifier = Modifier.height(12.dp))
            PlatformPicker(themeStore = themeStore)
            
            Spacer(modifier = Modifier.height(12.dp))
            DynamicColorToggle(themeStore = themeStore)

            Spacer(modifier = Modifier.height(12.dp))
            CustomColorPicker(themeStore = themeStore)

            Spacer(modifier = Modifier.height(12.dp))
            FontFamilyPicker(themeStore = themeStore)

            Spacer(modifier = Modifier.height(32.dp))
            
            Text("MODO SOLITARIO", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface, RoundedCornerShape(14.dp))
                    .border(1.dp, Border, RoundedCornerShape(14.dp))
                    .clickable { themeStore.setZenMode(!themeStore.zenMode) }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f).padding(end = 16.dp)) {
                    Text("Ocultar funciones sociales", color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text("Oculta la Comunidad y Ligas. Ideal si solo usas la app como herramienta personal.", color = Muted, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
                }
                androidx.compose.material3.Switch(
                    checked = themeStore.zenMode,
                    onCheckedChange = { themeStore.setZenMode(it) },
                    colors = androidx.compose.material3.SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Accent,
                    )
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text("CONEXIONES", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = onNavigateToLinkedAccounts,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Cuentas Vinculadas", color = Foreground)
            }

            Spacer(modifier = Modifier.height(40.dp))

            Button(
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 32.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                border = androidx.compose.foundation.BorderStroke(1.dp, Danger)
            ) {
                Text("Cerrar Sesión", color = Danger, fontWeight = FontWeight.Bold)
            }
        }
    }
}

private val THEME_OPTIONS = listOf(
    ThemeMode.SISTEMA to "Sistema",
    ThemeMode.CLARO to "Claro",
    ThemeMode.OSCURO to "Oscuro",
)

/** Sistema/Claro/Oscuro — cambia al instante (ThemeStore es estado de Compose, no hace falta reiniciar la app). */
@Composable
private fun ThemePicker(themeStore: ThemeStore) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(14.dp))
            .border(1.dp, Border, RoundedCornerShape(14.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        THEME_OPTIONS.forEach { (mode, label) ->
            val selected = themeStore.mode == mode
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selected) Accent else Color.Transparent)
                    .clickable { themeStore.setMode(mode) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = label,
                    // Blanco fijo (no `Background`): el pill seleccionado es
                    // siempre Accent (un azul), y en modo claro Background es
                    // casi blanco — usarlo aquí dejaría el texto casi
                    // invisible sobre el azul.
                    color = if (selected) Color.White else Muted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

private val PLATFORM_OPTIONS = listOf(
    PlatformColor.PARAGON to "Paragon",
    PlatformColor.PLAYSTATION to "PSN",
    PlatformColor.XBOX to "Xbox",
    PlatformColor.STEAM to "Steam"
)

@Composable
private fun PlatformPicker(themeStore: ThemeStore) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(14.dp))
            .border(1.dp, Border, RoundedCornerShape(14.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        PLATFORM_OPTIONS.forEach { (platform, label) ->
            val selected = themeStore.platform == platform
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selected) Accent else Color.Transparent)
                    .clickable { themeStore.setPlatform(platform) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = label,
                    color = if (selected) Color.White else Muted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun DynamicColorToggle(themeStore: ThemeStore) {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Surface, RoundedCornerShape(14.dp))
                .border(1.dp, Border, RoundedCornerShape(14.dp))
                .clickable { themeStore.setUseDynamicColor(!themeStore.useDynamicColor) }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 16.dp)) {
                Text("Material You (Colores Dinámicos)", color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                Text("Extrae los colores de tu fondo de pantalla", color = Muted, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
            }
            androidx.compose.material3.Switch(
                checked = themeStore.useDynamicColor,
                onCheckedChange = { themeStore.setUseDynamicColor(it) },
                colors = androidx.compose.material3.SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = Accent,
                )
            )
        }
    }
}

private val CUSTOM_COLORS = listOf(
    -1L to "Auto",
    0xFFFF3B30 to "Rojo",
    0xFFFF9500 to "Naranja",
    0xFFFFCC00 to "Amarillo",
    0xFF4CD964 to "Verde",
    0xFF5AC8FA to "Celeste",
    0xFF007AFF to "Azul",
    0xFF5856D6 to "Violeta",
    0xFFFF2D55 to "Rosa"
)

@Composable
private fun CustomColorPicker(themeStore: ThemeStore) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(14.dp))
            .border(1.dp, Border, RoundedCornerShape(14.dp))
            .padding(16.dp)
    ) {
        Text("Color de Acento Personalizado", color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            CUSTOM_COLORS.forEach { (colorValue, label) ->
                val isSelected = (themeStore.customAccentColor ?: -1L) == colorValue
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(if (colorValue == -1L) Surface2 else Color(colorValue))
                        .border(if (isSelected) 3.dp else 1.dp, if (isSelected) Foreground else Border, CircleShape)
                        .clickable { themeStore.setCustomAccentColor(if (colorValue == -1L) null else colorValue) },
                    contentAlignment = Alignment.Center
                ) {
                    if (colorValue == -1L) {
                        Text("X", color = Muted, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

private val FONT_OPTIONS = listOf(
    0 to "Moderna",
    1 to "Elegante",
    2 to "Retro",
    3 to "Casual"
)

@Composable
private fun FontFamilyPicker(themeStore: ThemeStore) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(14.dp))
            .border(1.dp, Border, RoundedCornerShape(14.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        FONT_OPTIONS.forEach { (fontIndex, label) ->
            val selected = themeStore.fontFamily == fontIndex
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selected) Accent else Color.Transparent)
                    .clickable { themeStore.setFontFamily(fontIndex) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = label,
                    color = if (selected) Color.White else Muted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}
