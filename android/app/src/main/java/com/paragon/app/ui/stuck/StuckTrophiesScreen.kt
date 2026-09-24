package com.paragon.app.ui.stuck

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GameDetailRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.ParagonDatabase
import com.paragon.app.data.local.StuckTrophyEntity
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StuckTrophiesScreen(tokenStore: TokenStore, onBack: () -> Unit) {
    val context = LocalContext.current
    val db = remember { ParagonDatabase.getDatabase(context) }
    val dao = remember { db.stuckTrophyDao() }
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
            TopAppBar(
                title = { Text("Trofeos Atascados", fontWeight = FontWeight.Bold, color = Foreground) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Foreground)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Background)
            )
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
                    title = "No tienes ningún trofeo atascado",
                    description = "Cuando un trofeo se te resista, márcalo desde su ficha y aparecerá aquí — con una guía en vídeo a un toque.",
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
fun StuckTrophyCard(trophy: StuckTrophyEntity, tokenStore: TokenStore, onRemove: () -> Unit) {
    val context = LocalContext.current
    val repository = remember(tokenStore) { GameDetailRepository(tokenStore) }
    val coroutineScope = rememberCoroutineScope()
    var buscandoGuia by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = trophy.coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(8.dp))
        )
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = trophy.gameTitle, color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
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
                            Uri.parse("https://www.youtube.com/watch?v=$videoId")
                        } else {
                            val query = Uri.encode("${trophy.gameTitle} ${trophy.trophyName} trophy guide")
                            Uri.parse("https://www.youtube.com/results?search_query=$query")
                        }
                        val appIntent = Intent(Intent.ACTION_VIEW, uri).apply { setPackage("com.google.android.youtube") }
                        try {
                            context.startActivity(appIntent)
                        } catch (e: android.content.ActivityNotFoundException) {
                            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                        }
                    }
                },
                modifier = Modifier.size(32.dp)
            ) {
                if (buscandoGuia) {
                    CircularProgressIndicator(color = Accent, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                } else {
                    Icon(Icons.Default.Search, contentDescription = "Buscar Guía", tint = Accent, modifier = Modifier.size(20.dp))
                }
            }
            IconButton(
                onClick = onRemove,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = Muted, modifier = Modifier.size(20.dp))
            }
        }
    }
}
