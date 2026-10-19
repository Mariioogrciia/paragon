package com.paragon.app.anuncios

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import com.paragon.app.BuildConfig
import com.paragon.app.ui.common.Anuncios
import java.util.concurrent.atomic.AtomicBoolean

/**
 * AdMob en Android (19 oct 2026). Apagado mientras no se compile con
 * ADMOB_APP_ID y ADMOB_BANNER_ID (secretos del repo, ver build.gradle.kts y
 * kmp/play/README.md): entonces `BuildConfig.ADMOB_BANNER` va vacío, esto no
 * hace nada y la app ni siquiera pide el identificador de publicidad.
 *
 * Con anuncios, el orden lo marca Google: primero el consentimiento (UMP, el
 * mensaje de "Privacidad y mensajes" de AdMob, certificado IAB TCF; en
 * Europa sale la primera vez) y solo cuando `canRequestAds()` se inicia el
 * SDK y se enseñan los huecos (ui/common/Anuncios.kt). En las compilaciones
 * de depuración el bloque es el de prueba de Google: pinchar anuncios
 * reales propios es motivo de baja en AdMob.
 */
object Publicidad {
    val activa: Boolean get() = BuildConfig.ADMOB_BANNER.isNotEmpty()

    private val sdkIniciado = AtomicBoolean(false)

    /** En cada `onCreate` de la actividad principal. */
    fun iniciar(actividad: Activity) {
        if (!activa) return
        val info = UserMessagingPlatform.getConsentInformation(actividad)
        // Si ya decidió en otra ocasión, no hace falta esperar a la red.
        actualizar(actividad.applicationContext, info)
        info.requestConsentInfoUpdate(
            actividad,
            ConsentRequestParameters.Builder().build(),
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(actividad) {
                    actualizar(actividad.applicationContext, info)
                }
            },
            { actualizar(actividad.applicationContext, info) },
        )
    }

    private fun actualizar(contexto: Context, info: ConsentInformation) {
        if (info.canRequestAds()) {
            if (!sdkIniciado.getAndSet(true)) {
                // Google recomienda iniciarlo fuera del hilo principal.
                Thread { MobileAds.initialize(contexto) {} }.start()
            }
            Anuncios.banner = @Composable { modifier: Modifier -> BannerAdMob(modifier) }
        } else {
            Anuncios.banner = null
        }
        Anuncios.opcionesPrivacidad =
            if (info.privacyOptionsRequirementStatus == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) {
                { ctx: Context ->
                    ctx.actividad()?.let { act ->
                        UserMessagingPlatform.showPrivacyOptionsForm(act) { actualizar(act.applicationContext, info) }
                    }
                }
            } else null
    }
}

/** Banner adaptable al ancho disponible, con su alto reservado (no salta al cargar). */
@Composable
private fun BannerAdMob(modifier: Modifier) {
    val contexto = LocalContext.current
    BoxWithConstraints(modifier) {
        val ancho = maxWidth.value.toInt()
        key(ancho) {
            val tamano = remember { AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(contexto, ancho) }
            AndroidView(
                modifier = Modifier.fillMaxWidth().height(tamano.height.dp),
                factory = { ctx ->
                    AdView(ctx).apply {
                        adUnitId = BuildConfig.ADMOB_BANNER
                        setAdSize(tamano)
                        loadAd(AdRequest.Builder().build())
                    }
                },
                onRelease = { it.destroy() },
            )
        }
    }
}

private tailrec fun Context.actividad(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.actividad()
    else -> null
}
