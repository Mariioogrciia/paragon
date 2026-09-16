package com.paragon.app.ui.feed

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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

    val pullToRefreshState = rememberPullToRefreshState()

    LaunchedEffect(retryCounter.value) {
        if (result == null) isInitialLoading = true
        result = repository.getFeed()
        isInitialLoading = false
        pullToRefreshState.endRefresh()
    }

    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            retryCounter.value += 1
        }
    }

    Box(modifier = Modifier.fillMaxSize().nestedScroll(pullToRefreshState.nestedScrollConnection)) {
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
                            FeedCard(item, onUserClick = { selectedHandle = item.userHandle })
                        }
                    }
                }
            }
        }
        }
        
        
        PullToRefreshContainer(
            state = pullToRefreshState,
            modifier = Modifier.align(Alignment.TopCenter),
            containerColor = Surface,
            contentColor = Accent
        )

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
@Composable
fun FeedCard(item: FeedItem, onUserClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
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
            if (item.reactions > 0) {
                Text(
                    text = "${item.reactions} reacciones",
                    color = Muted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}
