package com.paragon.app.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import coil3.BitmapImage
import coil3.imageLoader
import coil3.request.ImageRequest
import coil3.request.SuccessResult
import coil3.request.allowHardware
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
        // Con la app en primer plano (el único caso en que este método
        // llega a ejecutarse — en segundo plano el sistema pinta la
        // notificación él solo antes de que el proceso despierte), Firebase
        // NO descarga la imagen sola: hay que hacerlo a mano para que la
        // notificación sea "rica" de verdad (idea #23 del brainstorm de
        // v1.0) también en ese caso, no solo en segundo plano.
        val imageUrl = message.notification?.imageUrl?.toString()

        CoroutineScope(Dispatchers.IO).launch {
            mostrarNotificacion(title, body, url, imageUrl)
        }
    }

    /**
     * `allowHardware(false)` es el mismo ajuste ya verificado en
     * `FriendProfileBottomSheet.kt` — sin él, coil3 devuelve un bitmap
     * "hardware" cuyos píxeles no se pueden copiar a un `Notification`
     * normal (`BigPictureStyle` los necesita de verdad, no solo dibujarlos).
     */
    private suspend fun cargarCaratula(url: String): Bitmap? {
        return try {
            val request = ImageRequest.Builder(applicationContext)
                .data(url)
                .allowHardware(false)
                .build()
            val result = applicationContext.imageLoader.execute(request)
            (result as? SuccessResult)?.image?.let { if (it is BitmapImage) it.bitmap else null }
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun mostrarNotificacion(title: String, body: String, url: String?, imageUrl: String?) {
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

        val caratula = imageUrl?.let { cargarCaratula(it) }

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_paragon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)

        if (caratula != null) {
            // BigPictureStyle: la notificación expandida muestra la
            // carátula grande; al contraerse, vuelve a mostrarla como icono
            // pequeño en vez de dejarlo vacío (mismo comportamiento nativo
            // de Gmail/WhatsApp con fotos adjuntas).
            builder
                .setLargeIcon(caratula)
                .setStyle(NotificationCompat.BigPictureStyle().bigPicture(caratula))
        }

        val notification = builder.build()

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
