package com.paragon.app.data

/**
 * Recordatorio local de racha (5 nov 2026): cada vez que llega el panel, la
 * plataforma puede programar un aviso para esta noche si llevas racha y hoy
 * todavía no has sacado ningún trofeo («No pierdas tu racha de 5 días»).
 *
 * En iOS lo pone AppIOS (iosMain) con UNUserNotificationCenter: funciona con
 * la firma gratuita, a diferencia de las push. Android no lo usa: ya tiene
 * push de verdad por FCM.
 */
object RecordatorioRacha {
    /** `dias`: racha actual. `hoyHecho`: hoy ya hay algún trofeo. */
    var alCargarPanel: ((dias: Int, hoyHecho: Boolean) -> Unit)? = null
}
