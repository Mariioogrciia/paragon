package com.paragon.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.paragon.app.ComposeMainActivity
import com.paragon.app.R
import com.paragon.app.util.Textos
import kotlinx.coroutines.launch
import androidx.glance.color.ColorProvider as DayNightColorProvider

private val Fondo = DayNightColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFF0C0C0C))
private val Fuego = DayNightColorProvider(day = Color(0xFFD9480F), night = Color(0xFFFF8A3D))
private val Tenue = DayNightColorProvider(day = Color(0xFF5B6472), night = Color(0xFFA0A0A0))

/**
 * Widget de racha (5 nov 2026): los días seguidos con trofeo y la mejor
 * racha, de la caché del panel (la misma que refresca PanelSyncWorker cada
 * 3 h). Tocarlo abre «Tu ritmo».
 */
class RachaWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val panel = com.paragon.app.data.local.ParagonDatabase.getDatabase(context).panelDao().getCached()
        val abrir = Intent(Intent.ACTION_VIEW, Uri.parse("paragon://open?path=/ritmo"), context, ComposeMainActivity::class.java)

        provideContent {
            Column(
                modifier = GlanceModifier.fillMaxSize().background(Fondo).padding(14.dp).clickable(actionStartActivity(abrir)),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val actual = panel?.rachaActual ?: 0
                if (actual > 0) {
                    Text(
                        text = Textos.t(R.string.widget_racha_dias, actual),
                        style = TextStyle(color = Fuego, fontSize = 22.sp, fontWeight = FontWeight.Bold),
                        maxLines = 1,
                    )
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Text(text = Textos.t(R.string.widget_racha_mejor, panel?.rachaMejor ?: actual), style = TextStyle(color = Tenue), maxLines = 1)
                } else {
                    Text(text = Textos.t(R.string.widget_racha_cero), style = TextStyle(color = Fuego, fontWeight = FontWeight.Bold), maxLines = 2)
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Text(text = Textos.t(R.string.widget_racha_cero_sub), style = TextStyle(color = Tenue), maxLines = 2)
                }
            }
        }
    }
}

class RachaWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = RachaWidget()

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.paragon.app.ACTION_UPDATE_WIDGET") {
            kotlinx.coroutines.GlobalScope.launch { RachaWidget().updateAll(context) }
        }
    }
}
