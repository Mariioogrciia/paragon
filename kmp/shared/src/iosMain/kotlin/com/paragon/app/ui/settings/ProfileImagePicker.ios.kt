package com.paragon.app.ui.settings

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.Foundation.NSData
import platform.PhotosUI.PHPickerConfiguration
import platform.PhotosUI.PHPickerFilter
import platform.PhotosUI.PHPickerResult
import platform.PhotosUI.PHPickerViewController
import platform.PhotosUI.PHPickerViewControllerDelegateProtocol
import platform.UIKit.UIApplication
import platform.UIKit.UIImage
import platform.UIKit.UIImageJPEGRepresentation
import platform.darwin.NSObject
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue
import platform.posix.memcpy

/**
 * El selector de fotos de iOS (PHPicker: no pide permiso de acceso a toda la
 * fototeca). La foto se manda siempre en JPEG: las del iPhone suelen ser
 * HEIC, que el servidor no acepta (lib/uploads.ts).
 */
@Composable
actual fun ProfileImagePicker(
    onImagePicked: (bytes: ByteArray, mimeType: String, extension: String) -> Unit,
    content: @Composable (onClick: () -> Unit) -> Unit,
) {
    // El delegado de PHPicker es una referencia débil: hay que guardarlo aquí.
    val delegado = remember { DelegadoFoto() }
    delegado.alElegir = onImagePicked
    content {
        val config = PHPickerConfiguration().apply {
            filter = PHPickerFilter.imagesFilter
            selectionLimit = 1
        }
        val picker = PHPickerViewController(configuration = config)
        picker.delegate = delegado
        val raiz = UIApplication.sharedApplication.keyWindow?.rootViewController ?: return@content
        (raiz.presentedViewController ?: raiz).presentViewController(picker, animated = true, completion = null)
    }
}

private class DelegadoFoto : NSObject(), PHPickerViewControllerDelegateProtocol {
    var alElegir: (ByteArray, String, String) -> Unit = { _, _, _ -> }

    @OptIn(ExperimentalForeignApi::class)
    override fun picker(picker: PHPickerViewController, didFinishPicking: List<*>) {
        picker.dismissViewControllerAnimated(true, completion = null)
        val resultado = didFinishPicking.firstOrNull() as? PHPickerResult ?: return
        resultado.itemProvider.loadDataRepresentationForTypeIdentifier("public.image") { datos, _ ->
            val imagen = datos?.let { UIImage.imageWithData(it) } ?: return@loadDataRepresentationForTypeIdentifier
            val jpeg = UIImageJPEGRepresentation(imagen, 0.85) ?: return@loadDataRepresentationForTypeIdentifier
            val bytes = jpeg.aBytes()
            dispatch_async(dispatch_get_main_queue()) { alElegir(bytes, "image/jpeg", "jpg") }
        }
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun NSData.aBytes(): ByteArray {
    val bytes = ByteArray(length.toInt())
    if (bytes.isNotEmpty()) bytes.usePinned { memcpy(it.addressOf(0), this.bytes, length) }
    return bytes
}
