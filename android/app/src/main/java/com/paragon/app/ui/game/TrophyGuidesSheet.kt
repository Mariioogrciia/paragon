package com.paragon.app.ui.game

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.TrophyGuideRow
import com.paragon.app.data.TrophyGuidesRepository
import com.paragon.app.data.TrophyGuidesResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.common.ConfirmDialog
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

private val FECHA_ISO_GUIDES = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
    timeZone = java.util.TimeZone.getTimeZone("UTC")
}
private val FECHA_CORTA_GUIDES = java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale("es", "ES"))

private fun fechaCortaGuia(iso: String): String =
    try { FECHA_CORTA_GUIDES.format(FECHA_ISO_GUIDES.parse(iso)!!) } catch (e: Exception) { "" }

private const val MAX_BODY = 4000

/**
 * Guías escritas de un trofeo: apuntes reales de la comunidad (no el vídeo
 * de YouTube, ver `abrirGuiaEnYoutube` en GameDetailScreen.kt) — una fila
 * por (usuario, juego, trofeo), publicar de nuevo actualiza la tuya, nunca
 * duplica. Mismo dato y mismas reglas que la pestaña "Guía escrita" de
 * TrophyGuideModal.tsx en la web.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrophyGuidesSheet(
    gameId: String,
    trophyId: String,
    trophyName: String,
    tokenStore: TokenStore,
    onDismiss: () -> Unit,
) {
    val repository = remember(tokenStore) { TrophyGuidesRepository(tokenStore) }
    var result by remember { mutableStateOf<TrophyGuidesResult?>(null) }
    val refreshKey = remember { mutableIntStateOf(0) }
    var editando by remember { mutableStateOf(false) }
    var texto by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    LaunchedEffect(refreshKey.value) {
        result = repository.getGuides(gameId, trophyId)
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = Surface) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp)) {
            Text(text = "Guías escritas", color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(text = trophyName, color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp, bottom = 16.dp))

            when (val current = result) {
                null -> Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is TrophyGuidesResult.Error -> Text(text = current.message, color = Muted, fontSize = 14.sp)
                is TrophyGuidesResult.Ok -> {
                    val mia = current.guides.firstOrNull { it.authorId == current.currentUserId }
                    val deOtros = current.guides.filter { it.id != mia?.id }

                    if (current.guides.isEmpty()) {
                        Text(text = "Todavía no hay ninguna guía escrita para este trofeo.", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 12.dp))
                    }

                    if (mia != null && !editando) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(AccentSoft, RoundedCornerShape(14.dp))
                                .border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
                                .padding(14.dp),
                        ) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = "TU GUÍA", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                                Row {
                                    TextButton(onClick = { texto = mia.body; editando = true }) {
                                        Text("Editar", color = Muted, fontSize = 12.sp)
                                    }
                                    TextButton(onClick = { confirmDelete = true }) {
                                        Text("Borrar", color = Danger, fontSize = 12.sp)
                                    }
                                }
                            }
                            Text(text = mia.body, color = Foreground, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                        Spacer(Modifier.height(16.dp))
                    } else if (editando || mia == null) {
                        OutlinedTextField(
                            value = texto,
                            onValueChange = { if (it.length <= MAX_BODY) texto = it },
                            placeholder = { Text("Apunta cómo se consigue, rutas, códigos...", color = Muted, fontSize = 13.sp) },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 100.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Accent,
                                unfocusedBorderColor = Border,
                                focusedTextColor = Foreground,
                                unfocusedTextColor = Foreground,
                            ),
                        )
                        if (error != null) {
                            Text(text = error!!, color = Danger, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
                        }
                        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            TextButton(
                                onClick = {
                                    scope.launch {
                                        val err = repository.saveGuide(gameId, trophyId, texto)
                                        if (err == null) {
                                            editando = false
                                            error = null
                                            refreshKey.value += 1
                                        } else {
                                            error = err
                                        }
                                    }
                                },
                            ) {
                                Text(if (mia != null) "Guardar cambios" else "Publicar", color = Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            if (editando) {
                                TextButton(onClick = { editando = false; error = null }) {
                                    Text("Cancelar", color = Muted, fontSize = 13.sp)
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                    }

                    if (deOtros.isNotEmpty()) {
                        HorizontalDivider(color = Border)
                        Spacer(Modifier.height(12.dp))
                        deOtros.forEach { guide ->
                            TrophyGuideRowItem(guide)
                            Spacer(Modifier.height(10.dp))
                        }
                    }
                }
            }
        }
    }

    if (confirmDelete) {
        ConfirmDialog(
            title = "¿Borrar tu guía?",
            message = "Desaparece para todo el mundo que la vea, no solo para ti.",
            confirmLabel = "Sí, borrar",
            onConfirm = {
                confirmDelete = false
                scope.launch {
                    if (repository.deleteGuide(gameId, trophyId)) refreshKey.value += 1
                }
            },
            onDismiss = { confirmDelete = false },
        )
    }
}

@Composable
private fun TrophyGuideRowItem(guide: TrophyGuideRow) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(12.dp))
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(22.dp).clip(CircleShape).background(Surface), contentAlignment = Alignment.Center) {
                if (guide.authorImage != null) {
                    AsyncImage(model = guide.authorImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(CircleShape))
                } else {
                    Text((guide.authorName ?: guide.authorHandle ?: "?").take(1).uppercase(), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(8.dp))
            Text(text = guide.authorName ?: guide.authorHandle ?: "Alguien", color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.width(6.dp))
            Text(text = fechaCortaGuia(guide.updatedAt), color = Muted, fontSize = 11.sp)
        }
        Text(text = guide.body, color = Foreground.copy(alpha = 0.9f), fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
    }
}
