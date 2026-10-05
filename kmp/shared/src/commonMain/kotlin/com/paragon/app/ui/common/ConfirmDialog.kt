package com.paragon.app.ui.common

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Danger
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.app.ui.theme.textoSobre
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * "¿Seguro?" antes de una acción destructiva (borrar, quitar, salir,
 * desvincular...). Desde el diseño v2 (5 oct 2026) es una hoja que sube desde
 * abajo con dos botones grandes, como las hojas de acción de iPhone, en vez
 * de un diálogo en el centro: queda a mano del pulgar y se siente de app.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmLabel: String = Textos.t(T.comun_si_continuar),
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Surface,
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 12.dp).navigationBarsPadding()) {
            Text(title, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(message, color = Muted, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 8.dp))
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onDismiss()
                    onConfirm()
                },
                colors = ButtonDefaults.buttonColors(containerColor = Danger, contentColor = textoSobre(Danger)),
                shape = RoundedCornerShape(radio(16)),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                Text(confirmLabel, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = Surface2, contentColor = Foreground),
                shape = RoundedCornerShape(radio(16)),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                Text(Textos.t(T.comun_cancelar), fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
