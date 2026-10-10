package com.paragon.app.ui.feed

import com.paragon.shared.i18n.stringResource

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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.FeedItem
import com.paragon.app.data.FeedRepository
import com.paragon.app.data.FeedResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.mensajeFeed
import com.paragon.app.data.REACCIONES
import com.paragon.app.data.emojiDeReaccion
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

import com.paragon.app.data.theme.ThemeStore
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription

/** Actividad real contra GET /api/mobile/feed (FeedRepository). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(tokenStore: TokenStore, themeStore: ThemeStore, onCompareClick: (String) -> Unit, onAbrirPerfil: (String) -> Unit, conTitulo: Boolean = true) {
    val context = com.paragon.shared.contextoPlataforma()
    val cacheDao = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context).simpleCacheDao() }
    val repository = remember(tokenStore, cacheDao) { FeedRepository(tokenStore, cacheDao) }
    var result by remember { mutableStateOf<FeedResult?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }
    var isInitialLoading by remember { mutableStateOf(true) }
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
        // Dentro de Comunidad (ComunidadScreen) el título ya va arriba, con el selector.
        if (conTitulo) Text(
            text = Textos.t(T.feed_titulo),
            color = Foreground,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 16.dp, bottom = if ((result as? FeedResult.Ok)?.fromCache == true) 4.dp else 24.dp)
        ) else Spacer(Modifier.height(16.dp))

        if ((result as? FeedResult.Ok)?.fromCache == true) {
            Text(
                text = Textos.t(T.comun_sin_conexion_copia),
                color = Muted,
                fontSize = 11.sp,
                modifier = Modifier.padding(bottom = 24.dp),
            )
        }

        when (val current = result) {
            null -> {
                if (isInitialLoading) {
                    com.paragon.app.ui.common.EsqueletoLista(filas = 5)
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
                        Text(Textos.t(T.comun_reintentar))
                    }
                }
            }
            is FeedResult.Ok -> {
                if (current.items.isEmpty()) {
                    com.paragon.app.ui.common.EmptyState(
                        icon = Icons.Default.Groups,
                        title = Textos.t(T.feed_vacio),
                        description = Textos.t(T.feed_vacio_sub),
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 32.dp + com.paragon.app.ui.common.huecoBarra())
                    ) {
                        items(current.items, key = { it.id }) { item ->
                            FeedCard(item, repository = repository, onUserClick = { onAbrirPerfil(item.userHandle) })
                        }
                    }
                }
            }
        }
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
    var miReaccion by remember(item.id) { mutableStateOf(item.miReaccion) }
    var reactionCount by remember(item.id) { mutableIntStateOf(item.reactions) }
    var viewCount by remember(item.id) { mutableIntStateOf(item.views) }
    var comments by remember(item.id) { mutableStateOf(item.comments) }
    var showCommentInput by remember(item.id) { mutableStateOf(false) }
    var showReactionPicker by remember(item.id) { mutableStateOf(false) }
    var commentText by remember(item.id) { mutableStateOf("") }
    var isSendingComment by remember(item.id) { mutableStateOf(false) }
    var showBurst by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    /** La misma reacción otra vez la quita; otra distinta la cambia — mismo criterio que `toggleActivityReaction` (lib/feed.ts). */
    fun toggleReaction(reaction: String = "aplauso") {
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        showReactionPicker = false
        val quitando = reacted && miReaccion == reaction
        if (quitando) {
            reacted = false
            miReaccion = null
            reactionCount -= 1
        } else {
            if (!reacted) reactionCount += 1
            reacted = true
            miReaccion = reaction
        }
        showBurst = !quitando
        coroutineScope.launch {
            val real = repository.toggleReaction(item.id, reaction)
            if (real == false) {
                reacted = false
                miReaccion = null
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
            .background(Surface, RoundedCornerShape(radio(16)))
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onUserClick() },
                ) {
                    com.paragon.app.ui.common.AvatarPersona(item.userImage, item.userName, size = 28.dp)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = item.userName,
                        color = Accent,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Text(text = item.timeAgo, color = Muted, fontSize = 12.sp)
            }
            Spacer(modifier = Modifier.height(8.dp))
            if (item.type == "status") {
                // Estado libre: el texto (item.review) ES la publicación, no una cita sobre un juego.
                Text(text = item.review ?: "", color = Foreground, fontSize = 14.sp)
            } else {
                Text(text = mensajeFeed(item), color = Foreground, fontSize = 14.sp)
                if (!item.review.isNullOrBlank()) {
                    Text(
                        text = "\"${item.review}\"",
                        color = Muted,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                ReactionBadge(
                    reacted = reacted,
                    miReaccion = miReaccion,
                    count = reactionCount,
                    // Ya reaccionado: un toque la quita directo. Sin reaccionar: abre el selector de emoji.
                    onClick = { if (reacted) toggleReaction(miReaccion ?: "aplauso") else showReactionPicker = !showReactionPicker },
                )
                CountBadge(
                    icon = Icons.Default.ChatBubbleOutline,
                    descripcion = Textos.t(T.feed_a11y_comentarios, comments.size),
                    count = comments.size,
                    tint = Muted,
                    onClick = { showCommentInput = !showCommentInput },
                )
                CountBadge(
                    icon = Icons.Default.RemoveRedEye,
                    descripcion = Textos.t(T.feed_a11y_vistas, viewCount),
                    count = viewCount,
                    tint = Muted,
                )
            }
            if (showReactionPicker) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(18.dp),
                ) {
                    REACCIONES.forEach { r ->
                        Text(
                            text = r.emoji,
                            fontSize = 22.sp,
                            modifier = Modifier.clickable { toggleReaction(r.clave) },
                        )
                    }
                }
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
                        placeholder = { Text(Textos.t(T.feed_comentar_ph), color = Muted, fontSize = 13.sp) },
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
                        Text(Textos.t(T.comun_enviar), color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
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
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
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
                            text = Textos.t(T.feed_ver_comentarios, comments.size),
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
            Text(text = emojiDeReaccion(miReaccion), fontSize = 56.sp)
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
    descripcion: String,
    count: Int,
    tint: androidx.compose.ui.graphics.Color,
    onClick: (() -> Unit)? = null,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        // TalkBack lee "3 comentarios" en vez de un icono sin nombre y un número suelto.
        modifier = (if (onClick != null) Modifier.clickable(onClick = onClick, role = Role.Button) else Modifier)
            .clearAndSetSemantics { contentDescription = descripcion },
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = count.toString(), color = tint, fontSize = 12.sp)
    }
}

/**
 * Badge de reacciones (👏🔥🏆😂😮): un corazón vacío sin reaccionar, o el
 * emoji elegido una vez reaccionado — distinto de `CountBadge` porque su
 * icono no es un `ImageVector`, es texto.
 */
@Composable
private fun ReactionBadge(
    reacted: Boolean,
    miReaccion: String?,
    count: Int,
    onClick: () -> Unit,
) {
    val descripcion = stringResource(if (reacted) T.feed_a11y_reaccionado else T.feed_a11y_reaccionar, count)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable(onClick = onClick, role = Role.Button)
            .clearAndSetSemantics { contentDescription = descripcion },
    ) {
        if (reacted) {
            Text(text = emojiDeReaccion(miReaccion), fontSize = 15.sp)
        } else {
            Icon(imageVector = Icons.Default.FavoriteBorder, contentDescription = null, tint = Muted, modifier = Modifier.size(16.dp))
        }
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = count.toString(), color = if (reacted) Foreground else Muted, fontSize = 12.sp)
    }
}
