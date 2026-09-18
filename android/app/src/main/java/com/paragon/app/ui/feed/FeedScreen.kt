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
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.RemoveRedEye
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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

import com.paragon.app.data.theme.ThemeStore

/** Actividad real contra GET /api/mobile/feed (FeedRepository). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(tokenStore: TokenStore, themeStore: ThemeStore, onCompareClick: (String) -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val cacheDao = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context).simpleCacheDao() }
    val repository = remember(tokenStore, cacheDao) { FeedRepository(tokenStore, cacheDao) }
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
            modifier = Modifier.padding(top = 16.dp, bottom = if ((result as? FeedResult.Ok)?.fromCache == true) 4.dp else 24.dp)
        )

        if ((result as? FeedResult.Ok)?.fromCache == true) {
            Text(
                text = "Sin conexión — mostrando la última copia guardada",
                color = Muted,
                fontSize = 11.sp,
                modifier = Modifier.padding(bottom = 24.dp),
            )
        }

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
                    com.paragon.app.ui.common.EmptyState(
                        icon = Icons.Default.Groups,
                        title = "Sin actividad todavía",
                        description = "La tuya y la de tus amigos aparecerá aquí — platinos, reseñas, juegos nuevos.",
                    )
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
                themeStore = themeStore,
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
    var viewCount by remember(item.id) { mutableIntStateOf(item.views) }
    var comments by remember(item.id) { mutableStateOf(item.comments) }
    var showCommentInput by remember(item.id) { mutableStateOf(false) }
    var commentText by remember(item.id) { mutableStateOf("") }
    var isSendingComment by remember(item.id) { mutableStateOf(false) }
    var showBurst by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    fun toggleReaction() {
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
    }

    LaunchedEffect(showBurst) {
        if (showBurst) {
            delay(650)
            showBurst = false
        }
    }

    // Se registra en cuanto la tarjeta entra en composición (LazyColumn solo
    // compone lo visible) — idempotente en el servidor (activity_view tiene
    // PK compuesta), así que recomponer al volver a hacer scroll no infla
    // el contador. `isNew` dice si esta llamada fue la que insertó la fila
    // (el GET /feed que ya se pintó no puede saber de esta vista todavía).
    LaunchedEffect(item.id) {
        if (repository.registerView(item.id) == true) {
            viewCount += 1
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .pointerInput(item.id) {
                detectTapGestures(
                    onDoubleTap = { toggleReaction() },
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
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                CountBadge(
                    icon = if (reacted) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    count = reactionCount,
                    tint = if (reacted) Danger else Muted,
                    onClick = { toggleReaction() },
                )
                CountBadge(
                    icon = Icons.Default.ChatBubbleOutline,
                    count = comments.size,
                    tint = Muted,
                    onClick = { showCommentInput = !showCommentInput },
                )
                CountBadge(
                    icon = Icons.Default.RemoveRedEye,
                    count = viewCount,
                    tint = Muted,
                )
            }
            if (showCommentInput) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    androidx.compose.material3.TextField(
                        value = commentText,
                        onValueChange = { commentText = it },
                        placeholder = { Text("Añadir un comentario...", color = Muted, fontSize = 13.sp) },
                        singleLine = true,
                        enabled = !isSendingComment,
                        colors = androidx.compose.material3.TextFieldDefaults.colors(
                            focusedContainerColor = androidx.compose.ui.graphics.Color.Transparent,
                            unfocusedContainerColor = androidx.compose.ui.graphics.Color.Transparent,
                            focusedIndicatorColor = Accent,
                            unfocusedIndicatorColor = Border,
                            focusedTextColor = Foreground,
                            unfocusedTextColor = Foreground,
                        ),
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp),
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(
                        enabled = !isSendingComment && commentText.isNotBlank(),
                        onClick = {
                            val body = commentText.trim()
                            isSendingComment = true
                            coroutineScope.launch {
                                val created = repository.addComment(item.id, body)
                                if (created != null) {
                                    comments = comments + created
                                    commentText = ""
                                }
                                isSendingComment = false
                            }
                        },
                    ) {
                        Text("Enviar", color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }
            }
            if (comments.isNotEmpty()) {
                Column(modifier = Modifier.padding(top = 10.dp)) {
                    HorizontalDivider(color = Border, modifier = Modifier.padding(bottom = 8.dp))
                    // Los 2 más recientes, estilo Instagram — el resto solo
                    // como contador, no hace falta desplegar 20 comentarios
                    // en medio del Feed.
                    comments.takeLast(2).forEach { comment ->
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
                    if (comments.size > 2) {
                        Text(
                            text = "Ver los ${comments.size} comentarios",
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

/**
 * Icono + número, estilo Instagram — usado para reacciones/comentarios/vistas
 * en FeedCard. `onClick` es opcional: las vistas no son una acción del
 * usuario, así que ese badge se queda sin tocar (sin `clickable` de más).
 */
@Composable
private fun CountBadge(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    count: Int,
    tint: androidx.compose.ui.graphics.Color,
    onClick: (() -> Unit)? = null,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier,
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = count.toString(), color = tint, fontSize = 12.sp)
    }
}
