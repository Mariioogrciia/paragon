import AppIntents
import CoreSpotlight
import SwiftUI
import Shared

@main
struct iOSApp: App {
    /// Push (APNs) y widget: ver AppDelegate.swift.
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        HapticosKt.configurarHapticos(implementacion: HapticosIOS())
        // Para que «Cuánto falta para <juego>» reconozca los juegos de la lista.
        ParagonAtajos.updateAppShortcutParameters()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                // Vuelta del login en Safari (paragon://auth?c=<token cifrado>)
                // y Universal Links de la web (https://www.paragontrophies.com/u/…):
                // SwiftUI entrega los dos aquí.
                .onOpenURL { url in AppIOS.shared.recibirEnlace(url: url.absoluteString) }
                // Tocar un juego en Spotlight (AppDelegate.indexar): su ficha.
                .onContinueUserActivity(CSSearchableItemActionType) { actividad in
                    if let id = actividad.userInfo?[CSSearchableItemActivityIdentifier] as? String {
                        AppIOS.shared.abrirAviso(url: "/juego/\(id)")
                    }
                }
        }
    }
}
