package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.palette.graphics.Palette
import coil3.BitmapImage
import coil3.compose.AsyncImage
import coil3.imageLoader
import coil3.request.ImageRequest
import coil3.request.SuccessResult
import coil3.request.allowHardware
import com.paragon.app.data.UserProfileRepository
import com.paragon.app.data.UserProfileResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.UserProfileDto
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileBottomSheet(
    handle: String,
    tokenStore: TokenStore,
    onDismiss: () -> Unit,
    onCompareClick: (String) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val repository = remember(tokenStore) { UserProfileRepository(tokenStore) }
    var result by remember { mutableStateOf<UserProfileResult?>(null) }
    var dominantColor by remember { mutableStateOf<Color?>(null) }
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(handle) {
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        result = null
        dominantColor = null
        result = repository.getProfile(handle)
        
        val currentResult = result
        if (currentResult is UserProfileResult.Ok && !currentResult.profile.image.isNullOrBlank()) {
            val request = ImageRequest.Builder(context)
                .data(currentResult.profile.image)
                .allowHardware(false)
                .build()
            val imageResult = context.imageLoader.execute(request)
            val image = (imageResult as? SuccessResult)?.image
            // `allowHardware(false)` de arriba fuerza a coil3 a devolver un
            // BitmapImage normal en vez de uno respaldado por hardware —
            // Palette necesita leer los píxeles uno a uno, cosa que un
            // bitmap "hardware" no permite.
            if (image is BitmapImage) {
                Palette.from(image.bitmap).generate { palette ->
                    palette?.dominantSwatch?.rgb?.let { colorInt ->
                        dominantColor = Color(colorInt)
                    }
                }
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Surface,
        dragHandle = null // Custom header
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
        ) {
            when (val current = result) {
                null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Accent)
                    }
                }
                is UserProfileResult.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(current.message, color = Foreground)
                    }
                }
                is UserProfileResult.Ok -> {
                    val profile = current.profile
                    ProfileContent(profile, dominantColor, onCompareClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onCompareClick(profile.handle)
                        onDismiss()
                    }, onDismiss = onDismiss)
                }
            }
        }
    }
}

@Composable
private fun ProfileContent(
    profile: UserProfileDto, 
    dominantColor: Color?,
    onCompareClick: () -> Unit,
    onDismiss: () -> Unit
) {
    val bgBrush = if (dominantColor != null) {
        Brush.verticalGradient(
            colors = listOf(dominantColor.copy(alpha = 0.3f), Surface, Surface),
            startY = 0f,
            endY = 600f
        )
    } else {
        Brush.verticalGradient(colors = listOf(Surface, Surface))
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bgBrush)
    ) {
        // Header con botón cerrar
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.End
        ) {
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.background(Background.copy(alpha = 0.5f), CircleShape)
            ) {
                Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Foreground)
            }
        }

        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .background(Background, CircleShape)
                    .border(2.dp, dominantColor ?: Border, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (!profile.image.isNullOrBlank()) {
                    AsyncImage(
                        model = profile.image,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(100.dp).clip(CircleShape)
                    )
                } else {
                    Text(profile.name.take(1).uppercase(), color = Accent, fontSize = 40.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            
            Text(profile.name, color = Foreground, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("@${profile.handle}", color = Muted, fontSize = 16.sp)

            Spacer(modifier = Modifier.height(24.dp))

            // Estadísticas
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem("Nivel", profile.level.toString())
                StatItem("Platinos", profile.platinos.toString())
                StatItem("Trofeos", profile.trofeos.toString())
            }

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = onCompareClick,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = dominantColor ?: Accent)
            ) {
                Text("⚔️ Comparar Trofeos", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = if (dominantColor != null) Color.White else Foreground)
            }

            Spacer(modifier = Modifier.height(32.dp))

            if (profile.recentGames.isNotEmpty()) {
                Text(
                    "Últimos juegos",
                    color = Foreground,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Start).padding(bottom = 12.dp)
                )
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(profile.recentGames) { game ->
                        Box(
                            modifier = Modifier
                                .width(120.dp)
                                .height(120.dp)
                                .background(Background, RoundedCornerShape(8.dp))
                                .clip(RoundedCornerShape(8.dp))
                        ) {
                            if (game.coverUrl.isNotBlank()) {
                                AsyncImage(
                                    model = game.coverUrl,
                                    contentDescription = game.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.5f))
                            )
                            Column(
                                modifier = Modifier.fillMaxSize().padding(8.dp),
                                verticalArrangement = Arrangement.Bottom
                            ) {
                                Text(game.title, color = Foreground, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 2)
                                Text("${game.percent}%", color = Platinum, fontSize = 10.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(label, color = Muted, fontSize = 12.sp)
    }
}
