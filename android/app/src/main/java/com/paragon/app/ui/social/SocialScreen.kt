package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.AmigoRow
import com.paragon.app.data.LigaRow
import com.paragon.app.data.SocialRepository
import com.paragon.app.data.SocialResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*

/** Amigos y Liga reales contra GET /api/mobile/social (SocialRepository) — dos listas distintas, no la misma con otro orden. */
@Composable
fun SocialScreen(tokenStore: TokenStore, onCompareClick: (String) -> Unit) {
    val repository = remember(tokenStore) { SocialRepository(tokenStore) }
    var result by remember { mutableStateOf<SocialResult?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val retryCounter = remember { mutableIntStateOf(0) }
    var selectedHandle by remember { mutableStateOf<String?>(null) }
    val tabs = listOf("Ligas", "Amigos")

    LaunchedEffect(retryCounter.value) {
        result = null
        result = repository.getSocial()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
    ) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Background,
            contentColor = Accent,
            divider = { HorizontalDivider(color = Border) },
            modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(text = title, fontWeight = FontWeight.Bold) },
                    selectedContentColor = Accent,
                    unselectedContentColor = Muted
                )
            }
        }

        when (val current = result) {
            null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
            is SocialResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = current.message, color = Foreground, fontSize = 14.sp)
                    Button(
                        onClick = { retryCounter.value += 1 },
                        modifier = Modifier.padding(top = 16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    ) {
                        Text("Reintentar")
                    }
                }
            }
            is SocialResult.Ok -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp)
                ) {
                    if (selectedTab == 0) {
                        itemsIndexed(current.data.liga, key = { _, row -> row.userId }) { index, row ->
                            LigaRowItem(row, index + 1, onClick = { selectedHandle = row.handle })
                        }
                    } else {
                        itemsIndexed(current.data.amigos, key = { _, row -> row.userId }) { index, row ->
                            AmigoRowItem(row, index + 1, onClick = { selectedHandle = row.handle })
                        }
                    }
                }
            }
        }
        
        selectedHandle?.let { handle ->
            FriendProfileBottomSheet(
                handle = handle,
                tokenStore = tokenStore,
                onDismiss = { selectedHandle = null },
                onCompareClick = onCompareClick
            )
        }
    }
}

@Composable
fun LigaRowItem(row: LigaRow, position: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(text = row.name, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(text = "${row.points} puntos este mes", color = Muted, fontSize = 12.sp)
        }
        Text(text = "${position}º", color = Platinum, fontWeight = FontWeight.Bold, fontSize = 20.sp)
    }
}

@Composable
fun AmigoRowItem(row: AmigoRow, position: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(text = row.name, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(text = "Nivel Paragon ${row.level} · ${row.platinos} platinos", color = Muted, fontSize = 12.sp)
            if (row.accounts.isNotEmpty()) {
                Text(
                    text = row.accounts.joinToString(" · ") { "${it.platform.uppercase()}: ${it.username}" },
                    color = Muted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
        Text(text = "${position}º", color = Platinum, fontWeight = FontWeight.Bold, fontSize = 20.sp)
    }
}
