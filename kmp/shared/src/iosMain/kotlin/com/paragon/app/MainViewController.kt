package com.paragon.app

import androidx.compose.ui.window.ComposeUIViewController
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.ParagonDatabase
import com.paragon.app.data.theme.IosThemeStore
import com.paragon.app.ui.panel.AppRoot
import com.paragon.app.ui.theme.ParagonTheme
import com.paragon.shared.ContextoIOS
import platform.UIKit.UIViewController

fun MainViewController(): UIViewController = ComposeUIViewController {
    // Estas instancias normalmente vendrían de un sistema de DI en KMP real o
    // inyectadas desde el código Swift si tienen contexto. 
    // Para simplificar aquí, las inicializamos igual que en Android pero para iOS.
    val tokenStore = TokenStore(ContextoIOS)
    val themeStore = IosThemeStore(ContextoIOS)
    val database = ParagonDatabase.getDatabase(ContextoIOS)

    ParagonTheme(themeStore = themeStore) {
        AppRoot(
            tokenStore = tokenStore,
            themeStore = themeStore,
            database = database,
            onLoginRequested = { provider ->
                // TODO: Lanzar login OAuth desde iOS (Safari/ASWebAuthenticationSession)
            }
        )
    }
}
