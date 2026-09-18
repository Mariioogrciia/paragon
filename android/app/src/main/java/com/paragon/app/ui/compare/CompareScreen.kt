package com.paragon.app.ui.compare

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import com.paragon.app.data.AmigoRow
import com.paragon.app.data.CompareData
import com.paragon.app.data.CompareRepository
import com.paragon.app.data.CompareResult
import com.paragon.app.data.CompareResultado
import com.paragon.app.data.CompareSide
import com.paragon.app.data.SharedGame
import com.paragon.app.data.SocialRepository
import com.paragon.app.data.SocialResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Comparar con cualquier perfil público (no hace falta que sea amigo) contra
 * GET /api/mobile/compare/{handle}. Debajo del buscador, la lista de amigos
 * reales (mismo GET /api/mobile/social que SocialScreen) para elegir uno de
 * un toque sin tener que escribir su @handle a mano.
 */
@Composable
fun CompareScreen(tokenStore: TokenStore, initialHandle: String? = null, onBack: () -> Unit = {}) {
    val repository = remember(tokenStore) { CompareRepository(tokenStore) }
    val socialRepository = remember(tokenStore) { SocialRepository(tokenStore) }
    val coroutineScope = rememberCoroutineScope()
    var handle by remember(initialHandle) { mutableStateOf(initialHandle ?: "") }
    var result by remember { mutableStateOf<CompareResult?>(null) }
    var loading by remember { mutableStateOf(false) }
    var amigos by remember { mutableStateOf<List<AmigoRow>>(emptyList()) }

    // Declarada ANTES del LaunchedEffect que la usa — una función local de
    // Kotlin no se puede llamar antes de su propia declaración textual en
    // el mismo bloque, a diferencia de una función de nivel superior.
    fun buscar(query: String) {
        val limpio = query.trim().removePrefix("@")
        if (limpio.isBlank()) return
        loading = true
        result = null
        coroutineScope.launch {
            result = repository.compare(limpio)
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        val social = socialRepository.getSocial()
        amigos = (social as? SocialResult.Ok)?.data?.amigos.orEmpty()

        if (!initialHandle.isNullOrBlank()) {
            buscar(initialHandle)
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(Background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Foreground)
            }
            Text(text = "COMPARAR", color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = handle,
                onValueChange = { handle = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("@handle de alguien", color = Muted) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Surface,
                    unfocusedContainerColor = Surface,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground,
                    cursorColor = Accent,
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                ),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Search),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onSearch = { buscar(handle) }),
            )
            Spacer(Modifier.width(12.dp))
            Button(onClick = { buscar(handle) }, colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
                Text("Comparar")
            }
        }

        when {
            loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
            result is CompareResult.Error -> Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                Text(text = (result as CompareResult.Error).message, color = Muted, fontSize = 14.sp)
            }
            result is CompareResult.Ok -> CompareContent((result as CompareResult.Ok).data)
            else -> FriendsPicker(amigos = amigos, onPick = { buscar(it) })
        }
    }
}

/** Lista de amigos reales (GET /api/mobile/social) para comparar de un toque, sin escribir el @handle a mano. */
@Composable
private fun FriendsPicker(amigos: List<AmigoRow>, onPick: (String) -> Unit) {
    val conHandle = amigos.filter { !it.handle.isNullOrBlank() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(top = 4.dp, bottom = 32.dp),
    ) {
        item {
            Text(
                text = "TUS AMIGOS",
                color = Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(bottom = 4.dp),
            )
        }
        if (conHandle.isEmpty()) {
            item {
                Text(
                    text = "Todavía no tienes amigos con perfil público para comparar de un toque — busca cualquier @handle arriba.",
                    color = Muted,
                    fontSize = 13.sp,
                )
            }
        } else {
            items(conHandle, key = { it.userId }) { amigo ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Surface, RoundedCornerShape(14.dp))
                        .clickable { onPick(amigo.handle!!) }
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = amigo.name, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text(text = "@${amigo.handle} · Nivel ${amigo.level}", color = Muted, fontSize = 12.sp)
                    }
                    Text(text = "${amigo.platinos} platinos", color = Platinum, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun CompareContent(data: CompareData) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 32.dp),
    ) {
        item { CompareSummary(data.me, data.them, data.resultado) }
        item {
            Text(
                text = "JUEGOS EN COMÚN (${data.sharedGames.size})",
                color = Foreground,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
            )
        }
        if (data.sharedGames.isEmpty()) {
            item { Text(text = "Ningún juego en común todavía.", color = Muted, fontSize = 13.sp) }
        } else {
            items(data.sharedGames) { SharedGameRow(it) }
        }
    }
}

/**
 * Antes esto era solo texto (nombre/nivel/platinos), sin foto ni ninguna
 * lectura de "quién va ganando" — la web ya tenía las dos cosas
 * (`comparar/[handle]/page.tsx`: `Avatar` + etiqueta "Vas ganando"), esto
 * las trae aquí con el mismo criterio (por platinos).
 */
@Composable
private fun CompareSummary(me: CompareSide, them: CompareSide, resultado: CompareResultado) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .padding(20.dp),
    ) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            CompareColumn(label = "TÚ", side = me, destacado = resultado == CompareResultado.GANO)
            Box(modifier = Modifier.width(1.dp).fillMaxHeight().background(Border))
            CompareColumn(label = "ELLOS", side = them, destacado = resultado == CompareResultado.PIERDO)
        }
        Spacer(Modifier.height(16.dp))
        val (texto, color) = when (resultado) {
            CompareResultado.GANO -> "Vas ganando" to Good
            CompareResultado.PIERDO -> "Vas perdiendo" to Danger
            CompareResultado.EMPATE -> "Empate a platinos" to Muted
        }
        Text(
            text = texto,
            color = color,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .background(color.copy(alpha = 0.14f), RoundedCornerShape(20.dp))
                .padding(horizontal = 14.dp, vertical = 6.dp),
        )
    }
}

@Composable
private fun RowScope.CompareColumn(label: String, side: CompareSide, destacado: Boolean) {
    Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Surface2)
                .then(if (destacado) Modifier.border(2.dp, Accent, CircleShape) else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            if (side.avatarUrl != null) {
                AsyncImage(
                    model = side.avatarUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().clip(CircleShape),
                )
            } else {
                Text(side.name.take(1).uppercase(), color = Muted, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(text = label, color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Text(text = side.name, color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
        Text(text = "Nivel ${side.level}", color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(10.dp))
        Text(text = side.platinos.toString(), color = Platinum, fontSize = 26.sp, fontWeight = FontWeight.Bold)
        Text(text = "platinos", color = Muted, fontSize = 11.sp)
        Spacer(Modifier.height(6.dp))
        Text(text = "${side.trofeos} trofeos · ${side.juegos} juegos", color = Muted, fontSize = 11.sp)
    }
}

@Composable
private fun SharedGameRow(game: SharedGame) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(14.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = game.iconUrl,
            contentDescription = null,
            modifier = Modifier.size(44.dp).background(Surface2, RoundedCornerShape(10.dp)),
        )
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = game.title, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            Row(modifier = Modifier.padding(top = 4.dp)) {
                Text(
                    text = "Tú ${game.myPercent}%${if (game.myPercent >= 100) " ✓" else ""}",
                    color = if (game.myPercent >= 100) Good else Accent2,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "  ·  Ellos ${game.theirPercent}%${if (game.theirPercent >= 100) " ✓" else ""}",
                    color = if (game.theirPercent >= 100) Good else Muted,
                    fontSize = 12.sp,
                )
            }
        }
    }
}
