package com.paragon.app.ui.stuck

import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.paragon.app.ui.common.premiumClickable
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GameDetailRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.ParagonDatabase
import com.paragon.app.data.local.StuckTrophyEntity
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.app.data.local.StuckTrophyDao
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T
import io.ktor.http.encodeURLQueryComponent

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StuckTrophiesScreen(tokenStore: TokenStore, dao: StuckTrophyDao, onBack: () -> Unit, onAbrirTrofeo: (gameId: String, trophyId: String) -> Unit = { _, _ -> }) {
    // `null` = todavía no se ha leído Room (distinto de "ya se leyó y está
    // vacío") — con `emptyList()` como valor inicial, cualquiera con
    // trofeos atascados de verdad veía un parpadeo del EmptyState antes de
    // que llegara la lista real (bug real, visto en auditoría).
    var trophies by remember { mutableStateOf<List<StuckTrophyEntity>?>(null) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        trophies = dao.getAllStuckTrophies()
    }

    Scaffold(
        topBar = {
            com.paragon.app.ui.common.CabeceraNativa(titulo = Textos.t(T.nav_atascados_menu), atras = null, onBack = onBack, modifier = Modifier.padding(bottom = 8.dp))
        },
        containerColor = Background
    ) { innerPadding ->
        when (val current = trophies) {
            null -> Box(modifier = Modifier.fillMaxSize().padding(innerPadding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
            else -> if (current.isEmpty()) {
                com.paragon.app.ui.common.EmptyState(
                    icon = Icons.Default.Search,
                    title = Textos.t(T.atascados_vacio),
                    description = Textos.t(T.atascados_vacio_sub),
                    modifier = Modifier.padding(innerPadding),
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(innerPadding).padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 32.dp, top = 16.dp)
                ) {
                    items(current, key = { it.trophyId }) { trophy ->
                        StuckTrophyCard(
                            trophy = trophy,
                            tokenStore = tokenStore,
                            onClick = { onAbrirTrofeo(trophy.gameId, trophy.trophyId) },
                            onRemove = {
                                coroutineScope.launch {
                                    dao.removeStuckTrophy(trophy.trophyId)
                                    trophies = dao.getAllStuckTrophies()
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StuckTrophyCard(trophy: StuckTrophyEntity, tokenStore: TokenStore, onRemove: () -> Unit, onClick: () -> Unit = {}) {
    val uriHandler = LocalUriHandler.current
    val repository = remember(tokenStore) { GameDetailRepository(tokenStore) }
    val coroutineScope = rememberCoroutineScope()
    var buscandoGuia by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(16)))
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .clip(RoundedCornerShape(radio(16)))
            .premiumClickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = trophy.coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(radio(8)))
        )
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = trophy.gameTitle, color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(text = trophy.trophyName, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 2.dp))
            Text(text = trophy.trophyDetail, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
        }
        Column {
            IconButton(
                enabled = !buscandoGuia,
                onClick = {
                    buscandoGuia = true
                    coroutineScope.launch {
                        // Mismo vídeo cacheado que la ficha de juego (ver
                        // GameDetailScreen.kt) — antes esto abría una
                        // búsqueda genérica sin más, sin usar la guía real
                        // que la web ya encuentra y guarda.
                        val videoId = repository.getTrophyGuide(trophy.gameId, trophy.trophyId)
                        buscandoGuia = false
                        val uri = if (videoId != null) {
                            "https://www.youtube.com/watch?v=$videoId"
                        } else {
                            val query = Textos.t(T.guia_busqueda_video, listOf(trophy.gameTitle, trophy.trophyName)).replace(" ", "%20")
                            "https://www.youtube.com/results?search_query=$query"
                        }
                        uriHandler.openUri(uri)
                    }
                },
                modifier = Modifier.size(48.dp)
            ) {
                if (buscandoGuia) {
                    CircularProgressIndicator(color = Accent, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                } else {
                    Icon(Icons.Default.Search, contentDescription = Textos.t(T.ficha_buscar_guia), tint = Accent, modifier = Modifier.size(20.dp))
                }
            }
            IconButton(
                onClick = onRemove,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(Icons.Default.Delete, contentDescription = Textos.t(T.comun_eliminar), tint = Muted, modifier = Modifier.size(20.dp))
            }
        }
    }
}

