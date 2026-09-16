package com.paragon.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.BASE_URL
import com.paragon.app.ui.panel.AppRoot
import com.paragon.app.ui.theme.ParagonTheme

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

    // Se sube cada vez que llega un token nuevo por el deep link, para que
    // PanelScreen sepa que tiene que volver a pedir el panel real.
    private val refreshTrigger = mutableIntStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tokenStore = TokenStore(applicationContext)

        enableEdgeToEdge()
        handleDeepLink(intent)

        setContent {
            ParagonTheme {
                val refresh by refreshTrigger
                AppRoot(
                    tokenStore = tokenStore,
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

    private fun handleDeepLink(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data?.scheme == "paragon" && data.host == "auth") {
            val token = data.getQueryParameter("token")
            if (!token.isNullOrBlank()) {
                tokenStore.token = token
                refreshTrigger.value += 1
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
