package com.paragon.app.widget

import android.content.Context
import android.content.Intent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.paragon.app.ComposeMainActivity
import com.paragon.app.R
import com.paragon.app.util.Textos
import androidx.glance.color.ColorProvider as DayNightColorProvider

// Un widget de Glance no puede leer el tema de la app (vive en el proceso del
// launcher, como RemoteViews), pero sí el modo claro/oscuro del sistema con
// ColorProvider(day, night) — antes estaba fijo en oscuro y desentonaba en
// una pantalla de inicio clara. Mismos valores que el tema Paragon de
// ui/theme/Color.kt (Light*/Dark*).
private val WidgetBackground = DayNightColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFF0C0C0C))
private val WidgetAccent = DayNightColorProvider(day = Color(0xFF1D6FE0), night = Color(0xFFB026FF))
private val WidgetMuted = DayNightColorProvider(day = Color(0xFF5B6472), night = Color(0xFFA0A0A0))
private val WidgetPista = DayNightColorProvider(day = Color(0xFFEBEDF1), night = Color(0xFF262626))

class PinnedGameWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val db = com.paragon.app.data.local.ParagonDatabase.getDatabase(context)
        val pinnedGame = db.libraryDao().getPinnedGame()

        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(WidgetBackground)
                    .padding(16.dp)
                    // Toca el widget entero para abrir la app — antes no
                    // hacía nada, era solo texto inerte (el hueco real que
                    // dejaba a medio terminar el widget de Antigravity).
                    // glance-appwidget 1.1.0 solo trae la sobrecarga de
                    // `actionStartActivity` que pide un `Intent` ya armado
                    // (ni la reified `<T>()` ni la de `Class<Activity>`
                    // resuelven en esta versión).
                    .clickable(actionStartActivity(Intent(context, ComposeMainActivity::class.java))),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (pinnedGame != null) {
                    Text(
                        text = Textos.t(R.string.widget_objetivo, pinnedGame.title),
                        style = TextStyle(color = WidgetAccent),
                        maxLines = 2,
                    )
                    Spacer(modifier = GlanceModifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = pinnedGame.progressPercent / 100f,
                        modifier = GlanceModifier.fillMaxWidth(),
                        color = WidgetAccent,
                        backgroundColor = WidgetPista,
                    )
                    Spacer(modifier = GlanceModifier.height(6.dp))
                    Text(
                        text = Textos.t(R.string.ficha_progreso, pinnedGame.earnedTotal, pinnedGame.definedTotal, pinnedGame.progressPercent),
                        style = TextStyle(color = WidgetMuted),
                    )
                } else {
                    Text(
                        text = Textos.t(R.string.widget_sin_objetivo),
                        style = TextStyle(color = WidgetAccent)
                    )
                    Text(
                        text = Textos.t(R.string.widget_sin_objetivo_sub),
                        style = TextStyle(color = WidgetMuted)
                    )
                }
            }
        }
    }
}
