package com.paragon.shared.sesion

import com.paragon.shared.red.URL_BASE
import dev.whyoleg.cryptography.BinarySize.Companion.bits
import dev.whyoleg.cryptography.CryptographyProvider
import dev.whyoleg.cryptography.algorithms.AES
import dev.whyoleg.cryptography.random.CryptographyRandom
import io.ktor.http.encodeURLPathPart
import io.ktor.http.encodeURLQueryComponent
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * Login con el token cifrado (auditoría, 4 oct 2026) — ver
 * src/lib/enlaceMovil.ts en el proyecto Next.js para el porqué.
 *
 * Cada login genera una clave aleatoria de 32 bytes que viaja a
 * `/movil/entrar/{provider}?k=...` por HTTPS y se guarda aquí. El servidor
 * devuelve `paragon://auth?c=<token cifrado con esa clave>` (AES-256-GCM:
 * 12 bytes de IV + cifrado + etiqueta de 16). Otra app que capture el enlace
 * no puede leer el token, y un enlace fabricado por otro (para meterte en su
 * cuenta) no se descifra con nuestra clave y se ignora.
 *
 * Abrir el navegador es de cada plataforma (Custom Tab en Android,
 * ASWebAuthenticationSession en iOS); aquí solo la URL y el descifrado.
 */
@OptIn(ExperimentalEncodingApi::class)
object EnlaceSeguro {
    private val base64 = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT_OPTIONAL)

    /** URL del login (o de la vinculación) con una clave nueva, ya guardada en `tokenStore`. */
    fun urlLogin(tokenStore: TokenStore, provider: String): String {
        val k = base64.encode(CryptographyRandom.nextBytes(32))
        tokenStore.pendingLoginKey = k
        return "${URL_BASE}movil/entrar/${provider.encodeURLPathPart()}?k=${k.encodeURLQueryComponent()}"
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
            val datos = base64.decode(c)
            if (datos.size < 12 + 16 + 1) return null
            val clave = CryptographyProvider.Default.get(AES.GCM)
                .keyDecoder()
                .decodeFromByteArrayBlocking(AES.Key.Format.RAW, base64.decode(k))
            // Mismo formato que el servidor: IV de 12 bytes delante, etiqueta de 128 bits al final.
            val token = clave.cipher(tagSize = 128.bits).decryptBlocking(datos).decodeToString()
            tokenStore.pendingLoginKey = null
            token.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }
}
