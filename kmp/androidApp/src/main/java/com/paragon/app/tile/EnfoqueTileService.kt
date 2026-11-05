package com.paragon.app.tile

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import com.paragon.app.ComposeMainActivity

/**
 * Tile de Ajustes rápidos «Paragon · Enfoque» (5 nov 2026): un toque desde la
 * cortina abre la app en Modo Enfoque, con el juego que estás cazando. Va
 * por `paragon://open?path=/enfoque`, el mismo camino que un aviso o un
 * acceso directo del icono (ComposeMainActivity.handleDeepLink).
 */
class EnfoqueTileService : TileService() {
    override fun onStartListening() {
        super.onStartListening()
        qsTile?.apply {
            state = Tile.STATE_INACTIVE
            updateTile()
        }
    }

    @SuppressLint("StartActivityAndCollapseDeprecated")
    override fun onClick() {
        super.onClick()
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("paragon://open?path=/enfoque"), this, ComposeMainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ solo acepta un PendingIntent aquí.
            val pendiente = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            startActivityAndCollapse(pendiente)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
