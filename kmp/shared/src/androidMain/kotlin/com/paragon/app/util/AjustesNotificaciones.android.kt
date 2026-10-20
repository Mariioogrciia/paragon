package com.paragon.app.util

import android.content.Intent
import android.provider.Settings
import com.paragon.shared.ContextoPlataforma

actual fun abrirAjustesNotificaciones(contexto: ContextoPlataforma) {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, contexto.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { contexto.startActivity(intent) }
}
