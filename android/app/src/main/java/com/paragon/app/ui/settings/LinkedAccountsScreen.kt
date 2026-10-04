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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.R
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.SettingsResult
import com.paragon.app.data.auth.EnlaceSeguro
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.LinkedAccountsResponse
import com.paragon.app.data.network.OauthAccountDto
import com.paragon.app.data.network.PlatformAccountDto
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import androidx.compose.ui.res.stringResource
import com.paragon.app.util.Textos

// Colores de marca reales por plataforma — antes cada fila era el mismo
// texto plano en mayúsculas sin nada que las distinguiera a simple vista
// (mismo criterio que GoogleBlue/DiscordBlurple en AppRoot.kt: la marca
// manda aquí, no el acento activo de la app).
private val PsBlue = Color(0xFF0070D1)
private val XboxGreen = Color(0xFF107C10)
private val SteamBlue = Color(0xFF66C0F4)

private fun platformBrandColor(platform: String): Color = when (platform) {
    "psn" -> PsBlue
    "xbox" -> XboxGreen
    "steam" -> SteamBlue
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
private fun platformIconRes(platform: String): Int? = when (platform) {
    "psn" -> R.drawable.ic_playstation
    "xbox" -> R.drawable.ic_xbox
    "steam" -> R.drawable.ic_steam
    "epic" -> R.drawable.ic_epic
    else -> null
}

private fun platformPlaceholder(platform: String): String = when (platform) {
    "psn" -> Textos.t(R.string.cuentas_ph_psn)
    "xbox" -> Textos.t(R.string.cuentas_ph_xbox)
    "steam" -> Textos.t(R.string.cuentas_ph_steam)
    else -> Textos.t(R.string.cuentas_ph_otro)
}

private fun platformPrivacyTitle(platform: String): String = when (platform) {
    "psn" -> Textos.t(R.string.cuentas_priv_psn)
    "steam" -> Textos.t(R.string.cuentas_priv_steam)
    "xbox" -> Textos.t(R.string.cuentas_priv_xbox)
    else -> Textos.t(R.string.cuentas_priv_otro)
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
        Textos.t(R.string.cuentas_psn_1),
        Textos.t(R.string.cuentas_psn_2),
        Textos.t(R.string.cuentas_psn_3),
        Textos.t(R.string.cuentas_psn_4),
    )
    "steam" -> listOf(
        Textos.t(R.string.cuentas_steam_1),
        Textos.t(R.string.cuentas_steam_2),
        Textos.t(R.string.cuentas_steam_3),
        Textos.t(R.string.cuentas_steam_4),
    )
    "xbox" -> listOf(
        Textos.t(R.string.cuentas_xbox_1),
        Textos.t(R.string.cuentas_xbox_2),
        Textos.t(R.string.cuentas_xbox_3),
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
    val context = LocalContext.current

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
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.comun_atras), tint = Foreground)
                }
                Text(
                    text = stringResource(R.string.cuentas_titulo),
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
                        Text(stringResource(R.string.comun_reintentar))
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
                item {
                    Text(stringResource(R.string.cuentas_seccion_login), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(modifier = Modifier.height(10.dp))
                }

                items(response!!.oauth.filter { it.configured }, key = { it.provider }) { oauth ->
                    OauthItem(
                        oauth = oauth,
                        onLinkRequested = {
                            // Mismo login por Custom Tab, con su clave de un solo uso (ver EnlaceSeguro).
                            EnlaceSeguro.abrirLogin(context, TokenStore(context.applicationContext), oauth.provider)
                        }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(28.dp))
                    Text(stringResource(R.string.cuentas_seccion_plataformas), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text(
                        text = stringResource(R.string.cuentas_plataformas_sub),
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
    val iconRes = if (oauth.provider == "google") R.drawable.ic_google else R.drawable.ic_discord
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(14.dp))
            .border(1.dp, if (oauth.linked) Good.copy(alpha = 0.35f) else Border, RoundedCornerShape(14.dp))
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
                Text(text = stringResource(R.string.cuentas_vinculada), color = Good, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 6.dp))
            }
        } else {
            Button(
                onClick = onLinkRequested,
                colors = ButtonDefaults.buttonColors(containerColor = Surface2),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                modifier = Modifier.height(34.dp)
            ) {
                Text(stringResource(R.string.cuentas_vincular), fontSize = 12.sp, color = Foreground, fontWeight = FontWeight.SemiBold)
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
            .background(Surface, RoundedCornerShape(14.dp))
            .border(1.dp, if (platform.linked) brandColor.copy(alpha = 0.35f) else Border, RoundedCornerShape(14.dp))
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
                        Text(text = platform.username ?: stringResource(R.string.cuentas_vinculado), color = Muted, fontSize = 13.sp)
                    }
                    if (platform.declared) {
                        // Igual que MarcaDeclarado en la web: se ve, pero no puntúa.
                        Text(text = stringResource(R.string.cuentas_declarado), color = Muted, fontSize = 12.sp)
                    }
                }
            }
            if (platform.linked) {
                IconButton(
                    onClick = { showUnlinkConfirm = true },
                    enabled = !isProcessing,
                    modifier = Modifier.size(34.dp),
                ) {
                    Icon(Icons.Default.Delete, contentDescription = stringResource(R.string.cuentas_desvincular), tint = Danger, modifier = Modifier.size(18.dp))
                }
            } else if (platform.appLinkable) {
                if (!isLinking) {
                    Button(
                        onClick = { isLinking = true },
                        colors = ButtonDefaults.buttonColors(containerColor = brandColor),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        modifier = Modifier.height(34.dp)
                    ) {
                        Text(stringResource(R.string.cuentas_vincular), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                }
            }
        }

        if (!platform.linked && !platform.appLinkable) {
            Text(
                text = stringResource(R.string.cuentas_epic_extension),
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
                shape = RoundedCornerShape(10.dp),
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
                    Text(stringResource(R.string.comun_cancelar), color = Muted)
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
                    shape = RoundedCornerShape(10.dp),
                    enabled = !isProcessing && inputUsername.isNotBlank()
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text(stringResource(R.string.cuentas_conectar), color = Color.White, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    if (showUnlinkConfirm) {
        com.paragon.app.ui.common.ConfirmDialog(
            title = stringResource(R.string.cuentas_desvincular_titulo, platformLabel(platform.platform)),
            message = stringResource(R.string.cuentas_desvincular_texto),
            confirmLabel = stringResource(R.string.cuentas_desvincular_si),
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
            .background(Surface2, RoundedCornerShape(10.dp))
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
