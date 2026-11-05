package com.paragon.app.data

import android.content.Context
import android.content.Intent
import com.paragon.shared.ContextoPlataforma

actual fun notifyWidgetUpdate(context: ContextoPlataforma?) {
    val ctx = context as? Context ?: return
    // Los dos widgets de la app (juego anclado y racha, 5 nov 2026).
    for (receptor in listOf("com.paragon.app.widget.PinnedGameWidgetReceiver", "com.paragon.app.widget.RachaWidgetReceiver")) {
        val intent = Intent(ctx, Class.forName(receptor)).apply {
            action = "com.paragon.app.ACTION_UPDATE_WIDGET"
        }
        ctx.sendBroadcast(intent)
    }
}
