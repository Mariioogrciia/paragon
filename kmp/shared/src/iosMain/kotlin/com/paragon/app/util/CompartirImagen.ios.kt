package com.paragon.app.util

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asSkiaBitmap
import com.paragon.shared.ContextoPlataforma
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import org.jetbrains.skia.EncodedImageFormat
import org.jetbrains.skia.Image
import platform.Foundation.NSData
import platform.Foundation.create
import platform.UIKit.UIActivityViewController
import platform.UIKit.UIApplication
import platform.UIKit.UIImage

// La hoja de compartir de iOS con la imagen en PNG (ahí está también "Guardar imagen").
@OptIn(ExperimentalForeignApi::class)
actual fun compartirImagen(contexto: ContextoPlataforma, imagen: ImageBitmap, nombreArchivo: String) {
    val png = Image.makeFromBitmap(imagen.asSkiaBitmap()).encodeToData(EncodedImageFormat.PNG)?.bytes ?: return
    val datos = png.usePinned { NSData.create(bytes = it.addressOf(0), length = png.size.toULong()) }
    val uiImage = UIImage.imageWithData(datos) ?: return
    val hoja = UIActivityViewController(activityItems = listOf(uiImage), applicationActivities = null)
    val raiz = UIApplication.sharedApplication.keyWindow?.rootViewController ?: return
    // Si ya hay algo presentado (p. ej. una hoja), se presenta encima.
    (raiz.presentedViewController ?: raiz).presentViewController(hoja, animated = true, completion = null)
}
