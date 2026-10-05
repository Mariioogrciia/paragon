import SwiftUI
import UIKit
import Shared

/// Toda la interfaz es Compose (Kotlin): Swift solo la monta a pantalla completa.
struct ComposeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

struct ContentView: View {
    var body: some View {
        // Los márgenes seguros (notch, barra inferior) los aplica Compose con
        // WindowInsets.safeDrawing, como en Android.
        ComposeView().ignoresSafeArea()
    }
}
