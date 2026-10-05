import CoreHaptics
import UIKit
import Shared

/// Vibraciones con Core Haptics: un patrón propio por metal, que sube de
/// intensidad del bronce al platino. Kotlin las pide por la interfaz común
/// `Hapticos` (registrada en `iOSApp`). En un iPhone sin motor háptico
/// (o un iPad) cae a los generadores básicos de UIKit.
final class HapticosIOS: NSObject, Hapticos {
    private var motor: CHHapticEngine?
    private let seleccion = UISelectionFeedbackGenerator()
    private let aviso = UINotificationFeedbackGenerator()

    override init() {
        super.init()
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        do {
            let motor = try CHHapticEngine()
            motor.isAutoShutdownEnabled = true
            // iOS para el motor al ir a segundo plano o si otra app lo reclama.
            motor.resetHandler = { [weak motor] in try? motor?.start() }
            self.motor = motor
        } catch {
            motor = nil
        }
    }

    func toque() {
        seleccion.selectionChanged()
    }

    func trofeo(metal: String) {
        guard let motor else {
            aviso.notificationOccurred(metal == "platino" ? .success : .warning)
            return
        }
        do {
            let patron = try CHHapticPattern(events: eventos(metal), parameterCurves: curvas(metal))
            try motor.start()
            try motor.makePlayer(with: patron).start(atTime: CHHapticTimeImmediate)
        } catch {
            aviso.notificationOccurred(.success)
        }
    }

    // MARK: - Patrones

    private func golpe(_ t: TimeInterval, intensidad: Float, nitidez: Float) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensidad),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: nitidez),
            ],
            relativeTime: t
        )
    }

    private func zumbido(_ t: TimeInterval, duracion: TimeInterval, intensidad: Float, nitidez: Float) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensidad),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: nitidez),
            ],
            relativeTime: t,
            duration: duracion
        )
    }

    private func eventos(_ metal: String) -> [CHHapticEvent] {
        switch metal {
        case "bronce":
            // Un toque suave y sordo.
            return [golpe(0, intensidad: 0.55, nitidez: 0.3)]
        case "plata":
            // Doble toque, el segundo más flojo.
            return [golpe(0, intensidad: 0.75, nitidez: 0.55), golpe(0.11, intensidad: 0.5, nitidez: 0.55)]
        case "oro":
            // Tres toques que suben y se afilan.
            return [
                golpe(0, intensidad: 0.6, nitidez: 0.5),
                golpe(0.1, intensidad: 0.8, nitidez: 0.7),
                golpe(0.2, intensidad: 1.0, nitidez: 0.9),
            ]
        default:
            // Platino: zumbido que crece, ráfaga de golpes nítidos en lo alto
            // y una cola que se apaga.
            return [
                zumbido(0, duracion: 0.6, intensidad: 1.0, nitidez: 0.25),
                golpe(0.62, intensidad: 1.0, nitidez: 1.0),
                golpe(0.72, intensidad: 0.9, nitidez: 1.0),
                golpe(0.82, intensidad: 1.0, nitidez: 1.0),
                zumbido(0.9, duracion: 0.45, intensidad: 0.6, nitidez: 0.1),
            ]
        }
    }

    /// Solo el platino tiene curvas: la subida del primer zumbido y el
    /// apagado de la cola (multiplican la intensidad de los eventos).
    private func curvas(_ metal: String) -> [CHHapticParameterCurve] {
        guard metal != "bronce", metal != "plata", metal != "oro" else { return [] }
        return [
            CHHapticParameterCurve(
                parameterID: .hapticIntensityControl,
                controlPoints: [
                    .init(relativeTime: 0, value: 0.15),
                    .init(relativeTime: 0.6, value: 1.0),
                    .init(relativeTime: 0.9, value: 1.0),
                    .init(relativeTime: 1.35, value: 0.0),
                ],
                relativeTime: 0
            ),
        ]
    }
}
