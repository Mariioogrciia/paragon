package com.paragon.app.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.paragon.app.ComposeMainActivity
import com.paragon.app.R
import com.paragon.app.data.PushRepository
import com.paragon.app.data.auth.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Recibe los avisos de Firebase Cloud Messaging (solicitud de amistad,
 * trofeo nuevo, platino conseguido — ver `enviarPushFcm` en lib/fcm.ts del
 * proyecto Next.js) y los pinta como notificación real del sistema. Sin
 * `google-services.json` este servicio nunca se registra de verdad
 * (Firebase no arranca), así que no hace falta comprobar nada aquí — si el
 * método se llama, es porque ya llegó un mensaje real.
 */
class ParagonFirebaseMessagingService : FirebaseMessagingService() {

    /** Firebase reasigna el token de vez en cuando (no solo en el primer arranque) — hay que volver a mandarlo siempre que cambie. */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val tokenStore = TokenStore(applicationContext)
        if (tokenStore.token == null) return // Sin sesión todavía: no hay a quién asociar este token.

        CoroutineScope(Dispatchers.IO).launch {
            PushRepository(tokenStore).registerToken(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: return
        val body = message.notification?.body ?: ""
        val url = message.data["url"]

        mostrarNotificacion(title, body, url)
    }

    private fun mostrarNotificacion(title: String, body: String, url: String?) {
        val channelId = "paragon_avisos"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Avisos de Paragon", NotificationManager.IMPORTANCE_DEFAULT)
            notificationManager.createNotificationChannel(channel)
        }

        // Abre la app directamente en la pantalla relevante (p.ej. "/amigos")
        // vía el mismo esquema `paragon://` que ya usa el login — MainScreen
        // no tiene todavía un router de deep links por ruta web, así que de
        // momento esto abre la app en el Panel; `url` queda listo para
        // cuando lo tenga.
        val intent = Intent(this, ComposeMainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (url != null) data = Uri.parse("paragon://open?path=$url")
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_paragon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        // `POST_NOTIFICATIONS` se pide en ComposeMainActivity — si el usuario
        // lo ha denegado, `notify()` simplemente no hace nada (SecurityException
        // capturada por el propio NotificationManagerCompat en API 33+).
        try {
            NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
        } catch (e: SecurityException) {
            // Permiso de notificaciones denegado — nada que hacer.
        }
    }
}
