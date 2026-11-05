import CoreSpotlight
import UniformTypeIdentifiers
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
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, AvisosIOS, WidgetIOS, RachaIOS, BusquedaIOS {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        AppIOS.shared.avisos = self
        AppIOS.shared.widget = self
        AppIOS.shared.racha = self
        AppIOS.shared.busqueda = self
        // Accesos rápidos del icono (mantener pulsado), en el idioma de la app.
        application.shortcutItems = AccesosRapidosKt.accesosRapidos().map { acceso in
            UIApplicationShortcutItem(
                type: acceso.ruta,
                localizedTitle: acceso.titulo,
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: acceso.icono),
                userInfo: nil
            )
        }
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

    /// Tocar un aviso abre su pantalla: el servidor manda la ruta de la web
    /// en `url` (lib/apns.ts) y la app la traduce (EnlaceAviso.kt).
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if let url = response.notification.request.content.userInfo["url"] as? String {
            AppIOS.shared.abrirAviso(url: url)
        }
        completionHandler()
    }

    // MARK: - Accesos rápidos del icono

    /// Con la app de SwiftUI, el acceso rápido llega a la escena, no a este
    /// delegado: se le pone una propia (`EscenaParagon`). Si la app arranca
    /// desde un acceso rápido, viene aquí en `options`.
    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        if let acceso = options.shortcutItem { AppIOS.shared.abrirAviso(url: acceso.type) }
        let configuracion = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        configuracion.delegateClass = EscenaParagon.self
        return configuracion
    }

    // MARK: - RachaIOS

    /// Recordatorio local de racha a las 21:00 (funciona sin la cuenta de pago):
    /// hoy si aún no hay trofeo, o mañana si ya lo hay. Siempre uno solo.
    func programarRecordatorio(dias: Int32, hoyHecho: Bool, titulo: String, texto: String) {
        let centro = UNUserNotificationCenter.current()
        let id = "paragon-racha"
        centro.removePendingNotificationRequests(withIdentifiers: [id])
        guard dias > 0 else { return }

        let calendario = Calendar.current
        let ahora = Date()
        var dia = ahora
        if hoyHecho {
            guard let manana = calendario.date(byAdding: .day, value: 1, to: ahora) else { return }
            dia = manana
        } else if calendario.component(.hour, from: ahora) >= 21 {
            // Ya es tarde para avisar hoy, y mañana la racha ya se habría roto.
            return
        }
        var componentes = calendario.dateComponents([.year, .month, .day], from: dia)
        componentes.hour = 21
        componentes.minute = 0

        let contenido = UNMutableNotificationContent()
        contenido.title = titulo
        // Con el trofeo de hoy ya contado, mañana la racha sigue siendo de `dias`.
        contenido.body = texto
        contenido.sound = .default
        contenido.userInfo = ["url": "/ritmo"]
        let disparo = UNCalendarNotificationTrigger(dateMatching: componentes, repeats: false)
        centro.add(UNNotificationRequest(identifier: id, content: contenido, trigger: disparo))
    }

    // MARK: - BusquedaIOS

    /// Spotlight: tus juegos se buscan desde el sistema y abren su ficha
    /// (el `uniqueIdentifier` es el id del juego; ver iOSApp.swift).
    func indexar(ids: [String], titulos: [String], detalles: [String]) {
        let elementos = ids.indices.map { i -> CSSearchableItem in
            let atributos = CSSearchableItemAttributeSet(contentType: .content)
            atributos.title = titulos[i]
            atributos.contentDescription = detalles[i]
            return CSSearchableItem(uniqueIdentifier: ids[i], domainIdentifier: "juegos", attributeSet: atributos)
        }
        let indice = CSSearchableIndex.default()
        indice.deleteSearchableItems(withDomainIdentifiers: ["juegos"]) { _ in
            indice.indexSearchableItems(elementos)
        }
    }

    // MARK: - WidgetIOS

    func recargar() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}

/// Escena con los accesos rápidos del icono cuando la app ya estaba abierta.
final class EscenaParagon: NSObject, UIWindowSceneDelegate {
    func windowScene(
        _ windowScene: UIWindowScene,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        AppIOS.shared.abrirAviso(url: shortcutItem.type)
        completionHandler(true)
    }
}
