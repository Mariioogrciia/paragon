import AppIntents
import Foundation
import Shared

// Siri, Atajos y Spotlight con App Intents: no necesitan permisos especiales
// (ni la cuenta de pago). Los datos salen del mismo código Kotlin de red que
// usa la pantalla (`LanzamientosKt.proximosLanzamientos()`).

/// Las funciones `suspend` de Kotlin se llaman desde el hilo principal.
@MainActor
private func cargarLanzamientos() async throws -> [Lanzamiento] {
    try await LanzamientosKt.proximosLanzamientos()
}

private let isoConFracciones: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

/// Días que faltan, solo si la fecha es un día concreto (no "2027" ni "T3 2026").
private func diasHasta(_ juego: Lanzamiento) -> Int? {
    guard juego.releasePrecision == "day",
          let iso = juego.releaseDate,
          let fecha = isoConFracciones.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    else { return nil }
    let cal = Calendar.current
    return cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: fecha)).day
}

private func frase(dias: Int) -> String {
    switch dias {
    case ..<0: return "ya ha salido"
    case 0: return "sale hoy"
    case 1: return "sale mañana"
    default: return "faltan \(dias) días"
    }
}

// MARK: - «Próximos lanzamientos en Paragon»

struct ProximosLanzamientosIntent: AppIntent {
    static var title: LocalizedStringResource = "Próximos lanzamientos"
    static var description = IntentDescription("Te dice qué juegos salen pronto.")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let juegos = try await cargarLanzamientos()
        guard !juegos.isEmpty else {
            return .result(dialog: "Ahora mismo no tengo próximos lanzamientos.")
        }
        let lista = juegos.prefix(3).map { juego in
            if let fecha = juego.releaseLabel { return "\(juego.title), el \(fecha)" }
            return juego.title
        }
        let texto = "Lo próximo que sale: " + ListFormatter.localizedString(byJoining: Array(lista)) + "."
        return .result(dialog: IntentDialog(stringLiteral: texto))
    }
}

// MARK: - «Cuenta atrás en Paragon»

struct LanzamientoEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Lanzamiento"
    static var defaultQuery = LanzamientoQuery()

    let id: String
    let titulo: String
    let etiqueta: String?
    let dias: Int?

    init(_ juego: Lanzamiento) {
        id = juego.idJuego
        titulo = juego.title
        etiqueta = juego.releaseLabel
        dias = diasHasta(juego)
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: LocalizedStringResource(stringLiteral: titulo),
            subtitle: etiqueta.map { LocalizedStringResource(stringLiteral: $0) }
        )
    }
}

struct LanzamientoQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [LanzamientoEntity] {
        try await cargarLanzamientos().map(LanzamientoEntity.init).filter { identifiers.contains($0.id) }
    }

    /// Las opciones que ofrece Siri cuando pregunta "¿Qué juego?".
    func suggestedEntities() async throws -> [LanzamientoEntity] {
        try await cargarLanzamientos().map(LanzamientoEntity.init)
    }
}

struct CuentaAtrasIntent: AppIntent {
    static var title: LocalizedStringResource = "Cuenta atrás"
    static var description = IntentDescription("Cuántos días faltan para que salga un juego.")

    @Parameter(title: "Juego", requestValueDialog: "¿Para qué juego?")
    var juego: LanzamientoEntity

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let texto: String
        if let dias = juego.dias {
            texto = "\(juego.titulo): \(frase(dias: dias))."
        } else if let etiqueta = juego.etiqueta {
            texto = "\(juego.titulo) no tiene día exacto todavía. Sale: \(etiqueta)."
        } else {
            texto = "\(juego.titulo) aún no tiene fecha."
        }
        return .result(dialog: IntentDialog(stringLiteral: texto))
    }
}

// MARK: - Frases de Siri

struct ParagonAtajos: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ProximosLanzamientosIntent(),
            phrases: [
                "Próximos lanzamientos en \(.applicationName)",
                "Qué sale pronto en \(.applicationName)",
            ],
            shortTitle: "Próximos lanzamientos",
            systemImageName: "calendar"
        )
        AppShortcut(
            intent: CuentaAtrasIntent(),
            phrases: [
                "Cuenta atrás en \(.applicationName)",
                "Cuánto falta para \(\.$juego) en \(.applicationName)",
            ],
            shortTitle: "Cuenta atrás",
            systemImageName: "hourglass"
        )
    }
}
