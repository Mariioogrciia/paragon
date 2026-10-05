package com.paragon.app.util

import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.paragon.shared.ContextoPlataforma

// El lector de códigos de Google Play: su propia pantalla de cámara, sin
// pedir permiso de cámara a la app (lo hace Play Services).
actual fun escanearQr(contexto: ContextoPlataforma, alLeer: (String) -> Unit) {
    val opciones = GmsBarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
        .build()
    GmsBarcodeScanning.getClient(contexto, opciones)
        .startScan()
        .addOnSuccessListener { codigo -> codigo.rawValue?.let(alLeer) }
}
