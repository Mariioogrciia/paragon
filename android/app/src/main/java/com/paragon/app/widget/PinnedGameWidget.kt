package com.paragon.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.text.Text
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.padding
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

class PinnedGameWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val db = com.paragon.app.data.local.ParagonDatabase.getDatabase(context)
        val pinnedGame = db.libraryDao().getPinnedGame()

        provideContent {
            Column(
                modifier = androidx.glance.GlanceModifier
                    .fillMaxSize()
                    .background(Color(0xFF0C0C0C))
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (pinnedGame != null) {
                    Text(
                        text = "Objetivo: ${pinnedGame.title}",
                        style = androidx.glance.text.TextStyle(color = ColorProvider(Color(0xFFB026FF)))
                    )
                    Text(
                        text = "${pinnedGame.progressPercent}% Completado",
                        style = androidx.glance.text.TextStyle(color = ColorProvider(Color(0xFFA0A0A0)))
                    )
                    Text(
                        text = "${pinnedGame.earnedTotal} / ${pinnedGame.definedTotal} Trofeos",
                        style = androidx.glance.text.TextStyle(color = ColorProvider(Color(0xFFA0A0A0)))
                    )
                } else {
                    Text(
                        text = "Sin objetivo anclado",
                        style = androidx.glance.text.TextStyle(color = ColorProvider(Color(0xFFB026FF)))
                    )
                    Text(
                        text = "Fija un juego desde la Biblioteca",
                        style = androidx.glance.text.TextStyle(color = ColorProvider(Color(0xFFA0A0A0)))
                    )
                }
            }
        }
    }
}
