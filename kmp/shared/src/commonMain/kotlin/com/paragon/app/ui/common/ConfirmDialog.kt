package com.paragon.app.ui.common

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Danger
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

/**
 * "¿Seguro?" antes de una acción destructiva (borrar, quitar, salir,
 * desvincular...) — antes cualquiera de estas se disparaba con un solo
 * toque, sin nada de por medio. Un solo componente reutilizado en vez de
 * repetir el mismo AlertDialog de confirmación en cada pantalla.
 */
@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmLabel: String = Textos.t(T.comun_si_continuar),
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(title, color = Foreground, fontWeight = FontWeight.Bold) },
        text = { Text(message, color = Muted, fontSize = 13.sp) },
        confirmButton = {
            TextButton(onClick = { onDismiss(); onConfirm() }) {
                Text(confirmLabel, color = Danger, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(Textos.t(T.comun_cancelar), color = Muted) }
        },
    )
}
