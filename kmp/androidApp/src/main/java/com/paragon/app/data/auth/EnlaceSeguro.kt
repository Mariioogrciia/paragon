package com.paragon.app.data.auth

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.browser.customtabs.CustomTabsIntent
import com.paragon.app.data.network.BASE_URL
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Login por Custom Tab con el token cifrado (auditoría, 4 oct 2026) — ver
 * src/lib/enlaceMovil.ts en el proyecto Next.js para el porqué.
 *
 * Cada login genera una clave aleatoria de 32 bytes que viaja a
 * `/movil/entrar/{provider}?k=...` por HTTPS y se guarda aquí. El servidor
 * devuelve `paragon://auth?c=<token cifrado con esa clave>`. Otra app que
 * capture el enlace no puede leer el token, y un enlace fabricado por otro
 * (para meterte en su cuenta) no se descifra con nuestra clave y se ignora.
 */
object EnlaceSeguro {
    private const val FLAGS = Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP

    /** Abre el login (o la vinculación) de Google/Discord con una clave nueva. */
    fun abrirLogin(context: Context, tokenStore: TokenStore, provider: String) {
        val clave = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val k = Base64.encodeToString(clave, FLAGS)
        tokenStore.pendingLoginKey = k
        val url = Uri.parse(BASE_URL).buildUpon()
            .appendEncodedPath("movil/entrar/$provider")
            .appendQueryParameter("k", k)
            .build()
        CustomTabsIntent.Builder().build().launchUrl(context, url)
    }

    /**
     * Token de sesión del enlace `paragon://auth?c=...`, o null si no hay
     * login pendiente o no se descifra con la clave guardada. La clave se
     * gasta solo cuando funciona: un enlace falso no estropea el login de
     * verdad que aún esté en curso.
     */
    fun tokenDelEnlace(tokenStore: TokenStore, c: String?): String? {
        val k = tokenStore.pendingLoginKey ?: return null
        if (c.isNullOrBlank()) return null
        return try {
            val datos = Base64.decode(c, FLAGS)
            if (datos.size < 12 + 16 + 1) return null
            val cifrador = Cipher.getInstance("AES/GCM/NoPadding")
            cifrador.init(
                Cipher.DECRYPT_MODE,
                SecretKeySpec(Base64.decode(k, FLAGS), "AES"),
                GCMParameterSpec(128, datos, 0, 12),
            )
            val token = String(cifrador.doFinal(datos, 12, datos.size - 12), Charsets.UTF_8)
            tokenStore.pendingLoginKey = null
            token.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }
}
