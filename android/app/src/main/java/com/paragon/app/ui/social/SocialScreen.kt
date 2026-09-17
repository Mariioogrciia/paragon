package com.paragon.app.ui.social

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt
import com.paragon.app.data.AmigoRow
import com.paragon.app.data.League
import com.paragon.app.data.LeaguesRepository
import com.paragon.app.data.LeaguesResult
import com.paragon.app.data.LigaRow
import com.paragon.app.data.SocialRepository
import com.paragon.app.data.SocialResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

import com.paragon.app.data.theme.ThemeStore

/** Amigos y Liga reales contra GET /api/mobile/social (SocialRepository) — dos listas distintas, no la misma con otro orden. */
@Composable
fun SocialScreen(tokenStore: TokenStore, themeStore: ThemeStore, onCompareClick: (String) -> Unit) {
    val repository = remember(tokenStore) { SocialRepository(tokenStore) }
    val leaguesRepository = remember(tokenStore) { LeaguesRepository(tokenStore) }
    var result by remember { mutableStateOf<SocialResult?>(null) }
    var leaguesResult by remember { mutableStateOf<LeaguesResult?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val retryCounter = remember { mutableIntStateOf(0) }
    val leaguesRefresh = remember { mutableIntStateOf(0) }
    var selectedHandle by remember { mutableStateOf<String?>(null) }
    var selectedLeagueId by remember { mutableStateOf<String?>(null) }
    var showNewLeagueDialog by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    val tabs = listOf("Ligas", "Mis Ligas", "Amigos")

    LaunchedEffect(retryCounter.value) {
        result = null
        result = repository.getSocial()
    }

    LaunchedEffect(leaguesRefresh.value) {
        leaguesResult = leaguesRepository.getLeagues()
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

        if (selectedTab == 1) {
            when (val current = leaguesResult) {
                null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is LeaguesResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Foreground, fontSize = 14.sp)
                        Button(
                            onClick = { leaguesRefresh.value += 1 },
                            modifier = Modifier.padding(top = 16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text("Reintentar")
                        }
                    }
                }
                is LeaguesResult.Ok -> LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp),
                ) {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Surface, RoundedCornerShape(12.dp))
                                .border(1.dp, Border, RoundedCornerShape(12.dp))
                                .clickable { showNewLeagueDialog = true }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = Accent)
                            Text("Crear una liga con tus amigos", color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        }
                    }
                    if (current.leagues.isEmpty()) {
                        item {
                            Text(
                                text = "Solo con quien tú quieras — invita a amigos, no a toda la comunidad.",
                                color = Muted,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                    } else {
                        items(current.leagues, key = { it.id }) { league ->
                            LeagueRowItem(league, onClick = { selectedLeagueId = league.id })
                        }
                    }
                }
            }
        } else {
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
                                SwipeToCompareRow(handle = row.handle, onCompareClick = onCompareClick) {
                                    LigaRowItem(row, index + 1, onClick = { selectedHandle = row.handle })
                                }
                            }
                        } else {
                            itemsIndexed(current.data.amigos, key = { _, row -> row.userId }) { index, row ->
                                SwipeToCompareRow(handle = row.handle, onCompareClick = onCompareClick) {
                                    AmigoRowItem(row, index + 1, onClick = { selectedHandle = row.handle })
                                }
                            }
                        }
                    }
                }
            }
        }
        
        selectedHandle?.let { handle ->
            FriendProfileBottomSheet(
                handle = handle,
                tokenStore = tokenStore,
                themeStore = themeStore,
                onDismiss = { selectedHandle = null },
                onCompareClick = onCompareClick
            )
        }

        selectedLeagueId?.let { leagueId ->
            LeagueDetailSheet(
                leagueId = leagueId,
                tokenStore = tokenStore,
                amigos = (result as? SocialResult.Ok)?.data?.amigos ?: emptyList(),
                onDismiss = { selectedLeagueId = null },
                onChanged = { leaguesRefresh.value += 1 },
            )
        }

        if (showNewLeagueDialog) {
            NewLeagueDialog(
                onDismiss = { showNewLeagueDialog = false },
                onCreate = { name ->
                    coroutineScope.launch {
                        val created = leaguesRepository.createLeague(name)
                        showNewLeagueDialog = false
                        if (created != null) {
                            leaguesRefresh.value += 1
                            selectedLeagueId = created.id
                        }
                    }
                },
            )
        }
    }
}

@Composable
private fun NewLeagueDialog(onDismiss: () -> Unit, onCreate: (String) -> Unit) {
    var name by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text("Nueva liga", color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { if (it.length <= 60) name = it },
                placeholder = { Text("Los de siempre") },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground,
                ),
            )
        },
        confirmButton = {
            TextButton(onClick = { onCreate(name) }, enabled = name.isNotBlank()) {
                Text("Crear", color = Accent, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar", color = Muted) }
        },
    )
}

@Composable
fun LeagueRowItem(league: League, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = league.name, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(text = "${league.memberCount} ${if (league.memberCount == 1) "miembro" else "miembros"}", color = Muted, fontSize = 12.sp)
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

/**
 * Deslizar una fila (de Ligas o Amigos) hacia la izquierda salta directo a
 * Comparar contra esa persona, sin pasar por su perfil — pensado para
 * cuando ya sabes con quién te quieres picar, no para descubrir su ficha.
 * El toque normal (`onClick` dentro del contenido) sigue abriendo el
 * perfil tal cual, esto es un atajo aparte, no lo sustituye.
 */
@Composable
private fun SwipeToCompareRow(
    handle: String?,
    onCompareClick: (String) -> Unit,
    content: @Composable () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val offsetX = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current
    val thresholdPx = with(density) { 72.dp.toPx() }
    var crossedThreshold by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxSize().padding(end = 24.dp),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.AutoMirrored.Filled.CompareArrows, contentDescription = null, tint = Accent)
        }
        Box(
            modifier = Modifier
                .offset { IntOffset(offsetX.value.roundToInt(), 0) }
                .pointerInput(handle) {
                    if (handle == null) return@pointerInput
                    detectHorizontalDragGestures(
                        onDragStart = { crossedThreshold = false },
                        onDragEnd = {
                            scope.launch {
                                if (offsetX.value <= -thresholdPx) onCompareClick(handle)
                                offsetX.animateTo(0f, animationSpec = tween(200))
                            }
                        },
                        onDragCancel = {
                            scope.launch { offsetX.animateTo(0f, animationSpec = tween(200)) }
                        },
                        onHorizontalDrag = { change, dragAmount ->
                            change.consume()
                            val next = (offsetX.value + dragAmount).coerceIn(-thresholdPx * 1.4f, 0f)
                            scope.launch { offsetX.snapTo(next) }
                            val nowCrossed = next <= -thresholdPx
                            if (nowCrossed && !crossedThreshold) {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            }
                            crossedThreshold = nowCrossed
                        },
                    )
                },
        ) {
            content()
        }
    }
}
