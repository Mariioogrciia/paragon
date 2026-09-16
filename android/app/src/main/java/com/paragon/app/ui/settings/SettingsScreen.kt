package com.paragon.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.SettingsResult
import com.paragon.app.data.UserProfile
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    profile: UserProfile,
    repository: SettingsRepository,
    onBack: () -> Unit,
    onNavigateToLinkedAccounts: () -> Unit,
    onLogout: () -> Unit
) {
    var nameInput by remember { mutableStateOf(profile.name) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = Background,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp)
                    .windowInsetsPadding(WindowInsets.statusBars),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Foreground)
                }
                Text(
                    text = "Ajustes",
                    color = Foreground,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 16.dp)
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp)
        ) {
            Text("PERFIL", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = nameInput,
                onValueChange = { nameInput = it },
                label = { Text("Nombre de usuario") },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                    focusedLabelColor = Accent,
                    unfocusedLabelColor = Muted,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground
                ),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    scope.launch {
                        isLoading = true
                        errorMessage = null
                        successMessage = null
                        val result = repository.updateProfile(nameInput, null) // Image no editable en app nativa por ahora (o placeholder)
                        when (result) {
                            is SettingsResult.Ok -> successMessage = "Perfil actualizado"
                            is SettingsResult.Error -> errorMessage = result.message
                        }
                        isLoading = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                enabled = !isLoading && nameInput.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = Background, modifier = Modifier.size(24.dp))
                } else {
                    Text("Guardar cambios", fontWeight = FontWeight.Bold)
                }
            }

            if (errorMessage != null) {
                Text(text = errorMessage!!, color = Danger, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            }
            if (successMessage != null) {
                Text(text = successMessage!!, color = Good, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text("CONEXIONES", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = onNavigateToLinkedAccounts,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Cuentas Vinculadas", color = Foreground)
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 32.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                border = androidx.compose.foundation.BorderStroke(1.dp, Danger)
            ) {
                Text("Cerrar Sesión", color = Danger, fontWeight = FontWeight.Bold)
            }
        }
    }
}
