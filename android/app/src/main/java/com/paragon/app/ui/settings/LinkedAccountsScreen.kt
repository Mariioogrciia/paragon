package com.paragon.app.ui.settings

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.SettingsResult
import com.paragon.app.data.network.BASE_URL
import com.paragon.app.data.network.LinkedAccountsResponse
import com.paragon.app.data.network.OauthAccountDto
import com.paragon.app.data.network.PlatformAccountDto
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

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
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Foreground)
                }
                Text(
                    text = "Cuentas Vinculadas",
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
                        Text("Reintentar")
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
                    Text("INICIO DE SESIÓN (OAUTH)", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                }

                items(response!!.oauth.filter { it.configured }) { oauth ->
                    OauthItem(
                        oauth = oauth,
                        onLinkRequested = {
                            // Linkeamos usando CustomTab para Google/Discord
                            val loginUrl = Uri.parse(BASE_URL).buildUpon()
                                .appendEncodedPath("movil/entrar/${oauth.provider}")
                                .build()
                            CustomTabsIntent.Builder().build().launchUrl(context, loginUrl)
                        }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("PLATAFORMAS DE JUEGO", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                }

                items(response!!.platforms) { platform ->
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
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = oauth.provider.replaceFirstChar { it.uppercase() }, color = Foreground, fontWeight = FontWeight.SemiBold)
        if (oauth.linked) {
            Text(text = "Vinculada", color = Good, fontSize = 14.sp)
        } else {
            Button(
                onClick = onLinkRequested,
                colors = ButtonDefaults.buttonColors(containerColor = Surface2),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                modifier = Modifier.height(32.dp)
            ) {
                Text("Vincular", fontSize = 12.sp, color = Foreground)
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

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = platform.platform.uppercase(), color = Foreground, fontWeight = FontWeight.Bold)
            if (platform.linked) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = platform.username ?: "Vinculado", color = Muted, fontSize = 14.sp)
                    IconButton(
                        onClick = { showUnlinkConfirm = true },
                        enabled = !isProcessing
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = "Desvincular", tint = Danger)
                    }
                }
            } else {
                if (!isLinking) {
                    Button(
                        onClick = { isLinking = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Vincular", fontSize = 12.sp)
                    }
                }
            }
        }

        if (isLinking && !platform.linked) {
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = inputUsername,
                onValueChange = { inputUsername = it },
                placeholder = { Text("ID Público / Gamertag", color = Muted) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground
                ),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { isLinking = false; errorMsg = null }, enabled = !isProcessing) {
                    Text("Cancelar", color = Muted)
                }
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
                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    enabled = !isProcessing && inputUsername.isNotBlank()
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(color = Background, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Conectar")
                    }
                }
            }
            if (errorMsg != null) {
                Text(text = errorMsg!!, color = Danger, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }

    if (showUnlinkConfirm) {
        com.paragon.app.ui.common.ConfirmDialog(
            title = "¿Desvincular ${platform.platform.uppercase()}?",
            message = "Tu progreso y trofeos ya guardados se quedan tal cual, pero deja de sincronizarse hasta que vuelvas a vincular la cuenta.",
            confirmLabel = "Sí, desvincular",
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
