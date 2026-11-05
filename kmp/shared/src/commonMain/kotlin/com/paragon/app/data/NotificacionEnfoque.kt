package com.paragon.app.data

/**
 * Notificación fija mientras juegas una sesión en Modo Enfoque (5 nov 2026):
 * «Elden Ring · 30/42 trofeos», con cronómetro, visible con la app cerrada y
 * desde la pantalla de bloqueo. Lo pone Android (ParagonApplication); iOS no
 * lo usa todavía (sería una Live Activity, que pide la cuenta de pago).
 */
object NotificacionEnfoque {
    var mostrar: ((titulo: String, ganados: Int, total: Int, inicioMillis: Long) -> Unit)? = null
    var ocultar: (() -> Unit)? = null
}
