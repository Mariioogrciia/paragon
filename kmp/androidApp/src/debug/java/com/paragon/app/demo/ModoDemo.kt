package com.paragon.app.demo

import android.content.Context
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiAndroid
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import java.io.File

/**
 * MODO DEMO — solo en la compilación de depuración (src/debug, nunca entra
 * en la APK de producción). Sirve para revisar todas las pantallas con
 * sesión en un emulador sin una cuenta real: las llamadas a /api/mobile se
 * contestan aquí con datos de ejemplo (los mismos del contrato,
 * src/app/api/mobile/CONTRACT.md), sin tocar el servidor.
 *
 * Se enciende creando un archivo vacío en los datos de la app:
 *   adb shell run-as com.paragon.app touch files/modo_demo
 * y se apaga borrándolo (y "Cerrar sesión" en Ajustes).
 */
object ModoDemo {
    @JvmStatic
    fun instalar(context: Context) {
        if (!File(context.filesDir, "modo_demo").exists()) return
        val tokens = TokenStore(context)
        if (tokens.token == null) tokens.token = "demo"
        ApiAndroid.interceptorDemo = Interceptor { chain ->
            val req = chain.request()
            val ruta = req.url.encodedPath.removePrefix("/")
            val cuerpo = DatosDemo.respuesta(req.method, ruta)
            Response.Builder()
                .request(req)
                .protocol(Protocol.HTTP_1_1)
                .code(if (cuerpo == null) 404 else 200)
                .message(if (cuerpo == null) "Not Found" else "OK")
                // Ktor (a diferencia de Retrofit) decide cómo leer el cuerpo por esta cabecera.
                .header("Content-Type", "application/json")
                .body((cuerpo ?: """{"error":"Sin datos de demo para $ruta"}""").toResponseBody("application/json".toMediaType()))
                .build()
        }
    }
}
