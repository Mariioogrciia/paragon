package com.paragon.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.paragon.shared.contextoPlataforma
import com.paragon.shared.recursos.Res
import com.paragon.shared.recursos.*
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.SettingsResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.shared.red.LinkedAccountsResponse
import com.paragon.shared.red.OauthAccountDto
import com.paragon.shared.red.PlatformAccountDto
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

import com.paragon.app.ui.theme.MarcaPlayStation
import com.paragon.app.ui.theme.MarcaXbox
import com.paragon.app.ui.theme.MarcaSteam
import androidx.compose.runtime.LaunchedEffect
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Surface2

// Colores de marca reales por plataforma — antes cada fila era el mismo
// texto plano en mayúsculas sin nada que las distinguiera a simple vista
// (mismo criterio que GoogleBlue/DiscordBlurple en AppRoot.kt: la marca
// manda aquí, no el acento activo de la app).

private fun platformBrandColor(platform: String): Color = when (platform) {
    "psn" -> MarcaPlayStation
    "xbox" -> MarcaXbox
    "steam" -> MarcaSteam
    "epic" -> Foreground
    else -> Accent
}

private fun platformLabel(platform: String): String = when (platform) {
    "psn" -> "PlayStation"
    "xbox" -> "Xbox"
    "steam" -> "Steam"
    "epic" -> "Epic Games"
    else -> platform.uppercase()
}

private fun platformShort(platform: String): String = when (platform) {
    "psn" -> "PS"
    "xbox" -> "XB"
    "steam" -> "ST"
    else -> platform.take(2).uppercase()
}

/** Logo real por plataforma (mismos paths SVG que PlatformLogos.tsx en la web) — antes era solo la inicial en un círculo. */
private fun platformIconRes(platform: String): DrawableResource? = when (platform) {
    "psn" -> Res.drawable.ic_playstation
    "xbox" -> Res.drawable.ic_xbox
    "steam" -> Res.drawable.ic_steam
    "epic" -> Res.drawable.ic_epic
    else -> null
}

private fun platformPlaceholder(platform: String): String = when (platform) {
    "psn" -> Textos.t(T.cuentas_ph_psn)
    "xbox" -> Textos.t(T.cuentas_ph_xbox)
    "steam" -> Textos.t(T.cuentas_ph_steam)
    else -> Textos.t(T.cuentas_ph_otro)
}

private fun platformPrivacyTitle(platform: String): String = when (platform) {
    "psn" -> Textos.t(T.cuentas_priv_psn)
    "steam" -> Textos.t(T.cuentas_priv_steam)
    "xbox" -> Textos.t(T.cuentas_priv_xbox)
    else -> Textos.t(T.cuentas_priv_otro)
}

/**
 * Mismos pasos que PrivacyGuide.tsx en la web — duplicados a propósito, no
 * importados: son plataformas del mundo real, no algo que compartir vía
 * API. Sin esto, "tu perfil tiene que ser público" no dice DÓNDE tocar, y a
 * medida que la app crezca esto va a pasar cada vez más (ver el caso real
 * de Fendetesta11, cuya primera sincronización falló en silencio).
 */
private fun platformPrivacySteps(platform: String): List<String> = when (platform) {
    "psn" -> listOf(
        Textos.t(T.cuentas_psn_1),
        Textos.t(T.cuentas_psn_2),
        Textos.t(T.cuentas_psn_3),
        Textos.t(T.cuentas_psn_4),
    )
    "steam" -> listOf(
        Textos.t(T.cuentas_steam_1),
        Textos.t(T.cuentas_steam_2),
        Textos.t(T.cuentas_steam_3),
        Textos.t(T.cuentas_steam_4),
    )
    "xbox" -> listOf(
        Textos.t(T.cuentas_xbox_1),
        Textos.t(T.cuentas_xbox_2),
        Textos.t(T.cuentas_xbox_3),
    )
    else -> emptyList()
}

@Composable
fun LinkedAccountsScreen(
    repository: SettingsRepository,
    onBack: () -> Unit
) {
    var response by remember { mutableStateOf<LinkedAccountsResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = contextoPlataforma()

    fun loadAccounts() {
        scope.launch {
            isLoading = true
            // Sin esto, un fallo previo dejaba errorMessage puesto para
            // siempre: el if/else if de abajo mira el error ANTES que
            // response, así que una recarga con éxito nunca llegaba a
            // pintar la lista, aunque `response` ya estuviera bien.
            errorMessage = null
            when (val result = repository.getLinkedAccounts()) {
                is SettingsResult.Ok -> response = result.data
                is SettingsResult.Error -> errorMessage = result.message
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadAccounts()
    }

    // Logros de Steam que faltan tras vincular (5 oct 2026): el servidor los
    // trae por lotes; aquí se piden hasta acabar y se enseña el avance.
    val steamVinculada = response?.platforms?.any { it.platform == "steam" && it.linked } == true
    var steamProgreso by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    LaunchedEffect(steamVinculada) {
        if (steamVinculada) {
            com.paragon.app.data.SteamRepository(com.paragon.shared.sesion.crearTokenStore(context))
                .completarTodo { hechos, total -> steamProgreso = hechos to total }
            steamProgreso = null
        }
    }

    Scaffold(
        containerColor = Background,
        topBar = {
            // Mismo motivo que en SettingsScreen: esta pantalla vive dentro
            // del NavHost de MainScreen, debajo de su barra "PARAGON" — ese
            // inset ya está consumido, repetirlo aquí solo infla la cabecera.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = Textos.t(T.comun_atras), tint = Foreground)
                }
                Text(
                    text = Textos.t(T.cuentas_titulo),
                    color = Foreground,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 16.dp)
                )
            }
        }
    ) { paddingValues ->
        if (isLoading && response == null) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
        } else if (errorMessage != null) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = errorMessage!!, color = Danger)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = { loadAccounts() }, colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
                        Text(Textos.t(T.comun_reintentar))
                    }
                }
            }
        } else if (response != null) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                steamProgreso?.let { (hechos, total) ->
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(AccentSoft, RoundedCornerShape(radio(14)))
                                .border(1.dp, Accent.copy(alpha = 0.32f), RoundedCornerShape(radio(14)))
                                .padding(16.dp),
                        ) {
                            Text(Textos.t(T.cuentas_steam_sync, hechos, total), color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Text(Textos.t(T.cuentas_steam_sync_sub), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                            androidx.compose.material3.LinearProgressIndicator(
                                progress = { if (total > 0) hechos / total.toFloat() else 0f },
                                color = Accent,
                                trackColor = Surface2,
                                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                            )
                        }
                    }
                }

                item {
                    Text(Textos.t(T.cuentas_seccion_login), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(modifier = Modifier.height(10.dp))
                }

                items(response!!.oauth.filter { it.configured }, key = { it.provider }) { oauth ->
                    OauthItem(
                        oauth = oauth,
                        onLinkRequested = {
                            // Mismo login por Custom Tab, con su clave de un solo uso (ver EnlaceSeguro).
                            com.paragon.shared.sesion.abrirLoginEnNavegador(context, com.paragon.shared.sesion.crearTokenStore(context), oauth.provider)
                        }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(28.dp))
                    Text(Textos.t(T.cuentas_seccion_plataformas), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text(
                        text = Textos.t(T.cuentas_plataformas_sub),
                        color = Muted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }

                items(response!!.platforms, key = { it.platform }) { platform ->
                    PlatformItem(
                        platform = platform,
                        repository = repository,
                        onUpdate = { loadAccounts() }
                    )
                }
            }
        }
    }
}

@Composable
fun OauthItem(oauth: OauthAccountDto, onLinkRequested: () -> Unit) {
    val iconRes = if (oauth.provider == "google") Res.drawable.ic_google else Res.drawable.ic_discord
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(14)))
            .border(1.dp, if (oauth.linked) Good.copy(alpha = 0.35f) else Border, RoundedCornerShape(radio(14)))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(36.dp).background(Surface2, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = null,
                    tint = Color.Unspecified,
                    modifier = Modifier.size(18.dp),
                )
            }
            Text(
                text = oauth.provider.replaceFirstChar { it.uppercase() },
                color = Foreground,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
        if (oauth.linked) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Good, modifier = Modifier.size(16.dp))
                Text(text = Textos.t(T.cuentas_vinculada), color = Good, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 6.dp))
            }
        } else {
            Button(
                onClick = onLinkRequested,
                colors = ButtonDefaults.buttonColors(containerColor = Surface2),
                shape = RoundedCornerShape(radio(10)),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                modifier = Modifier.height(34.dp)
            ) {
                Text(Textos.t(T.cuentas_vincular), fontSize = 12.sp, color = Foreground, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun PlatformItem(platform: PlatformAccountDto, repository: SettingsRepository, onUpdate: () -> Unit) {
    var isLinking by remember { mutableStateOf(false) }
    var inputUsername by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var isProcessing by remember { mutableStateOf(false) }
    var showUnlinkConfirm by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val brandColor = platformBrandColor(platform.platform)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(14)))
            .border(1.dp, if (platform.linked) brandColor.copy(alpha = 0.35f) else Border, RoundedCornerShape(radio(14)))
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(36.dp).background(brandColor.copy(alpha = 0.14f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    val iconRes = platformIconRes(platform.platform)
                    if (iconRes != null) {
                        Icon(
                            painter = painterResource(iconRes),
                            contentDescription = null,
                            // El logo de Epic es monocromo: sigue al color del texto (claro/oscuro).
                            tint = if (platform.platform == "epic") Foreground else Color.Unspecified,
                            modifier = Modifier.size(18.dp),
                        )
                    } else {
                        Text(text = platformShort(platform.platform), color = brandColor, fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                }
                Column(modifier = Modifier.padding(start = 12.dp)) {
                    Text(text = platformLabel(platform.platform), color = Foreground, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    if (platform.linked) {
                        Text(text = platform.username ?: Textos.t(T.cuentas_vinculado), color = Muted, fontSize = 13.sp)
                    }
                    if (platform.declared) {
                        // Igual que MarcaDeclarado en la web: se ve, pero no puntúa.
                        Text(text = Textos.t(T.cuentas_declarado), color = Muted, fontSize = 12.sp)
                    }
                }
            }
            if (platform.linked) {
                IconButton(
                    onClick = { showUnlinkConfirm = true },
                    enabled = !isProcessing,
                    modifier = Modifier.size(48.dp),
                ) {
                    Icon(Icons.Default.Delete, contentDescription = Textos.t(T.cuentas_desvincular), tint = Danger, modifier = Modifier.size(18.dp))
                }
            } else if (platform.appLinkable) {
                if (!isLinking) {
                    Button(
                        onClick = { isLinking = true },
                        colors = ButtonDefaults.buttonColors(containerColor = brandColor),
                        shape = RoundedCornerShape(radio(10)),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        modifier = Modifier.height(34.dp)
                    ) {
                        Text(Textos.t(T.cuentas_vincular), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = textoSobre(brandColor))
                    }
                }
            }
        }

        if (!platform.linked && !platform.appLinkable) {
            Text(
                text = Textos.t(T.cuentas_epic_extension),
                color = Muted,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 10.dp),
            )
        }

        if (isLinking && !platform.linked) {
            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = Border)
            Spacer(modifier = Modifier.height(14.dp))
            OutlinedTextField(
                value = inputUsername,
                onValueChange = { inputUsername = it; errorMsg = null },
                placeholder = { Text(platformPlaceholder(platform.platform), color = Muted) },
                isError = errorMsg != null,
                shape = RoundedCornerShape(radio(10)),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = brandColor,
                    unfocusedBorderColor = Border,
                    errorBorderColor = Danger,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground,
                    focusedContainerColor = Surface2,
                    unfocusedContainerColor = Surface2,
                ),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            if (errorMsg != null) {
                Text(text = errorMsg!!, color = Danger, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
            }
            Spacer(modifier = Modifier.height(10.dp))
            PrivacyGuide(platform = platform.platform, brandColor = brandColor)
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { isLinking = false; errorMsg = null }, enabled = !isProcessing) {
                    Text(Textos.t(T.comun_cancelar), color = Muted)
                }
                Spacer(modifier = Modifier.width(4.dp))
                Button(
                    onClick = {
                        scope.launch {
                            isProcessing = true
                            errorMsg = null
                            val res = repository.linkPlatform(platform.platform, inputUsername)
                            when (res) {
                                is SettingsResult.Ok -> onUpdate()
                                is SettingsResult.Error -> errorMsg = res.message
                            }
                            isProcessing = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = brandColor),
                    shape = RoundedCornerShape(radio(10)),
                    enabled = !isProcessing && inputUsername.isNotBlank()
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(color = textoSobre(brandColor), modifier = Modifier.size(16.dp))
                    } else {
                        Text(Textos.t(T.cuentas_conectar), color = textoSobre(brandColor), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    if (showUnlinkConfirm) {
        com.paragon.app.ui.common.ConfirmDialog(
            title = Textos.t(T.cuentas_desvincular_titulo, platformLabel(platform.platform)),
            message = Textos.t(T.cuentas_desvincular_texto),
            confirmLabel = Textos.t(T.cuentas_desvincular_si),
            onConfirm = {
                scope.launch {
                    isProcessing = true
                    repository.unlinkPlatform(platform.platform)
                    onUpdate()
                    isProcessing = false
                }
            },
            onDismiss = { showUnlinkConfirm = false },
        )
    }
}

/** Desplegable "¿Dónde lo pongo en público?" — mismos pasos que PrivacyGuide.tsx en la web. */
@Composable
private fun PrivacyGuide(platform: String, brandColor: Color) {
    var expanded by remember { mutableStateOf(false) }
    val steps = remember(platform) { platformPrivacySteps(platform) }
    if (steps.isEmpty()) return

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(radio(10)))
            .clickable { expanded = !expanded }
            .padding(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = platformPrivacyTitle(platform),
                color = brandColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
            )
            Icon(
                if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = brandColor,
            )
        }
        if (expanded) {
            Column(modifier = Modifier.padding(top = 8.dp)) {
                steps.forEachIndexed { index, step ->
                    Row(modifier = Modifier.padding(top = if (index == 0) 0.dp else 6.dp)) {
                        Text(text = "${index + 1}.", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 6.dp))
                        Text(text = step, color = Muted, fontSize = 12.sp, lineHeight = 16.sp)
                    }
                }
            }
        }
    }
}

