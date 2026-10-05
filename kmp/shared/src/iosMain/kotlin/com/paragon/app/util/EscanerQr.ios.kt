package com.paragon.app.util

import com.paragon.shared.ContextoPlataforma
import kotlinx.cinterop.ExperimentalForeignApi
import platform.AVFoundation.AVCaptureConnection
import platform.AVFoundation.AVCaptureDevice
import platform.AVFoundation.AVCaptureDeviceInput
import platform.AVFoundation.AVCaptureMetadataOutput
import platform.AVFoundation.AVCaptureMetadataOutputObjectsDelegateProtocol
import platform.AVFoundation.AVCaptureOutput
import platform.AVFoundation.AVCaptureSession
import platform.AVFoundation.AVCaptureVideoPreviewLayer
import platform.AVFoundation.AVLayerVideoGravityResizeAspectFill
import platform.AVFoundation.AVMediaTypeVideo
import platform.AVFoundation.AVMetadataMachineReadableCodeObject
import platform.AVFoundation.AVMetadataObjectTypeQRCode
import platform.AVFoundation.requestAccessForMediaType
import platform.UIKit.UIApplication
import platform.UIKit.UIColor
import platform.UIKit.UIScreen
import platform.UIKit.UIViewController
import platform.darwin.DISPATCH_QUEUE_PRIORITY_DEFAULT
import platform.darwin.NSObject
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_global_queue
import platform.darwin.dispatch_get_main_queue

/** Recibe los códigos que ve la cámara; se queda con el primero. */
private class LectorQr(private val alLeer: (String) -> Unit) : NSObject(), AVCaptureMetadataOutputObjectsDelegateProtocol {
    private var leido = false

    override fun captureOutput(
        output: AVCaptureOutput,
        didOutputMetadataObjects: List<*>,
        fromConnection: AVCaptureConnection,
    ) {
        if (leido) return
        val codigo = didOutputMetadataObjects.firstOrNull() as? AVMetadataMachineReadableCodeObject ?: return
        val texto = codigo.stringValue ?: return
        leido = true
        alLeer(texto)
    }
}

// El delegado de AVFoundation es una referencia débil: hay que retenerlo aquí.
private var lectorActivo: LectorQr? = null

@OptIn(ExperimentalForeignApi::class)
actual fun escanearQr(contexto: ContextoPlataforma, alLeer: (String) -> Unit) {
    AVCaptureDevice.requestAccessForMediaType(AVMediaTypeVideo) { permitido ->
        if (permitido) dispatch_async(dispatch_get_main_queue()) { abrirCamara(alLeer) }
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun abrirCamara(alLeer: (String) -> Unit) {
    val camara = AVCaptureDevice.defaultDeviceWithMediaType(AVMediaTypeVideo) ?: return
    val entrada = AVCaptureDeviceInput.deviceInputWithDevice(camara, null) ?: return
    val sesion = AVCaptureSession()
    if (!sesion.canAddInput(entrada)) return
    sesion.addInput(entrada)
    val salida = AVCaptureMetadataOutput()
    if (!sesion.canAddOutput(salida)) return
    sesion.addOutput(salida)

    // Una hoja con la cámara a pantalla completa; se cierra deslizando hacia abajo.
    val vista = UIViewController()
    vista.view.backgroundColor = UIColor.blackColor
    val capa = AVCaptureVideoPreviewLayer(session = sesion)
    capa.videoGravity = AVLayerVideoGravityResizeAspectFill
    capa.frame = UIScreen.mainScreen.bounds
    vista.view.layer.addSublayer(capa)

    val lector = LectorQr { texto ->
        sesion.stopRunning()
        vista.dismissViewControllerAnimated(true, completion = null)
        lectorActivo = null
        alLeer(texto)
    }
    lectorActivo = lector
    salida.setMetadataObjectsDelegate(lector, queue = dispatch_get_main_queue())
    salida.metadataObjectTypes = listOf(AVMetadataObjectTypeQRCode)

    val raiz = UIApplication.sharedApplication.keyWindow?.rootViewController ?: return
    (raiz.presentedViewController ?: raiz).presentViewController(vista, animated = true, completion = null)
    // startRunning bloquea: fuera del hilo principal.
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT.toLong(), 0u)) { sesion.startRunning() }
}
