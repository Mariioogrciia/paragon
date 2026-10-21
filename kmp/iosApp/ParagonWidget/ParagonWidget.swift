import SwiftUI
import WidgetKit

/// Widget de la pantalla de inicio: el juego anclado y su progreso, igual que
/// el de Android (PinnedGameWidget.kt). No lleva Kotlin: lee lo que deja la
/// app en el App Group (WidgetUpdater.ios.kt), con los textos ya en el
/// idioma de la app. Tocarlo abre Paragon.

private let grupoApp = "group.com.paragon.app.kmp"

struct Objetivo: TimelineEntry {
    let date: Date
    let hay: Bool
    let titulo: String
    let detalle: String
    let progreso: Double
}

struct Proveedor: TimelineProvider {
    func placeholder(in context: Context) -> Objetivo {
        Objetivo(date: .now, hay: true, titulo: "Elden Ring", detalle: "32/42 · 76%", progreso: 0.76)
    }

    func getSnapshot(in context: Context, completion: @escaping (Objetivo) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : leer())
    }

    /// La app avisa con `reloadAllTimelines()` cada vez que cambia; por si
    /// acaso, se vuelve a leer cada pocas horas.
    func getTimeline(in context: Context, completion: @escaping (Timeline<Objetivo>) -> Void) {
        completion(Timeline(entries: [leer()], policy: .after(.now.addingTimeInterval(4 * 3600))))
    }

    private func leer() -> Objetivo {
        let datos = UserDefaults(suiteName: grupoApp)
        guard let datos, let titulo = datos.string(forKey: "widget_titulo") else {
            // La app todavía no ha escrito nada (recién instalada o sin sesión).
            let (t, d) = textosVacios()
            return Objetivo(date: .now, hay: false, titulo: t, detalle: d, progreso: 0)
        }
        return Objetivo(
            date: .now,
            hay: datos.bool(forKey: "widget_hay"),
            titulo: titulo,
            detalle: datos.string(forKey: "widget_detalle") ?? "",
            progreso: datos.double(forKey: "widget_progreso")
        )
    }

    /// Los mismos textos que `widget_sin_objetivo` en kmp/i18n/textos.json.
    private func textosVacios() -> (String, String) {
        switch Locale.preferredLanguages.first?.prefix(2) ?? "es" {
        case "en": return ("No pinned goal", "Pin a game from its game page")
        case "de": return ("Kein Ziel angeheftet", "Hefte ein Spiel auf seiner Spielseite an")
        case "fr": return ("Aucun objectif épinglé", "Épingle un jeu depuis sa fiche")
        case "it": return ("Nessun obiettivo fissato", "Fissa un gioco dalla sua scheda")
        case "pt": return ("Sem objetivo fixado", "Fixa um jogo a partir da ficha de jogo")
        default: return ("Sin objetivo anclado", "Fija un juego desde la ficha de juego")
        }
    }
}

/// Mismos colores que el widget de Android (claro / oscuro del sistema).
private extension Color {
    static func paragon(claro: UInt32, oscuro: UInt32) -> Color {
        Color(UIColor { rasgos in
            let hex = rasgos.userInterfaceStyle == .dark ? oscuro : claro
            return UIColor(
                red: CGFloat((hex >> 16) & 0xFF) / 255,
                green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255,
                alpha: 1
            )
        })
    }

    static let fondoWidget = paragon(claro: 0xFFFFFF, oscuro: 0x0C0C0C)
    static let acentoWidget = paragon(claro: 0x1D6FE0, oscuro: 0xB026FF)
    static let apagadoWidget = paragon(claro: 0x5B6472, oscuro: 0xA0A0A0)
    static let pistaWidget = paragon(claro: 0xEBEDF1, oscuro: 0x262626)
}

struct VistaObjetivo: View {
    let objetivo: Objetivo

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(objetivo.titulo)
                .font(.headline)
                .foregroundStyle(Color.acentoWidget)
                .lineLimit(2)
            if objetivo.hay {
                Spacer(minLength: 0)
                ProgressView(value: min(max(objetivo.progreso, 0), 1))
                    .tint(Color.acentoWidget)
                    .background(Color.pistaWidget, in: Capsule())
            }
            Text(objetivo.detalle)
                .font(.caption)
                .foregroundStyle(Color.apagadoWidget)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(Color.fondoWidget, for: .widget)
        .widgetURL(URL(string: "paragon://abrir"))
    }
}

/// La descripción de la galería de widgets, en el idioma del iPhone.
private var descripcion: String {
    switch Locale.preferredLanguages.first?.prefix(2) ?? "es" {
    case "en": return "Your pinned game and its progress."
    case "de": return "Dein angeheftetes Spiel und sein Fortschritt."
    case "fr": return "Ton jeu épinglé et sa progression."
    case "it": return "Il tuo gioco fissato e i suoi progressi."
    case "pt": return "O teu jogo fixado e o seu progresso."
    default: return "Tu juego anclado y su progreso."
    }
}

@main
struct ParagonWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ParagonObjetivo", provider: Proveedor()) { objetivo in
            VistaObjetivo(objetivo: objetivo)
        }
        .configurationDisplayName("Paragon")
        .description(descripcion)
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
