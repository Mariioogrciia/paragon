package com.paragon.app.util

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import com.paragon.shared.ContextoPlataforma

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * Comparte un bitmap ya renderizado (la tarjeta de Platino, ver
 * `TrophyShareCard.kt`) como imagen genérica vía el selector del sistema —
 * cualquier app que acepte `ACTION_SEND` con `image/png` aparece ahí,
 * incluida la cámara de Stories de Instagram. Reutiliza el `FileProvider`
 * que YA está declarado en `AndroidManifest.xml` (autoridad
 * `${applicationId}.fileprovider`, expone `context.cacheDir` entero vía
 * `file_paths.xml`), sin añadir uno nuevo.
 *
 * Escribir a un fichero real (en vez de un content provider en memoria) es
 * lo que exige `ACTION_SEND` con `EXTRA_STREAM` — no acepta bitmaps sueltos.
 */
actual fun compartirImagen(contexto: ContextoPlataforma, imagen: ImageBitmap, nombreArchivo: String) {
    val context: Context = contexto
    val bitmap = imagen.asAndroidBitmap()
    val fileName = nombreArchivo
    val cacheDir = File(context.cacheDir, "shares").apply { mkdirs() }
    val file = File(cacheDir, fileName)
    FileOutputStream(file).use { out -> bitmap.compress(Bitmap.CompressFormat.PNG, 100, out) }

    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)

    val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(sendIntent, Textos.t(T.ficha_compartir_platino)))
}
