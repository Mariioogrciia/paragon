package com.paragon.app.ui.feed

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.ui.input.pointer.pointerInput
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
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.FeedItem
import com.paragon.app.data.FeedRepository
import com.paragon.app.data.FeedResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.mensajeFeed
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Actividad real contra GET /api/mobile/feed (FeedRepository). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(tokenStore: TokenStore, onCompareClick: (String) -> Unit) {
    val repository = remember(tokenStore) { FeedRepository(tokenStore) }
    var result by remember { mutableStateOf<FeedResult?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }
    var isInitialLoading by remember { mutableStateOf(true) }
    var selectedHandle by remember { mutableStateOf<String?>(null) }
    val haptic = LocalHapticFeedback.current
    var isRefreshing by remember { mutableStateOf(false) }

    LaunchedEffect(retryCounter.value) {
        if (result == null) isInitialLoading = true
        result = repository.getFeed()
        isInitialLoading = false
        isRefreshing = false
    }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            isRefreshing = true
            retryCounter.value += 1
        },
        modifier = Modifier.fillMaxSize(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(horizontal = 24.dp)
        ) {
        Text(
            text = "COMUNIDAD",
            color = Foreground,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 16.dp, bottom = 24.dp)
        )

        when (val current = result) {
            null -> {
                if (isInitialLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Accent)
                    }
                }
            }
            is FeedResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
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
            is FeedResult.Ok -> {
                if (current.items.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Sin actividad todavía — la tuya o la de tus amigos aparecerá aquí.", color = Muted, fontSize = 14.sp)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 32.dp)
                    ) {
                        items(current.items, key = { it.id }) { item ->
                            FeedCard(item, repository = repository, onUserClick = { selectedHandle = item.userHandle })
                        }
                    }
                }
            }
        }
        }

        selectedHandle?.let { handle ->
            com.paragon.app.ui.social.FriendProfileBottomSheet(
                handle = handle,
                tokenStore = tokenStore,
                onDismiss = { selectedHandle = null },
                onCompareClick = onCompareClick
            )
        }
    }
}
/**
 * Doble toque para reaccionar (idea #13 del brainstorm de v1.0) — estado
 * optimista igual que `togglePin`/`toggleReserve` en la ficha de juego: se
 * pinta al momento (corazón + háptica fuerte) y la llamada de red va por
 * detrás sin bloquear nada; si falla, se deja como está (una reacción de
 * más o de menos en el Feed no merece un mensaje de error).
 */
@Composable
fun FeedCard(item: FeedItem, repository: FeedRepository, onUserClick: () -> Unit) {
    var reacted by remember(item.id) { mutableStateOf(item.reacted) }
    var reactionCount by remember(item.id) { mutableIntStateOf(item.reactions) }
    var showBurst by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(showBurst) {
        if (showBurst) {
            delay(650)
            showBurst = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .pointerInput(item.id) {
                detectTapGestures(
                    onDoubleTap = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        val nuevoEstado = !reacted
                        reacted = nuevoEstado
                        reactionCount += if (nuevoEstado) 1 else -1
                        showBurst = nuevoEstado
                        coroutineScope.launch {
                            val real = repository.toggleReaction(item.id)
                            if (real != null) {
                                reacted = real
                            }
                        }
                    },
                )
            }
            .padding(16.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = item.userName,
                    color = Accent,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { onUserClick() }
                )
                Text(text = item.timeAgo, color = Muted, fontSize = 12.sp)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = mensajeFeed(item), color = Foreground, fontSize = 14.sp)
            if (!item.review.isNullOrBlank()) {
                Text(
                    text = "\"${item.review}\"",
                    color = Muted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            if (reactionCount > 0) {
                val otros = reactionCount - if (reacted) 1 else 0
                Text(
                    text = when {
                        reacted && otros == 0 -> "Reaccionaste"
                        reacted -> "Tú y $otros más reaccionasteis"
                        else -> "$reactionCount reacciones"
                    },
                    color = if (reacted) Accent else Muted,
                    fontSize = 11.sp,
                    fontWeight = if (reacted) FontWeight.SemiBold else FontWeight.Normal,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            if (item.comments.isNotEmpty()) {
                Column(modifier = Modifier.padding(top = 10.dp)) {
                    HorizontalDivider(color = Border, modifier = Modifier.padding(bottom = 8.dp))
                    // Los 2 más recientes, estilo Instagram — el resto solo
                    // como contador, no hace falta desplegar 20 comentarios
                    // en medio del Feed. Todavía sin poder escribir uno
                    // desde la app (solo lectura, ver API-CONTRACT.md).
                    item.comments.takeLast(2).forEach { comment ->
                        Row(modifier = Modifier.padding(vertical = 2.dp)) {
                            Text(
                                text = comment.userName,
                                color = Foreground,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = "  ${comment.body}",
                                color = Muted,
                                fontSize = 12.sp,
                                maxLines = 2,
                            )
                        }
                    }
                    if (item.comments.size > 2) {
                        Text(
                            text = "Ver los ${item.comments.size} comentarios",
                            color = Muted,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = showBurst,
            modifier = Modifier.align(Alignment.Center),
            enter = scaleIn(animationSpec = tween(200)) + fadeIn(animationSpec = tween(150)),
            exit = scaleOut(animationSpec = tween(250)) + fadeOut(animationSpec = tween(250)),
        ) {
            Icon(
                imageVector = Icons.Default.Favorite,
                contentDescription = null,
                tint = Danger,
                modifier = Modifier.size(72.dp),
            )
        }
    }
}
