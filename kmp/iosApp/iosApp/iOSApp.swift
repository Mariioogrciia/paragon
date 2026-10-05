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
        }
    }
}
