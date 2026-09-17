package com.paragon.app.ui.share

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GameSearchResult
import com.paragon.app.data.WishlistRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * "Añadir a Paragon" desde el Sharesheet de Android (idea #4 de Antigravity):
 * compartir un enlace/título desde Chrome, YouTube... y elegir Paragon en el
 * menú de compartir abre esto encima, sin pasar por el resto de la app.
 * `initialQuery` sale del `EXTRA_SUBJECT`/`EXTRA_TEXT` del Intent recibido
 * (ver ShareReceiverActivity) — una aproximación, no una búsqueda exacta:
 * el usuario elige de los resultados reales de IGDB, nunca se añade nada
 * a ciegas solo con el texto compartido.
 */
@Composable
fun ShareAddScreen(tokenStore: TokenStore, initialQuery: String, onClose: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
        contentAlignment = Alignment.Center,
    ) {
        if (tokenStore.token == null) {
            NoSessionCard(onClose)
        } else {
            ShareAddCard(tokenStore, initialQuery, onClose)
        }
    }
}

@Composable
private fun NoSessionCard(onClose: () -> Unit) {
    Column(
        modifier = Modifier
            .padding(32.dp)
            .background(Surface, RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Inicia sesión en Paragon primero", color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text("Abre la app y entra con tu cuenta antes de añadir juegos desde aquí.", color = Muted, fontSize = 13.sp)
        Spacer(Modifier.height(16.dp))
        TextButton(onClick = onClose) { Text("Cerrar", color = Accent) }
    }
}

@Composable
private fun ShareAddCard(tokenStore: TokenStore, initialQuery: String, onClose: () -> Unit) {
    val repository = remember(tokenStore) { WishlistRepository(tokenStore) }
    var query by remember { mutableStateOf(initialQuery) }
    var results by remember { mutableStateOf<List<GameSearchResult>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    var addedTitle by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(query) {
        if (query.isBlank()) {
            results = emptyList()
            return@LaunchedEffect
        }
        delay(400)
        isSearching = true
        results = repository.search(query)
        isSearching = false
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
            .background(Surface, RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .padding(20.dp),
    ) {
        Text("Añadir a Deseados", color = Foreground, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text("Elige el juego correcto de los resultados.", color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(16.dp))

        if (addedTitle != null) {
            Text(text = "$addedTitle añadido a tu lista de deseados", color = Good, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(16.dp))
            Button(onClick = onClose, colors = ButtonDefaults.buttonColors(containerColor = Accent), modifier = Modifier.fillMaxWidth()) {
                Text("Cerrar")
            }
        } else {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Título del juego…") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground,
                ),
            )
            Spacer(Modifier.height(12.dp))

            when {
                isSearching -> Box(Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent, modifier = Modifier.size(28.dp))
                }
                query.isBlank() -> Text("Escribe el título para buscar en el catálogo.", color = Muted, fontSize = 13.sp)
                results.isEmpty() -> Text("Sin resultados.", color = Muted, fontSize = 13.sp)
                else -> LazyColumn(modifier = Modifier.heightIn(max = 320.dp)) {
                    items(results, key = { it.igdbId }) { result ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    scope.launch {
                                        if (repository.addToWishlist(result)) addedTitle = result.title
                                    }
                                }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (!result.coverUrl.isNullOrBlank()) {
                                AsyncImage(
                                    model = result.coverUrl,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)),
                                )
                            } else {
                                Box(modifier = Modifier.size(44.dp).background(AccentSoft, RoundedCornerShape(8.dp)))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(result.title, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                if (!result.developer.isNullOrBlank()) {
                                    Text(result.developer, color = Muted, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onClose) { Text("Cancelar", color = Muted) }
        }
    }
}
