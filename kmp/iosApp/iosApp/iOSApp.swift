import AppIntents
import SwiftUI
import Shared

@main
struct iOSApp: App {
    init() {
        HapticosKt.configurarHapticos(implementacion: HapticosIOS())
        // Para que «Cuánto falta para <juego>» reconozca los juegos de la lista.
        ParagonAtajos.updateAppShortcutParameters()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                // Vuelta del login en Safari: paragon://auth?c=<token cifrado>.
                .onOpenURL { url in AppIOS.shared.recibirEnlace(url: url.absoluteString) }
        }
    }
}
