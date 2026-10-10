package com.paragon.app

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import platform.AuthenticationServices.ASWebAuthenticationSession
import platform.AuthenticationServices.ASWebAuthenticationPresentationContextProvidingProtocol
import platform.AuthenticationServices.ASPresentationAnchor
import platform.Foundation.NSURL
import platform.darwin.NSObject
import androidx.compose.ui.window.ComposeUIViewController
import coil3.ImageLoader
import coil3.compose.setSingletonImageLoaderFactory
import coil3.network.ktor3.KtorNetworkFetcherFactory
import coil3.request.crossfade
import com.paragon.app.data.AparienciaRepository
import com.paragon.app.data.local.ParagonDatabase
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.theme.crearThemeStoreIOS
import com.paragon.app.ui.panel.AppRoot
import com.paragon.app.ui.settings.aplicarIdiomaGuardado
import com.paragon.app.ui.theme.ParagonTheme
import com.paragon.shared.ContextoIOS
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.ClienteParagon
import com.paragon.shared.sesion.EnlaceSeguro
import com.paragon.shared.sesion.abrirLoginEnNavegador
import com.paragon.shared.sesion.crearTokenStore
import io.ktor.client.engine.darwin.Darwin
import io.ktor.http.Url
import platform.UIKit.UIViewController

/** El estado de la app de iOS que vive fuera de Compose (lo usa también Swift). */
object AppIOS {
    val tokenStore by lazy { crearTokenStore(ContextoIOS) }
    val themeStore by lazy { crearThemeStoreIOS() }

    /** Sube con cada login o cierre de sesión: el panel se vuelve a pedir. */
    internal var refresco by mutableIntStateOf(0)

    private var configurada = false

    internal fun configurar() {
        if (configurada) return
        configurada = true
        aplicarIdiomaGuardado()
        ApiClient.configurar { tokenStore ->
            ClienteParagon(
                motor = Darwin.create(),
                token = { tokenStore.token },
                idioma = { Textos.idioma.codigo },
            )
        }
    }

    /**
     * La vuelta del login en Safari: `paragon://auth?c=<token cifrado>`. Lo
     * llama iOSApp.swift (onOpenURL). Un enlace que no venga de nuestro login
     * en curso no se descifra y se ignora (ver EnlaceSeguro).
     */
    fun recibirEnlace(url: String) {
        val enlace = try { Url(url) } catch (e: Exception) { return }
        if (enlace.protocol.name != "paragon" || enlace.host != "auth") return
        val token = EnlaceSeguro.tokenDelEnlace(tokenStore, enlace.parameters["c"]) ?: return
        tokenStore.token = token
        refresco++
    }
}

/** La app entera; la monta ContentView.swift (`MainViewControllerKt.MainViewController()`). */
@Suppress("FunctionName", "unused")
fun MainViewController(): UIViewController {
    AppIOS.configurar()

    // Variable mutable para que no recolecte basura la sesión
    var authSession: ASWebAuthenticationSession? = null

    // Pre-declaramos el controller para poder usar su `window` en el delegate
    lateinit var controller: UIViewController

    controller = ComposeUIViewController {
        // Coil en iOS: descarga por Ktor (Darwin) y fundido al aparecer, como en Android.
        setSingletonImageLoaderFactory { contexto ->
            ImageLoader.Builder(contexto)
                .components {
                    add(com.paragon.app.ui.common.UrlImagenesMapper)
                    add(KtorNetworkFetcherFactory())
                }
                .crossfade(true)
                .build()
        }
        val refresco = AppIOS.refresco
        ParagonTheme(themeStore = AppIOS.themeStore) {
            // Apariencia de la cuenta (la misma que en la web): al abrir y tras cada login.
            LaunchedEffect(refresco) {
                AparienciaRepository(AppIOS.tokenStore, AppIOS.themeStore).sincronizarDesdeCuenta()
            }
            AppRoot(
                tokenStore = AppIOS.tokenStore,
                themeStore = AppIOS.themeStore,
                database = ParagonDatabase.getDatabase(ContextoIOS),
                refreshKey = refresco,
                onLoginRequested = { provider ->
                    val urlString = EnlaceSeguro.urlLogin(AppIOS.tokenStore, provider)
                    val url = NSURL.URLWithString(urlString)!!
                    
                    authSession = ASWebAuthenticationSession(
                        uRL = url,
                        callbackURLScheme = "paragon",
                        completionHandler = { callbackUrl: NSURL?, error: platform.Foundation.NSError? ->
                            if (callbackUrl != null) {
                                AppIOS.recibirEnlace(callbackUrl.absoluteString!!)
                            }
                            authSession = null
                        }
                    )
                    
                    authSession?.presentationContextProvider = object : NSObject(), ASWebAuthenticationPresentationContextProvidingProtocol {
                        override fun presentationAnchorForWebAuthenticationSession(session: ASWebAuthenticationSession): ASPresentationAnchor {
                            return controller.view.window!!
                        }
                    }
                    
                    authSession?.start()
                },
                onLogout = { AppIOS.refresco++ },
            )
        }
    }
    
    return controller
}
