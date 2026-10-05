package com.paragon.app.ui.main

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.vector.ImageVector
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.common.premiumClickable

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreMenuSheet(
    onDismiss: () -> Unit,
    onNavigate: (String) -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Background,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 32.dp, top = 8.dp)
        ) {
            MoreMenuItem(
                icon = Icons.Default.BarChart,
                label = Textos.t(T.nav_estadisticas),
                onClick = { 
                    onDismiss()
                    onNavigate("stats")
                }
            )
            MoreMenuItem(
                icon = Icons.Default.Group,
                label = Textos.t(T.social_tab_amigos),
                onClick = {
                    onDismiss()
                    onNavigate("social")
                }
            )
            MoreMenuItem(
                icon = Icons.Default.Explore,
                label = "Descubrir",
                onClick = {
                    onDismiss()
                }
            )
            MoreMenuItem(
                icon = Icons.Default.CalendarMonth,
                label = "Planificador",
                onClick = {
                    onDismiss()
                }
            )
            MoreMenuItem(
                icon = Icons.Default.Settings,
                label = Textos.t(T.nav_ajustes),
                onClick = {
                    onDismiss()
                    onNavigate("settings")
                }
            )
        }
    }
}

@Composable
private fun MoreMenuItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .premiumClickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Foreground,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = label,
            color = Foreground,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
