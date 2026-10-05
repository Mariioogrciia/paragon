package com.paragon.app.util

import androidx.compose.ui.graphics.ImageBitmap
import com.paragon.shared.ContextoPlataforma

/**
 * Comparte una imagen ya renderizada (la tarjeta de Platino, ver
 * `TrophyShareCard.kt`) con el selector del sistema: en Android, cualquier
 * app que acepte `image/png` (incluida la cámara de Stories de Instagram);
 * en iOS, la hoja de compartir (también "Guardar imagen" en Fotos).
 */
expect fun compartirImagen(contexto: ContextoPlataforma, imagen: ImageBitmap, nombreArchivo: String = "paragon_platino.png")
