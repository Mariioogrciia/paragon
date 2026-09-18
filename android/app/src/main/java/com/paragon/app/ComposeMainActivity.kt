package com.paragon.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.paragon.app.data.PushRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.BASE_URL
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.panel.AppRoot
import com.paragon.app.ui.theme.ParagonTheme
import com.paragon.app.util.flushPendingDisable
import com.paragon.app.work.PanelSyncWorker
import kotlinx.coroutines.launch

/**
 * Único login real de la app (Google/Discord, sin contraseña — ver auth.ts en
 * el proyecto Next.js): se abre en una Custom Tab sobre la web de producción,
 * y /movil/enlazar (server-side) devuelve aquí el mismo sessionToken que usa
 * la cookie del navegador, vía este esquema propio. `onNewIntent` es el punto
 * de entrada normal — la Custom Tab reactiva ESTA Activity (declarada
 * singleTask en el manifest), no crea una nueva.
 */
class ComposeMainActivity : ComponentActivity() {
    private lateinit var tokenStore: TokenStore
    private lateinit var themeStore: ThemeStore

    // Se sube cada vez que llega un token nuevo por el deep link, para que
    // PanelScreen sepa que tiene que volver a pedir el panel real.
    private val refreshTrigger = mutableIntStateOf(0)

    // Android 13+ (API 33) exige pedir este permiso en tiempo de ejecución
    // para poder mostrar CUALQUIER notificación — sin él, FCM sigue
    // entregando el mensaje pero ParagonFirebaseMessagingService no puede
    // pintar nada. Se pide una vez; si se deniega, no se vuelve a insistir
    // sin que el sistema decida que toca (mismo comportamiento por defecto
    // de `registerForActivityResult`).
    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* nada que hacer con el resultado */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tokenStore = TokenStore(applicationContext)
        themeStore = ThemeStore(applicationContext)

        enableEdgeToEdge()
        handleDeepLink(intent)

        setContent {
            ParagonTheme(themeStore = themeStore) {
                val refresh by refreshTrigger
                // Nada de esto hace falta para pintar el primer frame — antes
                // se llamaban en serie ANTES de `setContent`, en el camino
                // crítico del arranque en frío. `LaunchedEffect(Unit)` las
                // deja correr justo después de la primera composición, sin
                // retrasar lo que el usuario ve primero.
                androidx.compose.runtime.LaunchedEffect(Unit) {
                    requestNotificationPermissionIfNeeded()
                    registerPushTokenIfLoggedIn()
                    PanelSyncWorker.schedule(applicationContext)
                }
                AppRoot(
                    tokenStore = tokenStore,
                    themeStore = themeStore,
                    refreshKey = refresh,
                    onLoginRequested = { provider -> openLogin(provider) },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    override fun onStop() {
        super.onStop()
        // Ya no estamos en primer plano — si cambiar de tema dejó un alias
        // de icono pendiente de apagar (ver IconSwitcher.kt), este es un
        // punto seguro para terminarlo sin arriesgarse a cerrar una tarea
        // que el usuario está mirando.
        flushPendingDisable(applicationContext)
    }

    private fun handleDeepLink(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data?.scheme == "paragon" && data.host == "auth") {
            val token = data.getQueryParameter("token")
            if (!token.isNullOrBlank()) {
                tokenStore.token = token
                refreshTrigger.value += 1
                // Recién logueado: registrar YA el token de FCM que ya
                // teníamos (si lo había) contra este usuario nuevo — antes
                // de esto no había sesión con la que autenticar la llamada.
                registerPushTokenIfLoggedIn()
            }
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val yaConcedido = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (!yaConcedido) requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    /**
     * Le pide a Firebase el token de este dispositivo y lo manda al backend
     * — sin `google-services.json` de por medio, `FirebaseApp.getApps()`
     * está vacío y esto no hace nada, en silencio (mismo criterio que el
     * resto de piezas opcionales de NativeAppSetup).
     */
    private fun registerPushTokenIfLoggedIn() {
        if (tokenStore.token == null) return
        if (FirebaseApp.getApps(applicationContext).isEmpty()) return

        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            val token = task.result ?: return@addOnCompleteListener
            lifecycleScope.launch {
                PushRepository(tokenStore).registerToken(token)
            }
        }
    }

    /**
     * Directo a /movil/entrar/{provider} — sin pasar por /movil/enlazar ni
     * por la página web de login (/entrar) de por medio, esa ruta redirige
     * ya mismo a la pantalla real de Google/Discord.
     */
    private fun openLogin(provider: String) {
        val loginUrl = Uri.parse(BASE_URL).buildUpon()
            .appendEncodedPath("movil/entrar/$provider")
            .build()
        CustomTabsIntent.Builder().build().launchUrl(this, loginUrl)
    }
}
