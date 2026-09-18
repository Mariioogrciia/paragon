package com.paragon.app.ui.panel

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.R
import com.paragon.app.data.ChooseHandleResult
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.PanelResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.main.MainScreen
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Bronze
import com.paragon.app.ui.theme.Danger
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Gold
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Platinum
import com.paragon.app.ui.theme.Silver
import com.paragon.app.ui.theme.Surface as SurfaceColor
import kotlinx.coroutines.launch

/**
 * Puerta de entrada real antes de `MainScreen` (el NavHost + BottomBar de
 * Gemini, en ui/main): decide entre "pide login", "cargando" y "no hay
 * red", contra /api/mobile/panel de verdad. Separado del NavHost a
 * propósito — esto solo necesita saber SI hay sesión, no qué pantalla se ve
 * dentro.
 *
 * `current.profile`/`current.stats` (perfil + stats reales) bajan a
 * MainScreen → PanelScreen.
 */
@Composable
fun AppRoot(
    tokenStore: TokenStore,
    themeStore: ThemeStore,
    refreshKey: Int = 0,
    onLoginRequested: (provider: String) -> Unit = {},
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val panelDao = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context).panelDao() }
    val repository = remember(tokenStore, panelDao) { PanelRepository(tokenStore, panelDao) }
    var result by remember { mutableStateOf<PanelResult?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshKey, retryCounter.value) {
        result = null
        result = repository.getPanel()
    }

    when (val current = result) {
        null -> LoadingGate()
        is PanelResult.NeedsLogin -> LoginGate(onLogin = onLoginRequested)
        is PanelResult.NeedsOnboarding -> OnboardingGate(
            repository = repository,
            onDone = { retryCounter.value += 1 },
        )
        is PanelResult.Error -> ErrorGate(
            message = current.message,
            onRetry = { retryCounter.value += 1 },
        )
        is PanelResult.Ok -> MainScreen(tokenStore, themeStore, current.profile, current.stats, current.racha, current.fromCache)
    }
}

@Composable
private fun LoadingGate() {
    Box(
        modifier = Modifier.fillMaxSize().background(Background),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(color = Accent)
    }
}

private val GoogleBlue = Color(0xFF4285F4)
private val DiscordBlurple = Color(0xFF5865F2)

/**
 * Un botón por proveedor — cada uno abre la Custom Tab directa a
 * /movil/entrar/{provider} (ver ese route en el proyecto Next.js), que va
 * derecho a la pantalla real de Google/Discord sin pasar por ninguna
 * página web de Paragon de por medio. Mismo diseño de tarjeta con icono de
 * marca que los botones de src/app/entrar/page.tsx (la web) — logos reales
 * como vector drawable (`ic_google`/`ic_discord`, mismos paths SVG),
 * no un icono genérico.
 */
/**
 * Antes era texto suelto flotando en el centro de una pantalla vacía — se
 * añade la misma idea que el panel oscuro de `src/app/entrar/page.tsx` (la
 * web): degradado de acento, la marca en una insignia propia, y una fila de
 * cifras de trofeo puramente decorativas (mismos números/colores que la
 * web) para que la primera pantalla que ve alguien ya transmita de qué va
 * la app, no solo dos botones.
 */
@Composable
private fun LoginGate(onLogin: (provider: String) -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(Accent.copy(alpha = 0.16f), Background),
                    radius = 900f,
                )
            )
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(Brush.linearGradient(listOf(Accent, Accent.copy(alpha = 0.6f))), RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(text = "P", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black)
            }

            Text(
                text = "PARAGON",
                color = Foreground,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
                modifier = Modifier.padding(top = 18.dp),
            )
            Text(
                text = "El siguiente platino no se espera.",
                color = Accent,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 10.dp, bottom = 28.dp),
            )

            Row(
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 32.dp),
            ) {
                GradeChip("87", "Platino", Platinum)
                GradeChip("341", "Oro", Gold)
                GradeChip("812", "Plata", Silver)
                GradeChip("3072", "Bronce", Bronze)
            }

            ProviderButton(
                label = "Continuar con Google",
                iconRes = R.drawable.ic_google,
                accentColor = GoogleBlue,
                onClick = { onLogin("google") },
            )
            Spacer(Modifier.height(12.dp))
            ProviderButton(
                label = "Continuar con Discord",
                iconRes = R.drawable.ic_discord,
                accentColor = DiscordBlurple,
                onClick = { onLogin("discord") },
            )

            Text(
                text = "No guardamos contraseñas: el acceso lo lleva tu proveedor.",
                color = Muted,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 32.dp),
            )
        }
    }
}

@Composable
private fun GradeChip(value: String, label: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = SurfaceColor,
        border = BorderStroke(1.dp, Border),
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(text = value, color = color, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            Text(text = label, color = Muted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
        }
    }
}

/**
 * Paso 1 del alta (ver POST /api/mobile/profile/handle): sin esto, un login
 * nuevo por Google/Discord se quedaba mirando "El servidor respondió con un
 * error (409)" con un botón "Reintentar" que repite la misma petición para
 * siempre — el 409 es real y esperado (perfil sin `handle` todavía), no un
 * fallo de red, y nunca se arregla solo.
 */
@Composable
private fun OnboardingGate(repository: PanelRepository, onDone: () -> Unit) {
    var handle by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun submit() {
        if (loading) return
        error = null
        loading = true
        scope.launch {
            when (val res = repository.chooseHandle(handle.trim().lowercase())) {
                is ChooseHandleResult.Ok -> onDone()
                is ChooseHandleResult.Error -> {
                    error = res.message
                    loading = false
                }
            }
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Background).padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = "Elige tu nombre de usuario",
                color = Foreground,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "Es tu identificador dentro de Paragon, y por donde tus amigos te añadirán.",
                color = Muted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
            )

            Surface(
                shape = RoundedCornerShape(14.dp),
                color = SurfaceColor,
                border = BorderStroke(1.dp, if (error != null) Danger else Border),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 16.dp)) {
                    Text(text = "@", color = Muted, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    TextField(
                        value = handle,
                        onValueChange = { handle = it.filter { c -> c.isLetterOrDigit() || c == '_' }.take(20) },
                        placeholder = { Text("mario_gg", color = Muted) },
                        singleLine = true,
                        enabled = !loading,
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = Foreground,
                            unfocusedTextColor = Foreground,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            if (error != null) {
                Text(
                    text = error ?: "",
                    color = Danger,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Button(
                onClick = { submit() },
                enabled = handle.trim().length >= 3 && !loading,
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
            ) {
                if (loading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                } else {
                    Text("Continuar")
                }
            }

            Text(
                text = "Entre 3 y 20 caracteres, solo minúsculas, números y guion bajo.",
                color = Muted,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 16.dp),
            )
        }
    }
}

@Composable
private fun ProviderButton(
    label: String,
    iconRes: Int,
    accentColor: Color,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = SurfaceColor,
        border = BorderStroke(1.dp, Border),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 15.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(accentColor.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = null,
                    // Sin tinte: los vector drawable ya llevan sus colores
                    // de marca reales (el de Google, 4 colores).
                    tint = Color.Unspecified,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(14.dp))
            Text(text = label, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun ErrorGate(message: String, onRetry: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Background).padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = message, color = Foreground, fontSize = 14.sp)
            Button(
                onClick = onRetry,
                modifier = Modifier.padding(top = 16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
            ) {
                Text("Reintentar")
            }
        }
    }
}
