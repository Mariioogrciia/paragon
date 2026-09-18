package com.paragon.app.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Muted

/**
 * Estado vacío común — mismo esqueleto en cada pantalla que puede no tener
 * nada que enseñar (Trofeos Atascados, Carpetas, Amigos, Ligas,
 * Comunidad...), en vez de que cada una inventara su propio texto suelto
 * centrado sin más contexto. Icono + título corto + explicación de una
 * línea + acción opcional — pedido explícito del documento de diseño
 * ("Necesitas diseñar un sistema común para estados vacíos").
 */
@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    description: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(icon, contentDescription = null, tint = Muted, modifier = Modifier.height(48.dp).fillMaxWidth().padding(horizontal = 120.dp))
        Spacer(Modifier.height(16.dp))
        Text(text = title, color = Muted, fontSize = 16.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(text = description, color = Muted, fontSize = 13.sp, textAlign = TextAlign.Center, lineHeight = 18.sp)
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(20.dp))
            Button(onClick = onAction, colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
                Text(actionLabel, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
            }
        }
    }
}
