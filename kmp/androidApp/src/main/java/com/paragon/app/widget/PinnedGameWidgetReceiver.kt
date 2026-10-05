package com.paragon.app.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.launch

class PinnedGameWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PinnedGameWidget()

    override fun onReceive(context: android.content.Context, intent: android.content.Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.paragon.app.ACTION_UPDATE_WIDGET") {
            kotlinx.coroutines.GlobalScope.launch {
                PinnedGameWidget().updateAll(context)
            }
        }
    }
}
