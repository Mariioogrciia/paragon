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

// Mismos valores de DarkAccent/DarkMuted/DarkGold de ui/theme/Color.kt — un
// widget de Glance no puede leer `isDarkTheme` (vive fuera de la jerarquía
// de Compose de la app, en su propio proceso de RemoteViews), así que se
// fija en oscuro siempre, coherente con el tema por defecto de la app.
private val WidgetBackground = Color(0xFF0C0C0C)
private val WidgetAccent = Color(0xFFB026FF)
private val WidgetMuted = Color(0xFFA0A0A0)

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
                        text = "Objetivo: ${pinnedGame.title}",
                        style = TextStyle(color = ColorProvider(WidgetAccent)),
                        maxLines = 2,
                    )
                    Spacer(modifier = GlanceModifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = pinnedGame.progressPercent / 100f,
                        modifier = GlanceModifier.fillMaxWidth(),
                        color = ColorProvider(WidgetAccent),
                        backgroundColor = ColorProvider(Color(0xFF262626)),
                    )
                    Spacer(modifier = GlanceModifier.height(6.dp))
                    Text(
                        text = "${pinnedGame.earnedTotal}/${pinnedGame.definedTotal} trofeos · ${pinnedGame.progressPercent}%",
                        style = TextStyle(color = ColorProvider(WidgetMuted)),
                    )
                } else {
                    Text(
                        text = "Sin objetivo anclado",
                        style = TextStyle(color = ColorProvider(WidgetAccent))
                    )
                    Text(
                        text = "Fija un juego desde la ficha de juego",
                        style = TextStyle(color = ColorProvider(WidgetMuted))
                    )
                }
            }
        }
    }
}
