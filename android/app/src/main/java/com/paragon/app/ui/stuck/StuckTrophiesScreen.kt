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
import com.paragon.app.data.local.ParagonDatabase
import com.paragon.app.data.local.StuckTrophyEntity
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StuckTrophiesScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val db = remember { ParagonDatabase.getDatabase(context) }
    val dao = remember { db.stuckTrophyDao() }
    var trophies by remember { mutableStateOf<List<StuckTrophyEntity>>(emptyList()) }
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
        if (trophies.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(innerPadding), contentAlignment = Alignment.Center) {
                Text("No tienes ningún trofeo atascado.", color = Muted, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(innerPadding).padding(horizontal = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 32.dp, top = 16.dp)
            ) {
                items(trophies, key = { it.trophyId }) { trophy ->
                    StuckTrophyCard(
                        trophy = trophy,
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

@Composable
fun StuckTrophyCard(trophy: StuckTrophyEntity, onRemove: () -> Unit) {
    val context = LocalContext.current
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
                onClick = {
                    val query = Uri.encode("${trophy.gameTitle} ${trophy.trophyName} trophy guide")
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=$query"))
                    context.startActivity(intent)
                },
                modifier = Modifier.size(32.dp)
            ) {
                Icon(Icons.Default.Search, contentDescription = "Buscar Guía", tint = Accent, modifier = Modifier.size(20.dp))
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
