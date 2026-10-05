package com.paragon.app.data

import android.content.Context
import android.content.Intent
import com.paragon.shared.ContextoPlataforma

actual fun notifyWidgetUpdate(context: ContextoPlataforma?) {
    val ctx = context as? Context ?: return
    val intent = Intent(ctx, Class.forName("com.paragon.app.widget.PinnedGameWidgetReceiver")).apply {
        action = "com.paragon.app.ACTION_UPDATE_WIDGET"
    }
    ctx.sendBroadcast(intent)
}
