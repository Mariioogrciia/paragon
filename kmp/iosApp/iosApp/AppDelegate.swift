import Shared
import UIKit
import UserNotifications
import WidgetKit

/// Lo que iOS solo cuenta a un `UIApplicationDelegate`: el token de push
/// (APNs) y los toques en las notificaciones. Kotlin pide el permiso por
/// `AvisosIOS` al iniciar sesión (ver NativoIOS.kt) y recibe el token en
/// `AppIOS.registrarTokenPush`; el servidor lo manda a APNs (lib/apns.ts).
///
/// Las push solo llegan con la app firmada por una cuenta de desarrollador
/// de pago (el permiso `aps-environment` de Paragon.entitlements): la IPA sin
/// firmar que se instala con Sideloadly y una cuenta gratuita no recibe
/// token, y aquí no pasa nada más.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, AvisosIOS, WidgetIOS {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        AppIOS.shared.avisos = self
        AppIOS.shared.widget = self
        // Con sesión ya iniciada: si el permiso ya estaba dado no sale nada y
        // solo se refresca el token (iOS puede cambiarlo entre arranques).
        if AppIOS.shared.haySesion() { pedirPermiso() }
        return true
    }

    // MARK: - AvisosIOS

    func pedirPermiso() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { concedido, _ in
            guard concedido else { return }
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        AppIOS.shared.registrarTokenPush(hex: hex)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Sin `aps-environment` (firma gratuita) iOS no da token: sin avisos, sin más.
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Con la app abierta iOS no enseña el aviso si no se le pide.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }

    // MARK: - WidgetIOS

    func recargar() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
