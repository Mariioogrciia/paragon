package com.paragon.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.share.ShareAddScreen
import com.paragon.app.ui.theme.ParagonTheme

/**
 * "Añadir a Paragon" desde el Sharesheet del sistema (idea #4 de
 * Antigravity) — el `<intent-filter>` de `ACTION_SEND` (ver
 * AndroidManifest.xml) hace que Paragon aparezca en el menú de "Compartir"
 * de cualquier app (Chrome, YouTube...). Actividad propia, no
 * ComposeMainActivity, para no mezclar esto con el resto de la navegación
 * (singleTask, los 4 alias de icono, el deep link de login) — se abre,
 * hace su cosa, se cierra.
 */
class ShareReceiverActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val tokenStore = TokenStore(applicationContext)
        val themeStore = ThemeStore(applicationContext)
        val initialQuery = extractQuery(intent)

        setContent {
            ParagonTheme(themeStore = themeStore) {
                ShareAddScreen(
                    tokenStore = tokenStore,
                    initialQuery = initialQuery,
                    onClose = { finish() },
                )
            }
        }
    }

    /**
     * `EXTRA_SUBJECT` suele traer el título real (Chrome manda el título de
     * la página ahí) — se prefiere sobre `EXTRA_TEXT`, que normalmente es
     * solo la URL. Si no hay asunto, se limpia la URL de `EXTRA_TEXT` a
     * mano (muchas apps mandan "Título https://...", no la URL sola) y se
     * usa lo que quede. Nunca se busca con la URL entera — no es un título
     * de juego real, solo ensuciaría la búsqueda.
     */
    private fun extractQuery(intent: Intent): String {
        val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)?.trim()
        if (!subject.isNullOrBlank()) return subject

        val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: return ""
        return text.replace(Regex("https?://\\S+"), "").trim()
    }
}
