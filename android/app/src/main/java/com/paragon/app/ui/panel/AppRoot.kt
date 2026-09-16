package com.paragon.app.ui.panel

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.PanelResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.main.MainScreen
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted

/**
 * Puerta de entrada real antes de `MainScreen` (el NavHost + BottomBar de
 * Gemini, en ui/main): decide entre "pide login", "cargando" y "no hay
 * red", contra /api/mobile/panel de verdad. Separado del NavHost a
 * propósito — esto solo necesita saber SI hay sesión, no qué pantalla se ve
 * dentro.
 *
 * `current.profile`/`current.stats` (perfil + stats reales) bajan a
 * MainScreen → PanelScreen. Biblioteca/Comunidad/Ligas siguen con placeholder
 * (Gemini) y el resto del Panel (trofeos por metal, recientes, a un paso del
 * platino) sigue con PanelRepository.getMock* — /api/mobile/panel de hoy
 * solo da perfil+stats, no esas listas.
 */
@Composable
fun AppRoot(
    tokenStore: TokenStore,
    refreshKey: Int = 0,
    onLoginRequested: (provider: String) -> Unit = {},
) {
    val repository = remember(tokenStore) { PanelRepository(tokenStore) }
    var result by remember { mutableStateOf<PanelResult?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshKey, retryCounter.value) {
        result = null
        result = repository.getPanel()
    }

    when (val current = result) {
        null -> LoadingGate()
        is PanelResult.NeedsLogin -> LoginGate(onLogin = onLoginRequested)
        is PanelResult.Error -> ErrorGate(
            message = current.message,
            onRetry = { retryCounter.value += 1 },
        )
        is PanelResult.Ok -> MainScreen(tokenStore, current.profile, current.stats)
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

/**
 * Un botón por proveedor — cada uno abre la Custom Tab directa a
 * /movil/entrar/{provider} (ver ese route en el proyecto Next.js), que va
 * derecho a la pantalla real de Google/Discord sin pasar por ninguna
 * página web de Paragon de por medio.
 */
@Composable
private fun LoginGate(onLogin: (provider: String) -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Background).padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "PARAGON",
                color = Foreground,
                fontSize = 18.sp,
            )
            Text(
                text = "Entra con tu cuenta de Google o Discord para ver tu panel real.",
                color = Muted,
                fontSize = 14.sp,
                modifier = Modifier.padding(top = 12.dp, bottom = 24.dp),
            )
            Button(
                onClick = { onLogin("google") },
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                modifier = Modifier.padding(bottom = 12.dp),
            ) {
                Text("Continuar con Google")
            }
            Button(
                onClick = { onLogin("discord") },
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
            ) {
                Text("Continuar con Discord")
            }
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
